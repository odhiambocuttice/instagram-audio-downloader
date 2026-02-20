"use client";

import {
    useRef,
    useEffect,
    useState,
    useCallback,
    type MouseEvent as ReactMouseEvent,
} from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, { type Region } from "wavesurfer.js/dist/plugins/regions.js";
import {
    getStreamUrl,
    getDownloadUrl,
    getEditStreamUrl,
    getEditDownloadUrl,
    submitEdit,
    type DownloadTask,
    type EditSegment,
} from "@/lib/api";

/* ═══════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════ */

interface ClipRegion {
    id: string;
    start: number;
    end: number;
    color: string;
}

interface Props {
    task: DownloadTask;
    onClose: () => void;
}

/* ═══════════════════════════════════════════════════════════
   Color Palette for Regions
   ═══════════════════════════════════════════════════════════ */

const REGION_COLORS = [
    "rgba(29, 185,  84, 0.25)",
    "rgba(30, 215, 96, 0.25)",
    "rgba(255, 176, 58, 0.25)",
    "rgba(80, 155, 245, 0.25)",
    "rgba(232, 93, 117, 0.25)",
    "rgba(180, 130, 255, 0.25)",
];

/* ═══════════════════════════════════════════════════════════
   Icons
   ═══════════════════════════════════════════════════════════ */

function PlayIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
        </svg>
    );
}

function PauseIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
        </svg>
    );
}

function CloseIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

function ScissorsIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <line x1="20" y1="4" x2="8.12" y2="15.88" />
            <line x1="14.47" y1="14.48" x2="20" y2="20" />
            <line x1="8.12" y1="8.12" x2="12" y2="12" />
        </svg>
    );
}

function TrashIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
    );
}

function DownloadIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
    );
}

function ZoomInIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
    );
}

function ZoomOutIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
    );
}

/* ═══════════════════════════════════════════════════════════
   Format time helper
   ═══════════════════════════════════════════════════════════ */

function fmt(sec: number): string {
    if (!isFinite(sec) || sec < 0) return "0:00.0";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${m}:${s.toString().padStart(2, "0")}.${ms}`;
}

/* ═══════════════════════════════════════════════════════════
   Editor Component
   ═══════════════════════════════════════════════════════════ */

export default function AudioEditor({ task, onClose }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WaveSurfer | null>(null);
    const regionsRef = useRef<RegionsPlugin | null>(null);

    const [ready, setReady] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [zoom, setZoom] = useState(50);
    const [clips, setClips] = useState<ClipRegion[]>([]);
    const [exporting, setExporting] = useState(false);
    const [exportResult, setExportResult] = useState<{ id: string; name: string } | null>(null);
    const [exportError, setExportError] = useState("");

    const clipCounter = useRef(0);

    /* ── Initialize WaveSurfer ─────────────────────────── */
    useEffect(() => {
        if (!containerRef.current) return;

        const regions = RegionsPlugin.create();
        regionsRef.current = regions;

        const ws = WaveSurfer.create({
            container: containerRef.current,
            waveColor: "#535353",
            progressColor: "#1DB954",
            cursorColor: "#ffffff",
            cursorWidth: 2,
            barWidth: 2,
            barGap: 1,
            barRadius: 2,
            height: 128,
            normalize: true,
            url: getStreamUrl(task.id),
            plugins: [regions],
        });

        wsRef.current = ws;

        ws.on("ready", () => {
            setReady(true);
            setDuration(ws.getDuration());
        });

        ws.on("timeupdate", (t: number) => setCurrentTime(t));
        ws.on("play", () => setPlaying(true));
        ws.on("pause", () => setPlaying(false));
        ws.on("finish", () => setPlaying(false));

        // When a region is updated (dragged), sync state
        regions.on("region-updated", (region: Region) => {
            setClips((prev) =>
                prev.map((c) =>
                    c.id === region.id
                        ? { ...c, start: region.start, end: region.end }
                        : c
                )
            );
        });

        return () => {
            ws.destroy();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [task.id]);

    /* ── Zoom ────────────────────────────────────────── */
    useEffect(() => {
        if (wsRef.current && ready) {
            wsRef.current.zoom(zoom);
        }
    }, [zoom, ready]);

    /* ── Add Region / Clip ───────────────────────────── */
    const addClip = useCallback(() => {
        if (!regionsRef.current || !wsRef.current) return;
        const dur = wsRef.current.getDuration();
        const ct = wsRef.current.getCurrentTime();
        const colorIdx = clipCounter.current % REGION_COLORS.length;
        const color = REGION_COLORS[colorIdx];
        clipCounter.current++;

        const regionStart = ct;
        const regionEnd = Math.min(ct + Math.max(dur * 0.1, 2), dur);

        const region = regionsRef.current.addRegion({
            start: regionStart,
            end: regionEnd,
            color,
            drag: true,
            resize: true,
        });

        setClips((prev) => [
            ...prev,
            { id: region.id, start: region.start, end: region.end, color },
        ]);
    }, []);

    /* ── Remove Region ───────────────────────────────── */
    const removeClip = useCallback((clipId: string) => {
        if (!regionsRef.current) return;
        const allRegions = regionsRef.current.getRegions();
        const region = allRegions.find((r: Region) => r.id === clipId);
        if (region) region.remove();
        setClips((prev) => prev.filter((c) => c.id !== clipId));
    }, []);

    /* ── Play region ────────────────────────────────── */
    const playClip = useCallback((clip: ClipRegion) => {
        if (!wsRef.current) return;
        wsRef.current.setTime(clip.start);
        wsRef.current.play();

        // Stop at region end
        const checkEnd = () => {
            if (wsRef.current && wsRef.current.getCurrentTime() >= clip.end) {
                wsRef.current.pause();
                wsRef.current.un("timeupdate", checkEnd);
            }
        };
        wsRef.current.on("timeupdate", checkEnd);
    }, []);

    /* ── Export / Merge ──────────────────────────────── */
    const handleExport = async () => {
        if (clips.length === 0) return;
        setExporting(true);
        setExportError("");
        setExportResult(null);

        const sorted = [...clips].sort((a, b) => a.start - b.start);
        const segments: EditSegment[] = sorted.map((c) => ({
            task_id: task.id,
            start: Math.round(c.start * 100) / 100,
            end: Math.round(c.end * 100) / 100,
        }));

        try {
            const result = await submitEdit(
                segments,
                `${task.title || "audio"}_edit`
            );
            setExportResult({ id: result.id, name: result.name });
        } catch (err) {
            setExportError(err instanceof Error ? err.message : "Export failed");
        } finally {
            setExporting(false);
        }
    };

    /* ── Playback controls ──────────────────────────── */
    const togglePlay = () => {
        if (!wsRef.current) return;
        wsRef.current.playPause();
    };

    return (
        <div className="editor-overlay">
            <div className="editor">
                {/* ── Header ─────────────────────────────── */}
                <div className="editor__header">
                    <div className="editor__header-left">
                        <div className="editor__title-icon">
                            <ScissorsIcon />
                        </div>
                        <div>
                            <h2 className="editor__title">Audio Editor</h2>
                            <p className="editor__subtitle">
                                {task.title || "Untitled"} {task.uploader ? `· ${task.uploader}` : ""}
                            </p>
                        </div>
                    </div>
                    <button className="editor__close" onClick={onClose} title="Close editor">
                        <CloseIcon />
                    </button>
                </div>

                {/* ── Waveform ───────────────────────────── */}
                <div className="editor__waveform-wrap">
                    {!ready && (
                        <div className="editor__loading">
                            <div className="spinner spinner--light" />
                            <span>Loading waveform…</span>
                        </div>
                    )}
                    <div ref={containerRef} className="editor__waveform" />
                </div>

                {/* ── Transport bar ──────────────────────── */}
                <div className="editor__transport">
                    <div className="editor__transport-left">
                        <button className="editor__play-btn" onClick={togglePlay} disabled={!ready}>
                            {playing ? <PauseIcon /> : <PlayIcon />}
                        </button>
                        <span className="editor__time">
                            {fmt(currentTime)} / {fmt(duration)}
                        </span>
                    </div>
                    <div className="editor__transport-right">
                        <button className="editor__tool-btn" onClick={() => setZoom((z) => Math.max(10, z - 20))} title="Zoom out">
                            <ZoomOutIcon />
                        </button>
                        <input
                            type="range"
                            className="editor__zoom-slider"
                            min={10}
                            max={300}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            title="Zoom"
                        />
                        <button className="editor__tool-btn" onClick={() => setZoom((z) => Math.min(300, z + 20))} title="Zoom in">
                            <ZoomInIcon />
                        </button>
                    </div>
                </div>

                {/* ── Clips Panel ────────────────────────── */}
                <div className="editor__clips-panel">
                    <div className="editor__clips-header">
                        <h3 className="editor__clips-title">
                            Clips {clips.length > 0 && <span className="editor__clip-count">{clips.length}</span>}
                        </h3>
                        <button className="editor__add-clip-btn" onClick={addClip} disabled={!ready}>
                            <ScissorsIcon /> Add Clip
                        </button>
                    </div>

                    {clips.length === 0 ? (
                        <div className="editor__clips-empty">
                            Click &quot;Add Clip&quot; to create a selection region on the waveform.
                            Drag the handles to trim. Add multiple clips to merge them.
                        </div>
                    ) : (
                        <div className="editor__clip-list">
                            {clips.map((clip, i) => (
                                <div key={clip.id} className="editor__clip-item">
                                    <div
                                        className="editor__clip-color"
                                        style={{ background: clip.color.replace("0.25", "0.8") }}
                                    />
                                    <div className="editor__clip-info">
                                        <span className="editor__clip-label">Clip {i + 1}</span>
                                        <span className="editor__clip-range">
                                            {fmt(clip.start)} → {fmt(clip.end)}
                                            <span className="editor__clip-dur">
                                                ({fmt(clip.end - clip.start)})
                                            </span>
                                        </span>
                                    </div>
                                    <button
                                        className="editor__clip-play"
                                        onClick={() => playClip(clip)}
                                        title="Preview clip"
                                    >
                                        <PlayIcon />
                                    </button>
                                    <button
                                        className="editor__clip-remove"
                                        onClick={() => removeClip(clip.id)}
                                        title="Remove clip"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Export Bar ──────────────────────────── */}
                <div className="editor__export-bar">
                    {exportError && (
                        <div className="editor__export-error">{exportError}</div>
                    )}

                    {exportResult ? (
                        <div className="editor__export-success">
                            <span>✅ Export ready!</span>
                            <div className="editor__export-actions">
                                <a
                                    href={getEditStreamUrl(exportResult.id)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="editor__listen-btn"
                                >
                                    <PlayIcon /> Listen
                                </a>
                                <a
                                    href={getEditDownloadUrl(exportResult.id)}
                                    download
                                    className="editor__download-btn"
                                >
                                    <DownloadIcon /> Download MP3
                                </a>
                            </div>
                        </div>
                    ) : (
                        <button
                            className="editor__export-btn"
                            onClick={handleExport}
                            disabled={clips.length === 0 || exporting}
                        >
                            {exporting ? (
                                <>
                                    <div className="spinner spinner--dark" />
                                    Processing…
                                </>
                            ) : (
                                <>
                                    <DownloadIcon /> Export {clips.length > 1 ? `${clips.length} clips merged` : "clip"} as MP3
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
