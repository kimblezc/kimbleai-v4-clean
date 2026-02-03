/**
 * D20 Icon Component
 *
 * Geometrically correct icosahedron (20-sided die)
 * WHITE wireframe with proper 3D structure
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
  // Golden ratio for icosahedron
  const phi = 1.618034;

  // 12 vertices of icosahedron (scaled and centered for SVG)
  const vertices = [
    [50, 15],      // Top vertex (front)
    [72, 28],      // Upper right front
    [82, 50],      // Right middle front
    [72, 72],      // Lower right front
    [50, 85],      // Bottom vertex (front)
    [28, 72],      // Lower left front
    [18, 50],      // Left middle front
    [28, 28],      // Upper left front
    [50, 8],       // Top vertex (back) - slightly higher
    [65, 35],      // Upper right back
    [65, 65],      // Lower right back
    [35, 35],      // Upper left back
  ];

  // Edges connecting vertices (30 edges total for icosahedron)
  const edges = [
    // Top pentagonal pyramid (front edges - brightest)
    [0, 1], [0, 7], [1, 2], [7, 6], [2, 3],
    // Bottom pentagonal pyramid (front edges - bright)
    [4, 3], [4, 5], [5, 6], [3, 4], [6, 5],
    // Middle ring (equator - medium)
    [1, 9], [2, 9], [3, 10], [5, 11], [6, 11], [7, 11],
    // Back edges (darker - furthest away)
    [8, 9], [8, 11], [9, 10], [10, 4], [11, 8],
    // Cross connections for 3D structure
    [1, 7], [2, 10], [9, 10], [6, 7],
  ];

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
        <defs>
          <filter id="glow-white">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Draw all edges with varying opacity for depth */}
        {edges.map((edge, i) => {
          const [v1, v2] = edge;
          const x1 = vertices[v1][0];
          const y1 = vertices[v1][1];
          const x2 = vertices[v2][0];
          const y2 = vertices[v2][1];

          // Calculate depth-based opacity
          // Front edges (indices 0-9) are brightest
          // Middle edges (10-19) are medium
          // Back edges (20-29) are darkest
          let opacity, strokeWidth, color;

          if (i < 10) {
            // Front edges - white, bright
            color = '#ffffff';
            opacity = 0.95;
            strokeWidth = 2;
          } else if (i < 20) {
            // Middle edges - light gray
            color = '#e5e7eb';
            opacity = 0.7;
            strokeWidth = 1.7;
          } else {
            // Back edges - medium gray, faint
            color = '#9ca3af';
            opacity = 0.4;
            strokeWidth = 1.3;
          }

          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={color}
              strokeWidth={strokeWidth}
              opacity={opacity}
              strokeLinecap="round"
            />
          );
        })}

        {/* Draw vertices as small dots for structure clarity */}
        {vertices.slice(0, 8).map((vertex, i) => {
          const [x, y] = vertex;
          // Front vertices are brighter
          const opacity = i < 5 ? 0.8 : 0.5;
          const radius = i < 5 ? 1.5 : 1;

          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={radius}
              fill="#ffffff"
              opacity={opacity}
            />
          );
        })}

        {/* Center point for reference */}
        <circle cx="50" cy="50" r="2" fill="#60a5fa" opacity="0.3" />
      </svg>
    </div>
  );
}
