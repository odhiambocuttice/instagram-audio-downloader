#!/usr/bin/env python3
"""
Instagram Audio Downloader
--------------------------
Extract and download audio from one or multiple Instagram video URLs.
Requires: yt-dlp and ffmpeg

Install dependencies:
    pip install yt-dlp
    # macOS:   brew install ffmpeg
    # Ubuntu:  sudo apt install ffmpeg
    # Windows: https://ffmpeg.org/download.html
"""

import os
import sys
import subprocess

def check_dependencies():
    """Check that yt-dlp and ffmpeg are available."""
    missing = []
    try:
        import yt_dlp
    except ImportError:
        missing.append("yt-dlp  →  pip install yt-dlp")
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
    except (FileNotFoundError, subprocess.CalledProcessError):
        missing.append("ffmpeg  →  https://ffmpeg.org/download.html  (or: brew install ffmpeg)")
    if missing:
        print("\n❌  Missing dependencies:")
        for m in missing:
            print(f"    • {m}")
        print()
        sys.exit(1)

def download_audio(urls: list[str], output_dir: str = "."):
    """Download audio as MP3 for each Instagram URL."""
    import yt_dlp

    os.makedirs(output_dir, exist_ok=True)

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": os.path.join(output_dir, "%(uploader)s - %(title).60s.%(ext)s"),
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }
        ],
        "quiet": False,
        "no_warnings": False,
        "ignoreerrors": True,   # skip failed URLs, continue with rest
    }

    print(f"\n🎵  Downloading audio for {len(urls)} URL(s) → {os.path.abspath(output_dir)}\n")
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download(urls)
    print("\n✅  Done! Check your output folder for the MP3 files.")

def get_urls_interactively() -> list[str]:
    """Prompt the user to paste one or more Instagram URLs."""
    print("━" * 55)
    print("  📸  Instagram Audio Downloader")
    print("━" * 55)
    print("Paste Instagram video URLs (one per line).")
    print("When finished, press Enter on a blank line.\n")

    urls = []
    while True:
        line = input("  URL: ").strip()
        if not line:
            if urls:
                break
            print("  (Please enter at least one URL)")
        else:
            urls.append(line)
            print(f"  ✓ Added ({len(urls)} total)")

    return urls

def main():
    check_dependencies()

    # Accept URLs as command-line args, or prompt interactively
    if len(sys.argv) > 1:
        urls = sys.argv[1:]
        print(f"\n📋  Using {len(urls)} URL(s) from command-line arguments.")
    else:
        urls = get_urls_interactively()

    # Choose output directory
    print("\nWhere should the MP3s be saved?")
    print("  (Press Enter to use the current folder, or type a path)")
    output_dir = input("  Save to: ").strip() or "."

    download_audio(urls, output_dir)

if __name__ == "__main__":
    main()