"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type MouseEvent,
} from "react";
import dynamic from "next/dynamic";
import {
  submitDownload,
  getTaskStatus,
  getDownloadUrl,
  getStreamUrl,
  type DownloadTask,
} from "@/lib/api";

const AudioEditor = dynamic(() => import("@/components/AudioEditor"), {
  ssr: false,
});

/* ═══════════════════════════════════════════════════════════
   Icons
   ═══════════════════════════════════════════════════════════ */

function MusicIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
    </svg>
  );
}

function DownloadArrowIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function PlayIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function SkipPrevIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
    </svg>
  );
}

function SkipNextIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
    </svg>
  );
}

function VolumeIcon({ level }: { level: number }) {
  if (level === 0) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
      </svg>
    );
  }
  if (level < 0.5) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

function CheckCircleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  );
}

function ErrorCircleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
  );
}

function WaveformIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <line x1="4" y1="8" x2="4" y2="16" />
      <line x1="8" y1="5" x2="8" y2="19" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="16" y1="7" x2="16" y2="17" />
      <line x1="20" y1="10" x2="20" y2="14" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function ScissorsIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  );
}

/* ─── Equalizer ────────────────────────────────────────────── */

function Equalizer() {
  return (
    <div className="eq">
      <div className="eq__bar" />
      <div className="eq__bar" />
      <div className="eq__bar" />
      <div className="eq__bar" />
    </div>
  );
}

/* ─── Helpers ──────────────────────────────────────────────── */

function extractShortUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname.replace(/\/$/, "").split("/").pop() || url;
  } catch {
    return url;
  }
}

function statusLabel(s: string): string {
  return (
    { pending: "Queued", downloading: "Downloading", processing: "Converting to MP3", completed: "Ready", failed: "Failed" }[s] || s
  );
}

function parseUrls(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.startsWith("http"));
}

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ═══════════════════════════════════════════════════════════
   Track Row Component
   ═══════════════════════════════════════════════════════════ */

function Track({
  task,
  index,
  isPlaying,
  onPlay,
  onEdit,
}: {
  task: DownloadTask;
  index: number;
  isPlaying: boolean;
  onPlay: (task: DownloadTask) => void;
  onEdit: (task: DownloadTask) => void;
}) {
  const isActive = task.status === "downloading" || task.status === "processing";
  const isDone = task.status === "completed";
  const isFailed = task.status === "failed";

  let artClass = "track__art";
  if (isActive) artClass += " track__art--active";
  else if (isDone) artClass += " track__art--done";
  else if (isFailed) artClass += " track__art--failed";

  let trackClass = "track";
  if (isActive) trackClass += " track--active";
  if (isDone) trackClass += " track--playable";
  if (isPlaying) trackClass += " track--playing";

  const handleClick = () => {
    if (isDone) onPlay(task);
  };

  return (
    <div className={trackClass} onClick={handleClick}>
      {/* Track Number / Equalizer */}
      <div className="track__number">
        {isPlaying ? <Equalizer /> : isActive ? <Equalizer /> : index + 1}
      </div>

      {/* Album Art */}
      <div className={artClass} style={{ position: "relative" }}>
        {isDone ? (
          isPlaying ? <Equalizer /> : <CheckCircleIcon />
        ) : isFailed ? (
          <ErrorCircleIcon />
        ) : isActive ? (
          <WaveformIcon />
        ) : (
          <MusicIcon />
        )}
        {isDone && !isPlaying && (
          <div className="track__play-overlay">
            <PlayIcon size={14} />
          </div>
        )}
        {isDone && isPlaying && (
          <div className="track__play-overlay">
            <PauseIcon size={14} />
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="track__info">
        <div className="track__title">
          {task.title || extractShortUrl(task.url)}
        </div>
        <div className="track__artist">
          {task.uploader || "Instagram"}
          {isActive && ` · ${statusLabel(task.status)}`}
          {isDone && !isPlaying && " · Ready"}
          {isPlaying && " · Playing"}
        </div>
        {isActive && (
          <div className="progress">
            <div className="progress__bar" style={{ width: `${task.progress}%` }} />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="track__status">
        {isFailed && (
          <span className="track__error" title={task.error_message}>
            {task.error_message}
          </span>
        )}
        {isDone && (
          <>
            <button
              className="btn-edit"
              onClick={(e) => { e.stopPropagation(); onEdit(task); }}
              title="Open editor"
            >
              <ScissorsIcon /> Edit
            </button>
            <a
              href={getDownloadUrl(task.id)}
              className="btn-dl"
              download
              onClick={(e) => e.stopPropagation()}
            >
              <DownloadArrowIcon size={14} />
              MP3
            </a>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Spotify-Style Audio Player Bar
   ═══════════════════════════════════════════════════════════ */

function PlayerBar({
  currentTask,
  completedTasks,
  onTrackChange,
}: {
  currentTask: DownloadTask;
  completedTasks: DownloadTask[];
  onTrackChange: (task: DownloadTask) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [prevVolume, setPrevVolume] = useState(0.8);
  const seekingRef = useRef(false);

  const audioSrc = getStreamUrl(currentTask.id);

  // Load & play when track changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = audioSrc;
    audio.volume = volume;
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTask.id]);

  // Time updates
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (!seekingRef.current) setCurrentTime(audio.currentTime);
    };
    const onLoaded = () => setDuration(audio.duration);
    const onEnded = () => {
      setPlaying(false);
      // Auto-play next track
      const idx = completedTasks.findIndex((t) => t.id === currentTask.id);
      if (idx >= 0 && idx < completedTasks.length - 1) {
        onTrackChange(completedTasks[idx + 1]);
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
    };
  }, [currentTask.id, completedTasks, onTrackChange]);

  /* Controls */
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true));
    }
  };

  const skipPrev = () => {
    const audio = audioRef.current;
    if (!audio) return;
    // If > 3s in, restart; else go to previous
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
    } else {
      const idx = completedTasks.findIndex((t) => t.id === currentTask.id);
      if (idx > 0) onTrackChange(completedTasks[idx - 1]);
    }
  };

  const skipNext = () => {
    const idx = completedTasks.findIndex((t) => t.id === currentTask.id);
    if (idx >= 0 && idx < completedTasks.length - 1) {
      onTrackChange(completedTasks[idx + 1]);
    }
  };

  /* Seek */
  const handleSeek = (e: MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar = e.currentTarget;
    if (!audio || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    audio.currentTime = pct * duration;
    setCurrentTime(pct * duration);
  };

  /* Volume */
  const handleVolume = (e: MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar = e.currentTarget;
    if (!audio) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    audio.volume = pct;
    setVolume(pct);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (volume > 0) {
      setPrevVolume(volume);
      audio.volume = 0;
      setVolume(0);
    } else {
      audio.volume = prevVolume;
      setVolume(prevVolume);
    }
  };

  const seekPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <audio ref={audioRef} preload="metadata" />

      <div className="player">
        {/* ── Left: Track Info ─────────────────────── */}
        <div className="player__left">
          <div className="player__art">
            <MusicIcon size={24} />
          </div>
          <div className="player__track-info">
            <div className="player__track-name">
              {currentTask.title || extractShortUrl(currentTask.url)}
            </div>
            <div className="player__track-artist">
              {currentTask.uploader || "Instagram"}
            </div>
          </div>
        </div>

        {/* ── Center: Controls + Seek ─────────────── */}
        <div className="player__center">
          <div className="player__controls">
            <button className="player__ctrl-btn" onClick={skipPrev} title="Previous">
              <SkipPrevIcon />
            </button>
            <button className="player__play-btn" onClick={togglePlay} title={playing ? "Pause" : "Play"}>
              {playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
            </button>
            <button className="player__ctrl-btn" onClick={skipNext} title="Next">
              <SkipNextIcon />
            </button>
          </div>
          <div className="player__seek-row">
            <span className="player__time">{formatTime(currentTime)}</span>
            <div className="player__seek-track" onClick={handleSeek}>
              <div className="player__seek-fill" style={{ width: `${seekPct}%` }}>
                <div className="player__seek-knob" />
              </div>
            </div>
            <span className="player__time">{formatTime(duration)}</span>
          </div>
        </div>

        {/* ── Right: Volume + Download ────────────── */}
        <div className="player__right">
          <div className="player__vol-group">
            <button className="player__vol-btn" onClick={toggleMute} title="Volume">
              <VolumeIcon level={volume} />
            </button>
            <div className="player__vol-track" onClick={handleVolume}>
              <div className="player__vol-fill" style={{ width: `${volume * 100}%` }}>
                <div className="player__vol-knob" />
              </div>
            </div>
          </div>
          <a
            href={getDownloadUrl(currentTask.id)}
            className="player__dl-link"
            download
            title="Download MP3"
          >
            <DownloadArrowIcon size={16} />
          </a>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════════ */

export default function Home() {
  const [inputValue, setInputValue] = useState("");
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentTrack, setCurrentTrack] = useState<DownloadTask | null>(null);
  const [editingTask, setEditingTask] = useState<DownloadTask | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pollingRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const urls = parseUrls(inputValue);
  const completedTasks = tasks.filter((t) => t.status === "completed");

  /* ── Poll ────────────────────────────────────────── */
  const pollTask = useCallback((taskId: string) => {
    if (pollingRef.current.has(taskId)) clearInterval(pollingRef.current.get(taskId));

    const interval = setInterval(async () => {
      try {
        const updated = await getTaskStatus(taskId);
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
        if (updated.status === "completed" || updated.status === "failed") {
          clearInterval(interval);
          pollingRef.current.delete(taskId);
        }
      } catch { /* retry */ }
    }, 1500);
    pollingRef.current.set(taskId, interval);
  }, []);

  useEffect(() => {
    return () => {
      pollingRef.current.forEach((i) => clearInterval(i));
    };
  }, []);

  /* ── Submit ──────────────────────────────────────── */
  const handleSubmit = async () => {
    if (urls.length === 0) return;
    setLoading(true);
    setError("");
    try {
      const newTasks = await submitDownload(urls);
      setTasks((prev) => [...newTasks, ...prev]);
      setInputValue("");
      for (const t of newTasks) pollTask(t.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  /* ── Play handler ────────────────────────────────── */
  const handlePlay = useCallback((task: DownloadTask) => {
    setCurrentTrack((prev) => (prev?.id === task.id ? null : task));
  }, []);

  const handleTrackChange = useCallback((task: DownloadTask) => {
    setCurrentTrack(task);
  }, []);

  const handleEdit = useCallback((task: DownloadTask) => {
    setEditingTask(task);
  }, []);

  const hasPlayer = currentTrack !== null;

  return (
    <div className={`app-shell ${hasPlayer ? "app-shell--has-player" : ""}`}>
      {/* ── Top Bar ──────────────────────────────────── */}
      <div className="topbar">
        <div className="topbar__logo">
          <div className="topbar__icon">
            <MusicIcon size={18} />
          </div>
          <span className="topbar__name">InstaAudio</span>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────── */}
      <main className="app-main">
        <div className="app-content">
          {/* Hero */}
          <div className="hero">
            <div className="hero__artwork">
              <MusicIcon size={80} />
            </div>
            <div className="hero__info">
              <span className="hero__type">Tool</span>
              <h1 className="hero__title">Instagram Audio Downloader</h1>
              <p className="hero__desc">
                Extract high-quality MP3 audio from Instagram Reels &amp; videos
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="action-bar">
            <button
              className="btn-green btn-green--circle"
              onClick={handleSubmit}
              disabled={loading || urls.length === 0}
              id="submit-download"
              title="Extract Audio"
            >
              {loading ? <div className="spinner" /> : <PlayIcon size={24} />}
            </button>
          </div>

          {/* Input Card */}
          <div className="input-card">
            <label className="input-card__label" htmlFor="url-input">
              Paste Instagram URLs
            </label>
            <textarea
              ref={textareaRef}
              id="url-input"
              className="url-textarea"
              placeholder={"https://www.instagram.com/reel/ABC123/\nhttps://www.instagram.com/p/XYZ789/"}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <div className="input-footer">
              <div className="input-hint">
                {urls.length > 0 ? (
                  <>
                    <span className="url-count-pill">{urls.length}</span>
                    URL{urls.length > 1 ? "s" : ""} detected
                  </>
                ) : (
                  "One URL per line · Max 10"
                )}
              </div>
              <div className="shortcut-hint">
                <kbd>⌘</kbd> + <kbd>Enter</kbd>
              </div>
            </div>

            {error && (
              <div className="alert-error" style={{ marginTop: 16 }}>
                <AlertIcon />
                {error}
              </div>
            )}

            <button
              className="btn-green btn-green--full"
              onClick={handleSubmit}
              disabled={loading || urls.length === 0}
              style={{ marginTop: 16 }}
            >
              {loading ? (
                <>
                  <div className="spinner" />
                  Extracting…
                </>
              ) : (
                <>
                  <DownloadArrowIcon size={20} />
                  Extract Audio
                </>
              )}
            </button>
          </div>

          {/* Track List */}
          {tasks.length > 0 && (
            <div className="tracklist">
              <h2 className="tracklist__header">Downloads</h2>
              <div className="divider" />
              {tasks.map((task, i) => (
                <Track
                  key={task.id}
                  task={task}
                  index={i}
                  isPlaying={currentTrack?.id === task.id}
                  onPlay={handlePlay}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </div>

        <footer className="footer">
          Powered by{" "}
          <a href="https://github.com/yt-dlp/yt-dlp" target="_blank" rel="noopener noreferrer">yt-dlp</a>
          {" "}&amp;{" "}
          <a href="https://ffmpeg.org" target="_blank" rel="noopener noreferrer">FFmpeg</a>
        </footer>
      </main>

      {/* ── Bottom Player Bar ────────────────────────── */}
      {hasPlayer ? (
        <PlayerBar
          currentTask={currentTrack}
          completedTasks={completedTasks}
          onTrackChange={handleTrackChange}
        />
      ) : (
        <div className="now-playing-bar">
          <span className="now-playing-bar__text">
            🎵 InstaAudio — Click a completed track to play
          </span>
        </div>
      )}

      {/* ── Editor Overlay ─────────────────────────── */}
      {editingTask && (
        <AudioEditor
          task={editingTask}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}
