'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

/**
 * KimbleAI D20 Logo Component
 *
 * A spinning 20-sided die (D20) that represents the KimbleAI brand.
 * Clicking it navigates back to the home page.
 */
export default function KimbleAILogo() {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push('/')}
      style={{
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 12px',
        borderRadius: '8px',
        transition: 'all 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(74, 158, 255, 0.1)';
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {/* D20 Die */}
      <div
        className="d20-container"
        style={{
          width: '40px',
          height: '40px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 100 100"
          style={{
            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
            animation: 'spin3d 20s linear infinite',
          }}
        >
          {/* D20 Icosahedron - Simplified geometric representation */}
          <defs>
            <linearGradient id="d20Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#4a9eff', stopOpacity: 1 }} />
              <stop offset="50%" style={{ stopColor: '#667eea', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#764ba2', stopOpacity: 1 }} />
            </linearGradient>
          </defs>

          {/* Main D20 shape - Stylized geometric pattern */}
          <g transform="translate(50, 50)">
            {/* Top pyramid */}
            <polygon
              points="0,-40 -20,-10 20,-10"
              fill="url(#d20Gradient)"
              stroke="#2d3748"
              strokeWidth="1.5"
              opacity="0.9"
            />

            {/* Middle band */}
            <polygon
              points="-20,-10 -35,10 0,20"
              fill="url(#d20Gradient)"
              stroke="#2d3748"
              strokeWidth="1.5"
              opacity="0.85"
            />
            <polygon
              points="20,-10 35,10 0,20"
              fill="url(#d20Gradient)"
              stroke="#2d3748"
              strokeWidth="1.5"
              opacity="0.8"
            />
            <polygon
              points="-20,-10 0,20 20,-10"
              fill="url(#d20Gradient)"
              stroke="#2d3748"
              strokeWidth="1.5"
              opacity="0.75"
            />

            {/* Bottom pyramid */}
            <polygon
              points="0,20 -35,10 -25,35"
              fill="url(#d20Gradient)"
              stroke="#2d3748"
              strokeWidth="1.5"
              opacity="0.7"
            />
            <polygon
              points="0,20 35,10 25,35"
              fill="url(#d20Gradient)"
              stroke="#2d3748"
              strokeWidth="1.5"
              opacity="0.65"
            />
            <polygon
              points="0,20 -25,35 0,40"
              fill="url(#d20Gradient)"
              stroke="#2d3748"
              strokeWidth="1.5"
              opacity="0.6"
            />
            <polygon
              points="0,20 25,35 0,40"
              fill="url(#d20Gradient)"
              stroke="#2d3748"
              strokeWidth="1.5"
              opacity="0.55"
            />

            {/* Number "20" in the center */}
            <text
              x="0"
              y="8"
              textAnchor="middle"
              fill="white"
              fontSize="20"
              fontWeight="bold"
              fontFamily="monospace"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
            >
              20
            </text>
          </g>
        </svg>
      </div>

      {/* KimbleAI Text */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
        <span
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #4a9eff 0%, #667eea 50%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '0.5px',
          }}
        >
          KimbleAI
        </span>
        <span
          style={{
            fontSize: '10px',
            color: '#888',
            fontWeight: '500',
            letterSpacing: '1px',
          }}
        >
          ROLL FOR INSIGHT
        </span>
      </div>

      <style jsx>{`
        @keyframes spin3d {
          0% {
            transform: rotateY(0deg) rotateX(0deg);
          }
          25% {
            transform: rotateY(90deg) rotateX(45deg);
          }
          50% {
            transform: rotateY(180deg) rotateX(90deg);
          }
          75% {
            transform: rotateY(270deg) rotateX(135deg);
          }
          100% {
            transform: rotateY(360deg) rotateX(180deg);
          }
        }

        .d20-container:hover svg {
          animation: spin3d 2s linear infinite !important;
        }
      `}</style>
    </div>
  );
}
