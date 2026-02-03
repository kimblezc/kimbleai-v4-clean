/**
 * D20 Icon Component
 *
 * Full 3D Icosahedron wireframe (20-sided die)
 * WHITE wireframe with depth perception
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
        {/* 3D Icosahedron - WHITE wireframe with depth */}
        <defs>
          <filter id="glow-white">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* BACK EDGES (darkest - furthest away) */}
        <line x1="50" y1="95" x2="15" y2="65" stroke="#6b7280" strokeWidth="1.2" opacity="0.3" />
        <line x1="50" y1="95" x2="85" y2="65" stroke="#6b7280" strokeWidth="1.2" opacity="0.3" />
        <line x1="15" y1="65" x2="25" y2="78" stroke="#6b7280" strokeWidth="1.2" opacity="0.3" />
        <line x1="85" y1="65" x2="75" y2="78" stroke="#6b7280" strokeWidth="1.2" opacity="0.3" />
        <line x1="10" y1="50" x2="15" y2="65" stroke="#6b7280" strokeWidth="1.2" opacity="0.3" />
        <line x1="90" y1="50" x2="85" y2="65" stroke="#6b7280" strokeWidth="1.2" opacity="0.3" />

        {/* MIDDLE EDGES (medium depth) */}
        <line x1="50" y1="5" x2="15" y2="35" stroke="#9ca3af" strokeWidth="1.5" opacity="0.5" />
        <line x1="50" y1="5" x2="85" y2="35" stroke="#9ca3af" strokeWidth="1.5" opacity="0.5" />
        <line x1="15" y1="35" x2="10" y2="50" stroke="#9ca3af" strokeWidth="1.5" opacity="0.5" />
        <line x1="85" y1="35" x2="90" y2="50" stroke="#9ca3af" strokeWidth="1.5" opacity="0.5" />
        <line x1="25" y1="22" x2="15" y2="35" stroke="#9ca3af" strokeWidth="1.5" opacity="0.5" />
        <line x1="75" y1="22" x2="85" y2="35" stroke="#9ca3af" strokeWidth="1.5" opacity="0.5" />

        {/* Cross connections (inner structure) */}
        <line x1="25" y1="22" x2="30" y2="48" stroke="#d1d5db" strokeWidth="1.3" opacity="0.4" />
        <line x1="75" y1="22" x2="70" y2="48" stroke="#d1d5db" strokeWidth="1.3" opacity="0.4" />
        <line x1="15" y1="35" x2="30" y2="48" stroke="#d1d5db" strokeWidth="1.3" opacity="0.4" />
        <line x1="85" y1="35" x2="70" y2="48" stroke="#d1d5db" strokeWidth="1.3" opacity="0.4" />
        <line x1="25" y1="78" x2="30" y2="52" stroke="#d1d5db" strokeWidth="1.3" opacity="0.4" />
        <line x1="75" y1="78" x2="70" y2="52" stroke="#d1d5db" strokeWidth="1.3" opacity="0.4" />
        <line x1="15" y1="65" x2="30" y2="52" stroke="#d1d5db" strokeWidth="1.3" opacity="0.4" />
        <line x1="85" y1="65" x2="70" y2="52" stroke="#d1d5db" strokeWidth="1.3" opacity="0.4" />

        {/* EQUATOR (middle ring - medium bright) */}
        <line x1="10" y1="50" x2="30" y2="48" stroke="#e5e7eb" strokeWidth="1.7" opacity="0.7" />
        <line x1="30" y1="48" x2="50" y2="40" stroke="#e5e7eb" strokeWidth="1.7" opacity="0.7" />
        <line x1="50" y1="40" x2="70" y2="48" stroke="#e5e7eb" strokeWidth="1.7" opacity="0.7" />
        <line x1="70" y1="48" x2="90" y2="50" stroke="#e5e7eb" strokeWidth="1.7" opacity="0.7" />
        <line x1="90" y1="50" x2="70" y2="52" stroke="#e5e7eb" strokeWidth="1.7" opacity="0.7" />
        <line x1="70" y1="52" x2="50" y2="60" stroke="#e5e7eb" strokeWidth="1.7" opacity="0.7" />
        <line x1="50" y1="60" x2="30" y2="52" stroke="#e5e7eb" strokeWidth="1.7" opacity="0.7" />
        <line x1="30" y1="52" x2="10" y2="50" stroke="#e5e7eb" strokeWidth="1.7" opacity="0.7" />

        {/* Lower Pentagon */}
        <line x1="25" y1="78" x2="75" y2="78" stroke="#e5e7eb" strokeWidth="1.8" opacity="0.75" />
        <line x1="50" y1="95" x2="25" y2="78" stroke="#f3f4f6" strokeWidth="1.9" opacity="0.8" />
        <line x1="50" y1="95" x2="75" y2="78" stroke="#f3f4f6" strokeWidth="1.9" opacity="0.8" />
        <line x1="50" y1="95" x2="50" y2="75" stroke="#f9fafb" strokeWidth="1.9" opacity="0.85" />

        {/* FRONT EDGES (brightest - closest) */}
        <line x1="50" y1="5" x2="25" y2="22" stroke="#ffffff" strokeWidth="2" opacity="0.95" />
        <line x1="50" y1="5" x2="75" y2="22" stroke="#ffffff" strokeWidth="2" opacity="0.95" />
        <line x1="50" y1="5" x2="50" y2="25" stroke="#ffffff" strokeWidth="2" opacity="1" />
        <line x1="25" y1="22" x2="75" y2="22" stroke="#f9fafb" strokeWidth="1.9" opacity="0.9" />

        {/* Center sphere for depth */}
        <circle cx="50" cy="50" r="3.5" fill="#4b5563" opacity="0.3" />
        <circle cx="50" cy="50" r="2" fill="#9ca3af" opacity="0.6" />
        <circle cx="50" cy="50" r="1" fill="#ffffff" opacity="0.8" />
      </svg>
    </div>
  );
}
