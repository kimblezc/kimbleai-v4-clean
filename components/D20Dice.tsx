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

  // Mathematically correct icosahedron using golden ratio
  const D20SVG = () => {
    // Golden ratio for perfect icosahedron proportions
    const φ = 1.618033988749895;

    // Scale and center for viewBox 0 0 200 200
    const scale = 35;
    const centerX = 100;
    const centerY = 100;

    // 12 vertices of a regular icosahedron (normalized coordinates)
    // These are the mathematically correct positions
    const rawVertices = [
      [0, 1, φ],   // 0
      [0, -1, φ],  // 1
      [0, 1, -φ],  // 2
      [0, -1, -φ], // 3
      [1, φ, 0],   // 4
      [-1, φ, 0],  // 5
      [1, -φ, 0],  // 6
      [-1, -φ, 0], // 7
      [φ, 0, 1],   // 8
      [-φ, 0, 1],  // 9
      [φ, 0, -1],  // 10
      [-φ, 0, -1]  // 11
    ];

    // Rotation for optimal viewing angle (showing multiple faces clearly)
    const rotateX = (v: number[], angle: number) => {
      const rad = angle * Math.PI / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return [v[0], v[1] * cos - v[2] * sin, v[1] * sin + v[2] * cos];
    };

    const rotateY = (v: number[], angle: number) => {
      const rad = angle * Math.PI / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return [v[0] * cos + v[2] * sin, v[1], -v[0] * sin + v[2] * cos];
    };

    const rotateZ = (v: number[], angle: number) => {
      const rad = angle * Math.PI / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return [v[0] * cos - v[1] * sin, v[0] * sin + v[1] * cos, v[2]];
    };

    // Apply rotation to show the die from a good angle
    const vertices = rawVertices.map(v => {
      let rotated = rotateX(v, 15);
      rotated = rotateY(rotated, 25);
      rotated = rotateZ(rotated, 10);
      return rotated;
    });

    // Project 3D vertices to 2D (isometric-style projection)
    const project = (v: number[]) => {
      const x = centerX + v[0] * scale - v[2] * scale * 0.5;
      const y = centerY - v[1] * scale - v[2] * scale * 0.3;
      return [x, y, v[2]]; // Keep z for depth sorting
    };

    const projectedVertices = vertices.map(project);

    // All 20 triangular faces of the icosahedron
    const faces = [
      [0, 1, 8],   [0, 8, 4],   [0, 4, 5],   [0, 5, 9],   [0, 9, 1],
      [1, 6, 8],   [8, 6, 10],  [8, 10, 4],  [4, 10, 2],  [4, 2, 5],
      [5, 2, 11],  [5, 11, 9],  [9, 11, 7],  [9, 7, 1],   [1, 7, 6],
      [3, 2, 10],  [3, 10, 6],  [3, 6, 7],   [3, 7, 11],  [3, 11, 2]
    ];

    // Calculate face centers and normals for depth sorting and shading
    const faceData = faces.map(face => {
      const v1 = vertices[face[0]];
      const v2 = vertices[face[1]];
      const v3 = vertices[face[2]];

      // Center of face (average of vertices)
      const center = [
        (v1[0] + v2[0] + v3[0]) / 3,
        (v1[1] + v2[1] + v3[1]) / 3,
        (v1[2] + v2[2] + v3[2]) / 3
      ];

      // Calculate normal vector for lighting
      const edge1 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
      const edge2 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];

      // Cross product for normal
      const normal = [
        edge1[1] * edge2[2] - edge1[2] * edge2[1],
        edge1[2] * edge2[0] - edge1[0] * edge2[2],
        edge1[0] * edge2[1] - edge1[1] * edge2[0]
      ];

      // Normalize
      const length = Math.sqrt(normal[0]**2 + normal[1]**2 + normal[2]**2);
      const normalized = [normal[0]/length, normal[1]/length, normal[2]/length];

      // Light direction (from top-front-left)
      const light = [0.3, 0.5, 1];
      const lightLength = Math.sqrt(light[0]**2 + light[1]**2 + light[2]**2);
      const lightNorm = [light[0]/lightLength, light[1]/lightLength, light[2]/lightLength];

      // Dot product for lighting intensity
      const intensity = Math.max(0,
        normalized[0] * lightNorm[0] +
        normalized[1] * lightNorm[1] +
        normalized[2] * lightNorm[2]
      );

      return {
        face,
        center,
        depth: center[2], // Z-depth for sorting
        intensity,
        // Check if facing viewer (for backface culling)
        visible: normalized[2] > 0
      };
    });

    // Sort faces by depth (back to front) for proper rendering
    const sortedFaces = faceData
      .filter(f => f.visible)
      .sort((a, b) => a.depth - b.depth);

    // Generate color based on light intensity
    const getColor = (intensity: number) => {
      // Map intensity (0-1) to color gradient
      const colors = [
        { r: 30, g: 77, b: 122 },    // Darkest (away from light)
        { r: 37, g: 99, b: 168 },    // Dark
        { r: 74, g: 158, b: 255 },   // Medium
        { r: 94, g: 184, b: 255 },   // Bright
        { r: 143, g: 211, b: 255 }   // Brightest (facing light)
      ];

      const scaledIntensity = intensity * (colors.length - 1);
      const index = Math.floor(scaledIntensity);
      const fraction = scaledIntensity - index;

      const c1 = colors[Math.min(index, colors.length - 1)];
      const c2 = colors[Math.min(index + 1, colors.length - 1)];

      const r = Math.round(c1.r + (c2.r - c1.r) * fraction);
      const g = Math.round(c1.g + (c2.g - c1.g) * fraction);
      const b = Math.round(c1.b + (c2.b - c1.b) * fraction);

      return `rgb(${r}, ${g}, ${b})`;
    };

    // Find the brightest, most centered face for the "20" number
    const bestFaceForNumber = sortedFaces.reduce((best, current) => {
      const centerDistance = Math.sqrt(
        current.center[0]**2 +
        current.center[1]**2
      );
      const score = current.intensity - centerDistance * 0.1;
      const bestScore = best.intensity - Math.sqrt(best.center[0]**2 + best.center[1]**2) * 0.1;
      return score > bestScore ? current : best;
    }, sortedFaces[sortedFaces.length - 1]);

    // Calculate center of the best face for number placement
    const numberFace = bestFaceForNumber.face;
    const numberX = (
      projectedVertices[numberFace[0]][0] +
      projectedVertices[numberFace[1]][0] +
      projectedVertices[numberFace[2]][0]
    ) / 3;
    const numberY = (
      projectedVertices[numberFace[0]][1] +
      projectedVertices[numberFace[1]][1] +
      projectedVertices[numberFace[2]][1]
    ) / 3;

    return (
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <defs>
          <filter id="d20-shadow">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
            <feOffset dx="0" dy="3" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.4"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <filter id="d20-glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Ground shadow */}
        <ellipse
          cx="100"
          cy="165"
          rx="40"
          ry="12"
          fill="rgba(0,0,0,0.3)"
        />

        <g filter="url(#d20-shadow)">
          <g filter="url(#d20-glow)">
            {/* Render all visible faces */}
            {sortedFaces.map((faceData, index) => {
              const face = faceData.face;
              const p1 = projectedVertices[face[0]];
              const p2 = projectedVertices[face[1]];
              const p3 = projectedVertices[face[2]];

              const pathData = `M ${p1[0]},${p1[1]} L ${p2[0]},${p2[1]} L ${p3[0]},${p3[1]} Z`;
              const color = getColor(faceData.intensity);

              return (
                <path
                  key={index}
                  d={pathData}
                  fill={color}
                  stroke="#0d1f2f"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              );
            })}

            {/* Edge highlights on brightest faces for extra definition */}
            {sortedFaces.slice(-3).map((faceData, index) => {
              const face = faceData.face;
              const p1 = projectedVertices[face[0]];
              const p2 = projectedVertices[face[1]];
              const p3 = projectedVertices[face[2]];

              return (
                <g key={`edge-${index}`}>
                  <line
                    x1={p1[0]} y1={p1[1]}
                    x2={p2[0]} y2={p2[1]}
                    stroke="rgba(165, 216, 255, 0.4)"
                    strokeWidth="1"
                  />
                  <line
                    x1={p2[0]} y1={p2[1]}
                    x2={p3[0]} y2={p3[1]}
                    stroke="rgba(165, 216, 255, 0.4)"
                    strokeWidth="1"
                  />
                  <line
                    x1={p3[0]} y1={p3[1]}
                    x2={p1[0]} y2={p1[1]}
                    stroke="rgba(165, 216, 255, 0.4)"
                    strokeWidth="1"
                  />
                </g>
              );
            })}
          </g>
        </g>

        {/* "20" number on the brightest, most visible face */}
        <text
          x={numberX}
          y={numberY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="28"
          fontWeight="900"
          fill="#ffffff"
          stroke="#0d1f2f"
          strokeWidth="2"
          style={{
            fontFamily: 'Arial Black, Arial, sans-serif',
            paintOrder: 'stroke fill',
            letterSpacing: '-1px'
          }}
        >
          20
        </text>

        {/* Text shadow for depth */}
        <text
          x={numberX + 1}
          y={numberY + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="28"
          fontWeight="900"
          fill="rgba(0,0,0,0.4)"
          style={{
            fontFamily: 'Arial Black, Arial, sans-serif',
            letterSpacing: '-1px'
          }}
        >
          20
        </text>
      </svg>
    );
  };

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
