'use client';

import React from 'react';

interface D20DiceProps {
  size?: number;
  className?: string;
  spinning?: boolean;
}

export default function D20Dice({ size = 64, className = '', spinning = true }: D20DiceProps) {
  return (
    <div className={`inline-block ${className}`} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        className={spinning ? 'animate-spin-slow' : ''}
        style={{
          filter: 'drop-shadow(0 0 8px rgba(74, 158, 255, 0.5))',
        }}
      >
        {/* D20 Icosahedron wireframe */}
        <g stroke="#4a9eff" strokeWidth="1.5" fill="none">
          {/* Top pyramid faces */}
          <path d="M50,10 L30,30 L70,30 Z" fill="rgba(74, 158, 255, 0.1)" />
          <path d="M50,10 L30,30 L20,50" />
          <path d="M50,10 L70,30 L80,50" />

          {/* Middle band */}
          <path d="M20,50 L30,30 L50,40 Z" fill="rgba(74, 158, 255, 0.05)" />
          <path d="M30,30 L70,30 L50,40 Z" fill="rgba(74, 158, 255, 0.08)" />
          <path d="M70,30 L80,50 L50,40 Z" fill="rgba(74, 158, 255, 0.05)" />
          <path d="M80,50 L70,70 L50,60 Z" fill="rgba(74, 158, 255, 0.05)" />
          <path d="M70,70 L30,70 L50,60 Z" fill="rgba(74, 158, 255, 0.08)" />
          <path d="M30,70 L20,50 L50,60 Z" fill="rgba(74, 158, 255, 0.05)" />

          {/* Connect middle band */}
          <path d="M20,50 L50,40 L50,60" />
          <path d="M50,40 L80,50 L50,60" />

          {/* Bottom pyramid faces */}
          <path d="M50,90 L30,70 L70,70 Z" fill="rgba(74, 158, 255, 0.1)" />
          <path d="M50,90 L30,70 L20,50" />
          <path d="M50,90 L70,70 L80,50" />

          {/* Vertical edges */}
          <path d="M30,30 L30,70" />
          <path d="M70,30 L70,70" />
        </g>

        {/* "20" in the center */}
        <text
          x="50"
          y="55"
          textAnchor="middle"
          fontSize="20"
          fontWeight="bold"
          fill="#4a9eff"
          className="font-mono"
        >
          20
        </text>
      </svg>

      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
