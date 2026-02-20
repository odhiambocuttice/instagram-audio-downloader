import os
import uuid
import subprocess
import tempfile

from django.conf import settings
from django.http import FileResponse, Http404
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import DownloadTask
from .serializers import DownloadRequestSerializer, DownloadTaskSerializer
from .tasks import start_download


# Use local bin/ffmpeg for dev, system ffmpeg for production
_local_ffmpeg = os.path.join(settings.BASE_DIR, "bin", "ffmpeg")
FFMPEG_BIN = _local_ffmpeg if os.path.isfile(_local_ffmpeg) else "ffmpeg"


@api_view(["POST"])
def submit_download(request):
    """
    POST /api/download/
    Body: { "urls": ["https://instagram.com/reel/..."] }
    Returns a list of created DownloadTask objects.
    """
    try:
        serializer = DownloadRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        tasks = []
        for url in serializer.validated_data["urls"]:
            task = DownloadTask.objects.create(url=url)
            start_download(str(task.id))
            tasks.append(task)

        return Response(
            DownloadTaskSerializer(tasks, many=True).data,
            status=status.HTTP_201_CREATED,
        )
    except Exception as e:
        import traceback
        # Return the exact error so we can debug Railway 500s easily
        return Response(
            {
                "detail": "Internal Server Error",
                "error": str(e),
                "trace": traceback.format_exc()
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
def task_status(request, task_id):
    """
    GET /api/download/<task_id>/
    Returns the current status of a download task.
    """
    try:
        task = DownloadTask.objects.get(id=task_id)
    except DownloadTask.DoesNotExist:
        return Response(
            {"detail": "Task not found."}, status=status.HTTP_404_NOT_FOUND
        )

    return Response(DownloadTaskSerializer(task).data)


@api_view(["GET"])
def download_file(request, task_id):
    """
    GET /api/download/<task_id>/file/
    Stream or download the MP3 file.
    Pass ?stream=1 for in-browser playback (inline).
    """
    try:
        task = DownloadTask.objects.get(id=task_id)
    except DownloadTask.DoesNotExist:
        raise Http404

    if task.status != DownloadTask.Status.COMPLETED or not task.filename:
        return Response(
            {"detail": "File not ready yet."}, status=status.HTTP_400_BAD_REQUEST
        )

    filepath = os.path.join(settings.MEDIA_ROOT, task.filename)
    if not os.path.exists(filepath):
        raise Http404

    display_name = f"{task.uploader} - {task.title}.mp3" if task.title else task.filename
    display_name = display_name.replace("/", "_").replace("\\", "_")

    response = FileResponse(open(filepath, "rb"), content_type="audio/mpeg")
    response["Accept-Ranges"] = "bytes"
    response["Content-Length"] = os.path.getsize(filepath)

    if request.GET.get("stream") == "1":
        response["Content-Disposition"] = f'inline; filename="{display_name}"'
    else:
        response["Content-Disposition"] = f'attachment; filename="{display_name}"'

    return response


@api_view(["GET"])
def list_tasks(request):
    """
    GET /api/downloads/
    List recent download tasks.
    """
    tasks = DownloadTask.objects.all()[:50]
    return Response(DownloadTaskSerializer(tasks, many=True).data)


# ═══════════════════════════════════════════════════════════
#  Audio Editor — Cut & Merge with FFmpeg
# ═══════════════════════════════════════════════════════════


@api_view(["POST"])
def edit_audio(request):
    """
    POST /api/edit/
    Body: {
        "segments": [
            { "task_id": "uuid", "start": 0.0, "end": 5.5 },
            { "task_id": "uuid", "start": 10.0, "end": 18.3 },
            ...
        ],
        "name": "my_mix"   // optional output name
    }

    Cuts each segment from its source MP3 and concatenates them into
    one final MP3. Returns the edited file info.
    """
    segments = request.data.get("segments", [])
    output_name = request.data.get("name", "edited_mix")

    if not segments or not isinstance(segments, list):
        return Response(
            {"detail": "Provide at least one segment."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate
    for i, seg in enumerate(segments):
        if not seg.get("task_id") or seg.get("start") is None or seg.get("end") is None:
            return Response(
                {"detail": f"Segment {i}: must include task_id, start, end."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if float(seg["end"]) <= float(seg["start"]):
            return Response(
                {"detail": f"Segment {i}: end must be greater than start."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    edits_dir = os.path.join(settings.MEDIA_ROOT, "edits")
    os.makedirs(edits_dir, exist_ok=True)

    clip_paths = []
    try:
        # ── Step 1: Cut each segment ───────────────────────────
        for i, seg in enumerate(segments):
            task = DownloadTask.objects.get(id=seg["task_id"])
            src = os.path.join(settings.MEDIA_ROOT, task.filename)
            if not os.path.exists(src):
                return Response(
                    {"detail": f"Source file for segment {i} not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            start_t = float(seg["start"])
            end_t = float(seg["end"])
            dur = end_t - start_t

            clip_path = os.path.join(edits_dir, f"clip_{uuid.uuid4().hex[:8]}.mp3")
            clip_paths.append(clip_path)

            cmd = [
                FFMPEG_BIN, "-y",
                "-i", src,
                "-ss", str(start_t),
                "-t", str(dur),
                "-acodec", "libmp3lame",
                "-ab", "192k",
                "-ar", "44100",
                "-ac", "2",
                clip_path,
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            if result.returncode != 0:
                return Response(
                    {"detail": f"FFmpeg cut failed for segment {i}: {result.stderr[-300:]}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        # ── Step 2: Concatenate ────────────────────────────────
        output_id = uuid.uuid4().hex[:12]
        output_filename = f"edit_{output_id}.mp3"
        output_path = os.path.join(edits_dir, output_filename)

        if len(clip_paths) == 1:
            os.rename(clip_paths[0], output_path)
        else:
            concat_file = tempfile.NamedTemporaryFile(
                mode="w", suffix=".txt", delete=False, dir=edits_dir
            )
            try:
                for cp in clip_paths:
                    concat_file.write(f"file '{cp}'\n")
                concat_file.close()

                cmd = [
                    FFMPEG_BIN, "-y",
                    "-f", "concat",
                    "-safe", "0",
                    "-i", concat_file.name,
                    "-acodec", "libmp3lame",
                    "-ab", "192k",
                    "-ar", "44100",
                    "-ac", "2",
                    output_path,
                ]
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
                if result.returncode != 0:
                    return Response(
                        {"detail": f"FFmpeg concat failed: {result.stderr[-300:]}"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )
            finally:
                os.unlink(concat_file.name)

            for cp in clip_paths:
                if os.path.exists(cp):
                    os.unlink(cp)

        file_size = os.path.getsize(output_path)

        return Response({
            "id": output_id,
            "filename": output_filename,
            "name": output_name,
            "segments_count": len(segments),
            "file_size": file_size,
            "download_url": f"/api/edit/{output_id}/file/",
            "stream_url": f"/api/edit/{output_id}/file/?stream=1",
        }, status=status.HTTP_201_CREATED)

    except DownloadTask.DoesNotExist:
        return Response(
            {"detail": "One or more task_ids not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    except subprocess.TimeoutExpired:
        return Response(
            {"detail": "FFmpeg processing timed out."},
            status=status.HTTP_504_GATEWAY_TIMEOUT,
        )
    except Exception as e:
        return Response(
            {"detail": str(e)[:500]},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
def serve_edit(request, edit_id):
    """
    GET /api/edit/<edit_id>/file/
    Stream or download the edited/merged MP3.
    """
    edits_dir = os.path.join(settings.MEDIA_ROOT, "edits")
    filepath = os.path.join(edits_dir, f"edit_{edit_id}.mp3")

    if not os.path.exists(filepath):
        raise Http404

    display_name = f"edit_{edit_id}.mp3"
    response = FileResponse(open(filepath, "rb"), content_type="audio/mpeg")
    response["Accept-Ranges"] = "bytes"
    response["Content-Length"] = os.path.getsize(filepath)

    if request.GET.get("stream") == "1":
        response["Content-Disposition"] = f'inline; filename="{display_name}"'
    else:
        response["Content-Disposition"] = f'attachment; filename="{display_name}"'

    return response
