"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  PlayIcon,
  PauseIcon,
  DownloadIcon,
  SkipBackIcon,
  SkipForwardIcon,
  MusicIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatSize } from "@/lib/file-system/types";

interface AudioViewerProps {
  src: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export function AudioViewer({ src, fileName, fileSize, mimeType }: AudioViewerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      audioRef.current.pause();
      setPlaying(false);
    }
  }, []);

  useEffect(() => {
    if (!audioRef.current || !canvasRef.current) return;
    const audio = audioRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (!playing || !analyserRef.current) {
        ctx.fillStyle = "hsl(var(--muted-foreground) / 0.2)";
        ctx.fillRect(0, 0, w, h);
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const analyser = analyserRef.current;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = "hsl(var(--background))";
      ctx.fillRect(0, 0, w, h);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "hsl(var(--primary))";
      ctx.beginPath();

      const sliceWidth = w / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * h) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  const setupAnalyser = () => {
    if (!audioRef.current || audioCtxRef.current) return;
    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;
    sourceRef.current = audioCtx.createMediaElementSource(audioRef.current);
    sourceRef.current.connect(analyser);
    analyser.connect(audioCtx.destination);
  };

  const handlePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (!audioCtxRef.current) setupAnalyser();
    if (audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current.resume();
    }
    togglePlay();
  }, [togglePlay]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * duration;
    setCurrentTime(pct * duration);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 gap-6">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        onEnded={() => setPlaying(false)}
      />

      <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center">
        <MusicIcon className="size-10 text-primary" />
      </div>

      <div className="text-center">
        <p className="text-sm font-medium truncate max-w-[300px]">{fileName}</p>
        <p className="text-xs text-muted-foreground">
          {formatSize(fileSize)} &middot; {mimeType}
        </p>
      </div>

      <canvas
        ref={canvasRef}
        width={400}
        height={80}
        className="w-full max-w-[400px] h-20 rounded-lg"
      />

      <div
        className="w-full max-w-[400px] h-1.5 bg-muted rounded-full cursor-pointer relative"
        onClick={handleSeek}
      >
        <div
          className="h-full bg-primary rounded-full"
          style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%" }}
        />
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground w-10 text-right">
          {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, "0")}
        </span>

        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <SkipBackIcon className="size-4" />
        </Button>
        <Button variant="default" size="icon" className="size-12 rounded-full" onClick={handlePlay}>
          {playing ? <PauseIcon className="size-5" /> : <PlayIcon className="size-5 ml-0.5" />}
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <SkipForwardIcon className="size-4" />
        </Button>

        <span className="text-xs text-muted-foreground w-10">
          {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, "0")}
        </span>
      </div>

      <Button variant="outline" size="sm" onClick={() => window.open(src, "_blank")}>
        <DownloadIcon className="size-3.5 mr-1.5" /> Download
      </Button>
    </div>
  );
}
