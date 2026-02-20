import type { Metadata } from "next";
import "./globals.css";
import "./editor.css";

export const metadata: Metadata = {
  title: "InstaAudio — Instagram Audio Downloader",
  description:
    "Extract and download high-quality MP3 audio from Instagram Reels and videos. Paste your URLs and get the audio in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
