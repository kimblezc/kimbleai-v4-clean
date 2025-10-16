'use client';

import React from 'react';

interface D20DiceProps {
  size?: number;
  className?: string;
  spinning?: boolean;
}

export default function D20Dice({ size = 64, className = '', spinning = true }: D20DiceProps) {
  const [rotationX, setRotationX] = React.useState(15);
  const [rotationY, setRotationY] = React.useState(25);
  const [rotationZ, setRotationZ] = React.useState(10);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    if (!spinning || !isMounted) return;

    let animationFrameId: number;
    let startTime = Date.now();

    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000; // seconds
      const speed = 0.3; // rotation speed

      // Smooth, continuous 3D rotation
      setRotationX((elapsed * 30 * speed) % 360);
      setRotationY((elapsed * 40 * speed) % 360);
      setRotationZ((elapsed * 20 * speed) % 360);

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [spinning, isMounted]);

  // Mathematically correct icosahedron using golden ratio
  const renderD20 = () => {
    // Golden ratio for perfect icosahedron proportions
    const φ = 1.618033988749895;

    // Scale and center for viewBox 0 0 200 200
    const scale = 35;
    const centerX = 100;
    const centerY = 100;

    // 12 vertices of a regular icosahedron (normalized coordinates)
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

    // 3D rotation functions
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

    // Apply rotation to all vertices
    const vertices = rawVertices.map(v => {
      let rotated = rotateX(v, rotationX);
      rotated = rotateY(rotated, rotationY);
      rotated = rotateZ(rotated, rotationZ);
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

    // Calculate face data for rendering
    const faceData = faces.map(face => {
      const v1 = vertices[face[0]];
      const v2 = vertices[face[1]];
      const v3 = vertices[face[2]];

      // Center of face
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

    // Sort ALL faces by depth (back to front) - NO backface culling for transparency
    const sortedFaces = faceData
      .sort((a, b) => a.depth - b.depth);

    // Find opposite faces for numbers (1 and 20)
    // Face 0 is front top, Face 15 is back bottom (opposite sides of icosahedron)
    const face20Index = 0;  // Front face
    const face1Index = 15;  // Back face (opposite)

    const face20Center = faceData[face20Index].center;
    const face1Center = faceData[face1Index].center;

    // Project centers for number placement
    const num20X = centerX + face20Center[0] * scale - face20Center[2] * scale * 0.5;
    const num20Y = centerY - face20Center[1] * scale - face20Center[2] * scale * 0.3;
    const num1X = centerX + face1Center[0] * scale - face1Center[2] * scale * 0.5;
    const num1Y = centerY - face1Center[1] * scale - face1Center[2] * scale * 0.3;

    return (
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        {/* Render ALL faces as wireframe - transparent so you see front AND back */}
        {sortedFaces.map((faceData, index) => {
          const face = faceData.face;
          const p1 = projectedVertices[face[0]];
          const p2 = projectedVertices[face[1]];
          const p3 = projectedVertices[face[2]];

          return (
            <g key={index}>
              {/* White edges with thick lines */}
              <line
                x1={p1[0]} y1={p1[1]}
                x2={p2[0]} y2={p2[1]}
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <line
                x1={p2[0]} y1={p2[1]}
                x2={p3[0]} y2={p3[1]}
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <line
                x1={p3[0]} y1={p3[1]}
                x2={p1[0]} y2={p1[1]}
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </g>
          );
        })}

        {/* Number "20" on front face */}
        <text
          x={num20X}
          y={num20Y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="24"
          fontWeight="900"
          fill="#ffffff"
          stroke="#000000"
          strokeWidth="1"
          style={{
            fontFamily: 'Arial Black, Arial, sans-serif',
            paintOrder: 'stroke fill'
          }}
        >
          20
        </text>

        {/* Number "1" on back face (opposite) */}
        <text
          x={num1X}
          y={num1Y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="24"
          fontWeight="900"
          fill="#ffffff"
          stroke="#000000"
          strokeWidth="1"
          style={{
            fontFamily: 'Arial Black, Arial, sans-serif',
            paintOrder: 'stroke fill'
          }}
        >
          1
        </text>
      </svg>
    );
  };

  if (!isMounted) {
    // Show static D20 placeholder during SSR
    return (
      <div style={{ width: size, height: size }} className={`inline-block ${className}`}>
        {renderD20()}
      </div>
    );
  }

  return (
    <div
      className={`inline-block ${className}`}
      style={{
        width: size,
        height: size
      }}
    >
      {renderD20()}
    </div>
  );
}
