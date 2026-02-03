/**
 * D20 Icon Component
 *
 * Full 3D Icosahedron wireframe (20-sided die)
 * Proper geometric projection with all 30 edges
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
        {/* Full 3D Icosahedron - All 30 Edges */}
        <defs>
          <filter id="glow-blue">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Top Vertex to Upper Pentagon */}
        <line x1="50" y1="5" x2="25" y2="22" stroke="#3b82f6" strokeWidth="1.8" opacity="0.9" />
        <line x1="50" y1="5" x2="75" y2="22" stroke="#3b82f6" strokeWidth="1.8" opacity="0.9" />
        <line x1="50" y1="5" x2="15" y2="35" stroke="#3b82f6" strokeWidth="1.8" opacity="0.7" />
        <line x1="50" y1="5" x2="85" y2="35" stroke="#3b82f6" strokeWidth="1.8" opacity="0.7" />
        <line x1="50" y1="5" x2="50" y2="25" stroke="#60a5fa" strokeWidth="1.8" opacity="0.8" />

        {/* Upper Pentagon Ring */}
        <line x1="25" y1="22" x2="75" y2="22" stroke="#3b82f6" strokeWidth="1.8" opacity="0.85" />
        <line x1="25" y1="22" x2="15" y2="35" stroke="#3b82f6" strokeWidth="1.8" opacity="0.85" />
        <line x1="75" y1="22" x2="85" y2="35" stroke="#3b82f6" strokeWidth="1.8" opacity="0.85" />
        <line x1="15" y1="35" x2="10" y2="50" stroke="#3b82f6" strokeWidth="1.8" opacity="0.75" />
        <line x1="85" y1="35" x2="90" y2="50" stroke="#3b82f6" strokeWidth="1.8" opacity="0.75" />

        {/* Middle Equator */}
        <line x1="10" y1="50" x2="30" y2="48" stroke="#60a5fa" strokeWidth="1.8" opacity="0.9" />
        <line x1="30" y1="48" x2="50" y2="40" stroke="#60a5fa" strokeWidth="1.8" opacity="0.9" />
        <line x1="50" y1="40" x2="70" y2="48" stroke="#60a5fa" strokeWidth="1.8" opacity="0.9" />
        <line x1="70" y1="48" x2="90" y2="50" stroke="#60a5fa" strokeWidth="1.8" opacity="0.9" />
        <line x1="90" y1="50" x2="70" y2="52" stroke="#3b82f6" strokeWidth="1.8" opacity="0.75" />
        <line x1="70" y1="52" x2="50" y2="60" stroke="#3b82f6" strokeWidth="1.8" opacity="0.85" />
        <line x1="50" y1="60" x2="30" y2="52" stroke="#3b82f6" strokeWidth="1.8" opacity="0.85" />
        <line x1="30" y1="52" x2="10" y2="50" stroke="#3b82f6" strokeWidth="1.8" opacity="0.75" />

        {/* Cross connections through center */}
        <line x1="25" y1="22" x2="30" y2="48" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />
        <line x1="75" y1="22" x2="70" y2="48" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />
        <line x1="15" y1="35" x2="30" y2="48" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />
        <line x1="85" y1="35" x2="70" y2="48" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />
        <line x1="25" y1="78" x2="30" y2="52" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />
        <line x1="75" y1="78" x2="70" y2="52" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />
        <line x1="15" y1="65" x2="30" y2="52" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />
        <line x1="85" y1="65" x2="70" y2="52" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />

        {/* Lower Pentagon Ring */}
        <line x1="10" y1="50" x2="15" y2="65" stroke="#3b82f6" strokeWidth="1.8" opacity="0.75" />
        <line x1="90" y1="50" x2="85" y2="65" stroke="#3b82f6" strokeWidth="1.8" opacity="0.75" />
        <line x1="15" y1="65" x2="25" y2="78" stroke="#3b82f6" strokeWidth="1.8" opacity="0.85" />
        <line x1="85" y1="65" x2="75" y2="78" stroke="#3b82f6" strokeWidth="1.8" opacity="0.85" />
        <line x1="25" y1="78" x2="75" y2="78" stroke="#3b82f6" strokeWidth="1.8" opacity="0.85" />

        {/* Bottom Vertex from Lower Pentagon */}
        <line x1="50" y1="95" x2="25" y2="78" stroke="#3b82f6" strokeWidth="1.8" opacity="0.9" />
        <line x1="50" y1="95" x2="75" y2="78" stroke="#3b82f6" strokeWidth="1.8" opacity="0.9" />
        <line x1="50" y1="95" x2="15" y2="65" stroke="#3b82f6" strokeWidth="1.8" opacity="0.7" />
        <line x1="50" y1="95" x2="85" y2="65" stroke="#3b82f6" strokeWidth="1.8" opacity="0.7" />
        <line x1="50" y1="95" x2="50" y2="75" stroke="#60a5fa" strokeWidth="1.8" opacity="0.8" />

        {/* Center sphere for depth */}
        <circle cx="50" cy="50" r="3" fill="#60a5fa" opacity="0.4" />
        <circle cx="50" cy="50" r="1.5" fill="#3b82f6" opacity="0.8" />
      </svg>
    </div>
  );
}
