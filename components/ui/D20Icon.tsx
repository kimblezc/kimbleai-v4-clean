/**
 * D20 Icon Component
 *
 * Animated D20 dice with optional rotation
 */

'use client';

import { HTMLAttributes } from 'react';

interface D20IconProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  rotate?: boolean;
  glow?: boolean;
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

export default function D20Icon({
  size = 'md',
  rotate = true,
  glow = false,
  className = '',
  ...props
}: D20IconProps) {
  return (
    <div
      className={`${sizeClasses[size]} ${rotate ? 'rotate-d20-slow' : ''} ${glow ? 'pulse-glow' : ''} ${className}`}
      {...props}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* D20 Shape */}
        <defs>
          <linearGradient id="d20-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Main D20 polygon */}
        <path
          d="M50 5 L90 35 L80 75 L50 95 L20 75 L10 35 Z"
          fill="url(#d20-gradient)"
          stroke="#a855f7"
          strokeWidth="2"
          opacity="0.9"
          filter={glow ? "url(#glow)" : undefined}
        />

        {/* Inner facets for 3D effect */}
        <path
          d="M50 5 L65 30 L50 50 L35 30 Z"
          fill="#9333ea"
          opacity="0.6"
        />
        <path
          d="M50 50 L65 30 L80 55 Z"
          fill="#7e22ce"
          opacity="0.7"
        />
        <path
          d="M50 50 L35 30 L20 55 Z"
          fill="#7e22ce"
          opacity="0.7"
        />
        <path
          d="M50 50 L80 55 L65 75 Z"
          fill="#6b21a8"
          opacity="0.8"
        />
        <path
          d="M50 50 L20 55 L35 75 Z"
          fill="#6b21a8"
          opacity="0.8"
        />
        <path
          d="M50 50 L50 95 L65 75 Z"
          fill="#581c87"
          opacity="0.9"
        />
        <path
          d="M50 50 L50 95 L35 75 Z"
          fill="#581c87"
          opacity="0.9"
        />

        {/* "20" text in the center */}
        <text
          x="50"
          y="55"
          fontSize="20"
          fontWeight="bold"
          fill="#fbbf24"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ textShadow: '0 0 10px rgba(251, 191, 36, 0.8)' }}
        >
          20
        </text>

        {/* Highlight for shine effect */}
        <ellipse
          cx="40"
          cy="25"
          rx="15"
          ry="8"
          fill="white"
          opacity="0.2"
        />
      </svg>
    </div>
  );
}
