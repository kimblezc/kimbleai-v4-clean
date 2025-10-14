'use client';

import React from 'react';

interface D20DiceProps {
  size?: number;
  className?: string;
  spinning?: boolean;
}

export default function D20Dice({ size = 64, className = '', spinning = true }: D20DiceProps) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // 3D Isometric D20 with strong perspective and depth
  const D20SVG = () => (
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <defs>
        {/* Strong gradients for clear 3D depth */}
        {/* Top face - lightest (facing up and toward viewer) */}
        <linearGradient id="d20-top-face" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#8fd3ff" />
          <stop offset="50%" stopColor="#5eb8ff" />
          <stop offset="100%" stopColor="#4a9eff" />
        </linearGradient>

        {/* Left face - medium (side lighting) */}
        <linearGradient id="d20-left-face" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#2d7ac9" />
          <stop offset="100%" stopColor="#4a9eff" />
        </linearGradient>

        {/* Right face - darker (away from light) */}
        <linearGradient id="d20-right-face" x1="100%" y1="50%" x2="0%" y2="50%">
          <stop offset="0%" stopColor="#1e4d7a" />
          <stop offset="100%" stopColor="#2563a8" />
        </linearGradient>

        {/* Shadow and glow effects */}
        <filter id="d20-shadow">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
          <feOffset dx="0" dy="2" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        <filter id="d20-glow">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/*
        Isometric D20 projection showing 3 main faces clearly
        Using isometric angles (30 degrees) for true 3D appearance
        Structure: One top triangular face + two side triangular faces
      */}
      <g filter="url(#d20-shadow)">
        {/* Cast shadow on ground */}
        <ellipse cx="60" cy="95" rx="28" ry="8" fill="rgba(0,0,0,0.2)" />

        {/* Main 3D structure with clear visible faces */}
        <g filter="url(#d20-glow)">
          {/* BOTTOM FACES - drawn first for proper layering */}
          {/* Bottom left side faces (darker, less visible) */}
          <path
            d="M 30,75 L 60,90 L 45,55 Z"
            fill="#1a3d5f"
            stroke="#0d1f2f"
            strokeWidth="1.5"
            opacity="0.6"
          />

          {/* Bottom right side faces */}
          <path
            d="M 90,75 L 60,90 L 75,55 Z"
            fill="#0f2942"
            stroke="#0a1f33"
            strokeWidth="1.5"
            opacity="0.5"
          />

          {/* LEFT FACE - Medium shading (visible side face) */}
          {/* This is a key visible face showing depth */}
          <path
            d="M 30,75 L 45,55 L 35,40 L 20,60 Z"
            fill="url(#d20-left-face)"
            stroke="#2563a8"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Left upper triangle */}
          <path
            d="M 35,40 L 60,25 L 45,55 Z"
            fill="url(#d20-left-face)"
            stroke="#2563a8"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* RIGHT FACE - Darker shading (visible side face away from light) */}
          {/* This creates strong contrast with left face */}
          <path
            d="M 90,75 L 75,55 L 85,40 L 100,60 Z"
            fill="url(#d20-right-face)"
            stroke="#1e4d7a"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Right upper triangle */}
          <path
            d="M 85,40 L 60,25 L 75,55 Z"
            fill="url(#d20-right-face)"
            stroke="#1e4d7a"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* TOP FACE - Lightest shading (primary visible face with "20") */}
          {/* Large central triangular face pointing toward viewer */}
          <path
            d="M 60,25 L 35,40 L 60,52 L 85,40 Z"
            fill="url(#d20-top-face)"
            stroke="#4a9eff"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Central connecting faces for depth */}
          <path
            d="M 45,55 L 60,52 L 35,40 Z"
            fill="url(#d20-top-face)"
            stroke="#4a9eff"
            strokeWidth="2"
            strokeLinejoin="round"
            opacity="0.95"
          />

          <path
            d="M 75,55 L 60,52 L 85,40 Z"
            fill="#5eb8ff"
            stroke="#4a9eff"
            strokeWidth="2"
            strokeLinejoin="round"
            opacity="0.9"
          />

          {/* Edge highlights for extra definition */}
          <line x1="60" y1="25" x2="60" y2="52" stroke="#a5d8ff" strokeWidth="1.5" opacity="0.7" />
          <line x1="60" y1="25" x2="35" y2="40" stroke="#8fd3ff" strokeWidth="1.2" opacity="0.6" />
          <line x1="60" y1="25" x2="85" y2="40" stroke="#7ec3ff" strokeWidth="1.2" opacity="0.5" />
        </g>
      </g>

      {/* "20" number on the top face - large and clear */}
      <text
        x="60"
        y="45"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="22"
        fontWeight="900"
        fill="#ffffff"
        stroke="#1e4d7a"
        strokeWidth="1.5"
        style={{
          fontFamily: 'Arial Black, Arial, sans-serif',
          paintOrder: 'stroke fill',
          letterSpacing: '-1px'
        }}
      >
        20
      </text>

      {/* Additional text shadow for depth */}
      <text
        x="60"
        y="46"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="22"
        fontWeight="900"
        fill="rgba(0,0,0,0.3)"
        style={{
          fontFamily: 'Arial Black, Arial, sans-serif',
          letterSpacing: '-1px'
        }}
      >
        20
      </text>
    </svg>
  );

  if (!isMounted) {
    // Show static D20 placeholder during SSR
    return (
      <div style={{ width: size, height: size }} className={`inline-block ${className}`}>
        <D20SVG />
      </div>
    );
  }

  return (
    <div
      className={`inline-block ${className}`}
      style={{
        width: size,
        height: size,
        perspective: '1000px',
        perspectiveOrigin: 'center center'
      }}
    >
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes d20-rotate-3d {
            0% {
              transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg);
            }
            25% {
              transform: rotateX(90deg) rotateY(90deg) rotateZ(45deg);
            }
            50% {
              transform: rotateX(180deg) rotateY(180deg) rotateZ(90deg);
            }
            75% {
              transform: rotateX(270deg) rotateY(270deg) rotateZ(135deg);
            }
            100% {
              transform: rotateX(360deg) rotateY(360deg) rotateZ(180deg);
            }
          }
          .d20-spinning {
            animation: d20-rotate-3d 4s ease-in-out infinite;
            transform-style: preserve-3d;
          }
        `
      }} />

      <div
        className={spinning ? 'd20-spinning' : ''}
        style={{
          filter: 'drop-shadow(0 0 10px rgba(74, 158, 255, 0.6))',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
        }}
      >
        <D20SVG />
      </div>
    </div>
  );
}
