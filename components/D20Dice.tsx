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

  // Realistic D20 icosahedron SVG component with proper 3D perspective
  const D20SVG = () => (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <defs>
        {/* Gradients for 3D shading effect */}
        <linearGradient id="d20-light" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6bb3ff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#2d7ac9" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="d20-medium" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4a9eff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#2563a8" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="d20-dark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b7ed1" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#1e4d7a" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="d20-darker" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2d6bb3" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#163a5f" stopOpacity="0.5" />
        </linearGradient>
        <radialGradient id="d20-top-highlight">
          <stop offset="0%" stopColor="#7ec3ff" stopOpacity="1" />
          <stop offset="100%" stopColor="#4a9eff" stopOpacity="0.8" />
        </radialGradient>
        <filter id="d20-glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Icosahedron faces with proper depth layering */}
      <g filter="url(#d20-glow)">
        {/* Back faces (darker, occluded) - drawn first */}
        <polygon points="50,85 28,68 38,50" fill="url(#d20-darker)" stroke="#1e4d7a" strokeWidth="0.5" opacity="0.4" />
        <polygon points="50,85 62,68 38,50" fill="url(#d20-darker)" stroke="#1e4d7a" strokeWidth="0.5" opacity="0.3" />
        <polygon points="38,50 28,68 15,48" fill="url(#d20-dark)" stroke="#2563a8" strokeWidth="0.6" opacity="0.5" />
        <polygon points="38,50 15,48 25,32" fill="url(#d20-dark)" stroke="#2563a8" strokeWidth="0.6" opacity="0.5" />
        <polygon points="62,50 62,68 75,48" fill="url(#d20-dark)" stroke="#2563a8" strokeWidth="0.6" opacity="0.5" />
        <polygon points="62,50 75,48 75,32" fill="url(#d20-dark)" stroke="#2563a8" strokeWidth="0.6" opacity="0.5" />

        {/* Front faces (visible) - proper icosahedron geometry */}
        {/* Top vertex faces (lightest - facing viewer and up) */}
        <polygon points="50,15 35,32 50,38" fill="url(#d20-top-highlight)" stroke="#4a9eff" strokeWidth="0.8" />
        <polygon points="50,15 50,38 65,32" fill="url(#d20-top-highlight)" stroke="#4a9eff" strokeWidth="0.8" />
        <polygon points="50,15 25,32 35,32" fill="url(#d20-light)" stroke="#4a9eff" strokeWidth="0.8" />
        <polygon points="50,15 65,32 75,32" fill="url(#d20-light)" stroke="#4a9eff" strokeWidth="0.8" />

        {/* Upper middle band (medium light) */}
        <polygon points="25,32 35,32 38,50" fill="url(#d20-light)" stroke="#3b7ed1" strokeWidth="0.7" />
        <polygon points="75,32 65,32 62,50" fill="url(#d20-light)" stroke="#3b7ed1" strokeWidth="0.7" />
        <polygon points="35,32 50,38 38,50" fill="url(#d20-medium)" stroke="#3b7ed1" strokeWidth="0.7" />
        <polygon points="65,32 50,38 62,50" fill="url(#d20-medium)" stroke="#3b7ed1" strokeWidth="0.7" />

        {/* Center faces (medium shading) */}
        <polygon points="38,50 50,38 50,62" fill="url(#d20-medium)" stroke="#3b7ed1" strokeWidth="0.7" />
        <polygon points="62,50 50,38 50,62" fill="url(#d20-medium)" stroke="#3b7ed1" strokeWidth="0.7" />

        {/* Lower middle band (darker) */}
        <polygon points="25,32 38,50 15,48" fill="url(#d20-dark)" stroke="#2d6bb3" strokeWidth="0.6" />
        <polygon points="75,32 62,50 75,48" fill="url(#d20-dark)" stroke="#2d6bb3" strokeWidth="0.6" />

        {/* Bottom front faces (darkest visible faces) */}
        <polygon points="38,50 50,62 28,68" fill="url(#d20-dark)" stroke="#2d6bb3" strokeWidth="0.6" />
        <polygon points="62,50 50,62 62,68" fill="url(#d20-dark)" stroke="#2d6bb3" strokeWidth="0.6" />
        <polygon points="50,62 28,68 62,68" fill="url(#d20-darker)" stroke="#2563a8" strokeWidth="0.5" />

        {/* Bottom vertex */}
        <polygon points="28,68 50,85 62,68" fill="url(#d20-darker)" stroke="#2563a8" strokeWidth="0.5" />

        {/* Edge highlights for definition */}
        <line x1="50" y1="15" x2="50" y2="38" stroke="#7ec3ff" strokeWidth="0.5" opacity="0.6" />
        <line x1="50" y1="38" x2="50" y2="62" stroke="#6bb3ff" strokeWidth="0.5" opacity="0.5" />
      </g>

      {/* "20" number on the front center face */}
      <text
        x="50"
        y="52"
        textAnchor="middle"
        fontSize="16"
        fontWeight="bold"
        fill="#ffffff"
        stroke="#1e4d7a"
        strokeWidth="0.5"
        style={{
          fontFamily: 'Arial, sans-serif',
          paintOrder: 'stroke fill',
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
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
