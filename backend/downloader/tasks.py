"""
Background download logic using yt-dlp.
Runs in a thread so the API can respond immediately.
"""

import os
import threading

from django.conf import settings
from django.utils import timezone


def _run_download(task_id: str):
    """Download audio for a single task (runs in background thread)."""
    from .models import DownloadTask

    task = DownloadTask.objects.get(id=task_id)
    task.status = DownloadTask.Status.DOWNLOADING
    task.save(update_fields=["status"])

    output_dir = settings.MEDIA_ROOT
    os.makedirs(output_dir, exist_ok=True)

    def progress_hook(d):
        if d.get("status") == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            downloaded = d.get("downloaded_bytes", 0)
            if total > 0:
                pct = int(downloaded / total * 80)  # 0-80% for download
                task.progress = min(pct, 80)
                task.save(update_fields=["progress"])
        elif d.get("status") == "finished":
            task.progress = 85
            task.status = DownloadTask.Status.PROCESSING
            task.save(update_fields=["progress", "status"])

    # Path to our bundled ffmpeg/ffprobe binaries
    ffmpeg_dir = os.path.join(settings.BASE_DIR, "bin")

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": os.path.join(output_dir, "%(id)s.%(ext)s"),
        "ffmpeg_location": ffmpeg_dir,
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }
        ],
        "quiet": True,
        "no_warnings": True,
        "progress_hooks": [progress_hook],
    }

    try:
        import yt_dlp

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(task.url, download=True)

            if info is None:
                raise Exception("Could not extract video info. Is the URL valid?")

            task.title = (info.get("title") or "")[:300]
            task.uploader = (info.get("uploader") or info.get("channel") or "")[:200]

            # The final filename after post-processing (.mp3)
            video_id = info.get("id", str(task.id))
            mp3_path = os.path.join(output_dir, f"{video_id}.mp3")

            if os.path.exists(mp3_path):
                task.filename = f"{video_id}.mp3"
            else:
                # Fallback: look for any file matching the id
                for f in os.listdir(output_dir):
                    if video_id in f:
                        task.filename = f
                        break

            task.status = DownloadTask.Status.COMPLETED
            task.progress = 100
            task.completed_at = timezone.now()
            task.save()

    except Exception as e:
        task.status = DownloadTask.Status.FAILED
        task.error_message = str(e)[:1000]
        task.save(update_fields=["status", "error_message"])


def start_download(task_id: str):
    """Kick off a download in a background thread."""
    thread = threading.Thread(target=_run_download, args=(task_id,), daemon=True)
    thread.start()
