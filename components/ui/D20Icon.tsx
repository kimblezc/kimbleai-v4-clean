/**
 * D20 Icon Component
 *
 * 3D wireframe D20 dice with rotation
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
        {/* 3D Wireframe D20 - Transparent with Blue Edges */}
        <defs>
          <filter id="glow-blue">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Top pyramid edges */}
        <line x1="50" y1="10" x2="25" y2="35" stroke="#3b82f6" strokeWidth="1.5" opacity="0.8" filter={glow ? "url(#glow-blue)" : undefined} />
        <line x1="50" y1="10" x2="75" y2="35" stroke="#3b82f6" strokeWidth="1.5" opacity="0.8" filter={glow ? "url(#glow-blue)" : undefined} />
        <line x1="50" y1="10" x2="15" y2="50" stroke="#3b82f6" strokeWidth="1.5" opacity="0.6" filter={glow ? "url(#glow-blue)" : undefined} />
        <line x1="50" y1="10" x2="85" y2="50" stroke="#3b82f6" strokeWidth="1.5" opacity="0.6" filter={glow ? "url(#glow-blue)" : undefined} />
        <line x1="50" y1="10" x2="50" y2="50" stroke="#60a5fa" strokeWidth="1.5" opacity="0.9" filter={glow ? "url(#glow-blue)" : undefined} />

        {/* Middle ring */}
        <line x1="25" y1="35" x2="75" y2="35" stroke="#3b82f6" strokeWidth="1.5" opacity="0.7" filter={glow ? "url(#glow-blue)" : undefined} />
        <line x1="25" y1="35" x2="15" y2="50" stroke="#3b82f6" strokeWidth="1.5" opacity="0.7" filter={glow ? "url(#glow-blue)" : undefined} />
        <line x1="75" y1="35" x2="85" y2="50" stroke="#3b82f6" strokeWidth="1.5" opacity="0.7" filter={glow ? "url(#glow-blue)" : undefined} />
        <line x1="15" y1="50" x2="85" y2="50" stroke="#60a5fa" strokeWidth="1.5" opacity="0.8" filter={glow ? "url(#glow-blue)" : undefined} />

        {/* Center to middle points */}
        <line x1="50" y1="50" x2="25" y2="35" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />
        <line x1="50" y1="50" x2="75" y2="35" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />
        <line x1="50" y1="50" x2="15" y2="50" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />
        <line x1="50" y1="50" x2="85" y2="50" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />

        {/* Bottom pyramid edges */}
        <line x1="50" y1="90" x2="25" y2="65" stroke="#3b82f6" strokeWidth="1.5" opacity="0.8" filter={glow ? "url(#glow-blue)" : undefined} />
        <line x1="50" y1="90" x2="75" y2="65" stroke="#3b82f6" strokeWidth="1.5" opacity="0.8" filter={glow ? "url(#glow-blue)" : undefined} />
        <line x1="50" y1="90" x2="15" y2="50" stroke="#3b82f6" strokeWidth="1.5" opacity="0.6" filter={glow ? "url(#glow-blue)" : undefined} />
        <line x1="50" y1="90" x2="85" y2="50" stroke="#3b82f6" strokeWidth="1.5" opacity="0.6" filter={glow ? "url(#glow-blue)" : undefined} />
        <line x1="50" y1="90" x2="50" y2="50" stroke="#60a5fa" strokeWidth="1.5" opacity="0.9" filter={glow ? "url(#glow-blue)" : undefined} />

        {/* Lower ring */}
        <line x1="25" y1="65" x2="75" y2="65" stroke="#3b82f6" strokeWidth="1.5" opacity="0.7" filter={glow ? "url(#glow-blue)" : undefined} />
        <line x1="25" y1="65" x2="15" y2="50" stroke="#3b82f6" strokeWidth="1.5" opacity="0.7" filter={glow ? "url(#glow-blue)" : undefined} />
        <line x1="75" y1="65" x2="85" y2="50" stroke="#3b82f6" strokeWidth="1.5" opacity="0.7" filter={glow ? "url(#glow-blue)" : undefined} />

        {/* Center to bottom points */}
        <line x1="50" y1="50" x2="25" y2="65" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />
        <line x1="50" y1="50" x2="75" y2="65" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />

        {/* Center dot for 3D depth */}
        <circle cx="50" cy="50" r="2" fill="#60a5fa" opacity="0.8" />
      </svg>
    </div>
  );
}
