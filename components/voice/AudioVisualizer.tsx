'use client';

/**
 * Audio Visualizer Component
 *
 * Real-time audio waveform visualization with dark D&D theme.
 * Displays microphone input levels and AI response audio.
 *
 * Features:
 * - Real-time frequency spectrum analysis
 * - Waveform visualization
 * - Volume level meters
 * - Smooth animations
 * - Purple/pink gradient colors matching D&D theme
 */

import { useEffect, useRef, useState } from 'react';

interface AudioVisualizerProps {
  audioContext?: AudioContext | null;
  mediaStream?: MediaStream | null;
  isActive?: boolean;
  variant?: 'waveform' | 'bars' | 'circle';
  height?: number;
  color?: string;
}

export function AudioVisualizer({
  audioContext,
  mediaStream,
  isActive = false,
  variant = 'waveform',
  height = 100,
  color = '#a855f7', // purple-500
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const [volume, setVolume] = useState(0);

  useEffect(() => {
    if (!canvasRef.current || !audioContext || !mediaStream) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = height;

    // Create analyzer
    const analyzer = audioContext.createAnalyser();
    analyzer.fftSize = 2048;
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Connect media stream to analyzer
    const source = audioContext.createMediaStreamSource(mediaStream);
    source.connect(analyzer);
    analyzerRef.current = analyzer;

    // Animation loop
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      analyzer.getByteTimeDomainData(dataArray);

      // Calculate volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const value = (dataArray[i] - 128) / 128;
        sum += value * value;
      }
      const rms = Math.sqrt(sum / bufferLength);
      setVolume(Math.min(rms * 100, 100));

      // Clear canvas
      ctx.fillStyle = 'rgba(15, 23, 42, 0.1)'; // slate-900 with low opacity for trail effect
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (variant === 'waveform') {
        drawWaveform(ctx, dataArray, canvas.width, canvas.height, color, isActive);
      } else if (variant === 'bars') {
        drawBars(ctx, dataArray, canvas.width, canvas.height, color, isActive);
      } else if (variant === 'circle') {
        drawCircle(ctx, dataArray, canvas.width, canvas.height, color, isActive);
      }
    };

    if (isActive) {
      draw();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (source) {
        source.disconnect();
      }
    };
  }, [audioContext, mediaStream, isActive, variant, height, color]);

  // Draw waveform
  const drawWaveform = (
    ctx: CanvasRenderingContext2D,
    dataArray: Uint8Array,
    width: number,
    height: number,
    color: string,
    active: boolean
  ) => {
    ctx.lineWidth = 2;

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#a855f7'); // purple-500
    gradient.addColorStop(0.5, '#ec4899'); // pink-500
    gradient.addColorStop(1, '#f97316'); // orange-500

    ctx.strokeStyle = active ? gradient : 'rgba(168, 85, 247, 0.3)';
    ctx.beginPath();

    const sliceWidth = width / dataArray.length;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(width, height / 2);
    ctx.stroke();
  };

  // Draw frequency bars
  const drawBars = (
    ctx: CanvasRenderingContext2D,
    dataArray: Uint8Array,
    width: number,
    height: number,
    color: string,
    active: boolean
  ) => {
    const barCount = 64;
    const barWidth = width / barCount;
    const step = Math.floor(dataArray.length / barCount);

    for (let i = 0; i < barCount; i++) {
      const barHeight = (dataArray[i * step] / 255) * height;
      const x = i * barWidth;

      // Create gradient for each bar
      const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
      gradient.addColorStop(0, active ? '#a855f7' : 'rgba(168, 85, 247, 0.3)'); // purple
      gradient.addColorStop(0.5, active ? '#ec4899' : 'rgba(236, 72, 153, 0.3)'); // pink
      gradient.addColorStop(1, active ? '#f97316' : 'rgba(249, 115, 22, 0.3)'); // orange

      ctx.fillStyle = gradient;
      ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);
    }
  };

  // Draw circular visualizer
  const drawCircle = (
    ctx: CanvasRenderingContext2D,
    dataArray: Uint8Array,
    width: number,
    height: number,
    color: string,
    active: boolean
  ) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 4;
    const bars = 128;
    const step = Math.floor(dataArray.length / bars);

    for (let i = 0; i < bars; i++) {
      const angle = (i / bars) * Math.PI * 2;
      const barHeight = (dataArray[i * step] / 255) * radius;

      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle) * (radius + barHeight);
      const y2 = centerY + Math.sin(angle) * (radius + barHeight);

      // Create gradient
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, active ? '#a855f7' : 'rgba(168, 85, 247, 0.3)');
      gradient.addColorStop(1, active ? '#ec4899' : 'rgba(236, 72, 153, 0.3)');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full rounded-lg"
        style={{ height: `${height}px` }}
      />

      {/* Volume Indicator */}
      <div className="absolute bottom-2 right-2 flex items-center gap-2 bg-slate-900/80 backdrop-blur px-3 py-1 rounded-full">
        <div className="text-xs text-slate-400">Vol:</div>
        <div className="w-24 h-1 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-100"
            style={{ width: `${volume}%` }}
          />
        </div>
        <div className="text-xs text-purple-400 w-8 text-right">
          {Math.round(volume)}%
        </div>
      </div>

      {/* Inactive State Overlay */}
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm rounded-lg">
          <div className="text-slate-500 text-sm">
            {audioContext && mediaStream ? 'Paused' : 'Waiting for audio...'}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Simple Volume Meter Component
 */
interface VolumeMeterProps {
  volume: number;
  maxVolume?: number;
  color?: string;
  height?: number;
}

export function VolumeMeter({
  volume,
  maxVolume = 100,
  color = '#a855f7',
  height = 24,
}: VolumeMeterProps) {
  const percentage = Math.min((volume / maxVolume) * 100, 100);

  return (
    <div className="relative w-full bg-slate-800 rounded-full overflow-hidden" style={{ height }}>
      <div
        className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-100"
        style={{ width: `${percentage}%` }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-medium text-white drop-shadow">
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
}

/**
 * Speaking Indicator Component
 */
interface SpeakingIndicatorProps {
  isSpeaking: boolean;
  label?: string;
}

export function SpeakingIndicator({ isSpeaking, label = 'Speaking' }: SpeakingIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-1 rounded-full bg-gradient-to-t from-purple-600 to-pink-600 transition-all ${
              isSpeaking ? 'animate-pulse' : ''
            }`}
            style={{
              height: isSpeaking ? `${12 + i * 4}px` : '4px',
              animationDelay: `${i * 100}ms`,
            }}
          />
        ))}
      </div>
      {label && (
        <span className={`text-sm ${isSpeaking ? 'text-purple-400' : 'text-slate-500'}`}>
          {label}
        </span>
      )}
    </div>
  );
}
