import React, { useMemo } from 'react';
import { getDetailLevel } from './utils.js';

/**
 * SVG Background Component - Cherry blossom scene
 * Can be rendered independently for testing
 */
function SVGBackground({
  detailLevel = 10,
  showBackground = true,
  viewBoxHeight = 600, // For different aspect ratios
}) {
  const details = getDetailLevel(detailLevel, 'background');

  // Generate random but consistent petals
  const petals = useMemo(() => {
    if (!details.hasPetals) {
      return [];
    }
    const count = Math.min(20, details.shapes);
    return [...Array(count)].map((_, i) => ({
      x: 30 + ((i * 19) % 360),
      y: 50 + ((i * 37) % (viewBoxHeight - 200)),
      rotation: i * 30,
      opacity: 0.6 + (i % 4) * 0.1,
    }));
  }, [details.hasPetals, details.shapes, viewBoxHeight]);

  // Generate cityscape buildings
  const buildings = useMemo(() => {
    if (!details.hasCity) {
      return [];
    }
    return [...Array(12)].map((_, i) => ({
      x: i * 35 + Math.floor(i * 0.5),
      y: viewBoxHeight - 120 + (i % 3) * 15,
      width: 20 + (i % 3) * 5,
      height: 100 - (i % 4) * 15,
      opacity: 0.3 + (i % 3) * 0.1,
    }));
  }, [details.hasCity, viewBoxHeight]);

  if (!showBackground || details.shapes === 0) {
    return null;
  }

  return (
    <g className="background-layer">
      {/* Gradient definitions */}
      <defs>
        <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5bb5e8" />
          <stop offset="40%" stopColor="#87ceeb" />
          <stop offset="100%" stopColor="#b8e4f9" />
        </linearGradient>
        <radialGradient id="cherryBlossomGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd4e0" />
          <stop offset="50%" stopColor="#ffb7c5" />
          <stop offset="100%" stopColor="#ffa0b4" />
        </radialGradient>
        <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Sky */}
      <rect
        x="0"
        y="0"
        width="400"
        height={viewBoxHeight}
        fill="url(#skyGradient)"
      />

      {/* Clouds */}
      {details.hasClouds && (
        <g className="clouds" opacity="0.7">
          <ellipse cx="80" cy="60" rx="50" ry="25" fill="white" />
          <ellipse cx="60" cy="70" rx="30" ry="18" fill="white" />
          <ellipse cx="100" cy="65" rx="35" ry="20" fill="white" />

          <ellipse cx="320" cy="100" rx="45" ry="22" fill="white" />
          <ellipse cx="300" cy="108" rx="28" ry="16" fill="white" />
          <ellipse cx="340" cy="105" rx="32" ry="18" fill="white" />
        </g>
      )}

      {/* Distant cityscape */}
      {details.hasCity && (
        <g className="cityscape" opacity="0.3">
          <rect
            x="0"
            y={viewBoxHeight - 120}
            width="400"
            height="120"
            fill="#c8d4e0"
          />
          {buildings.map((building, i) => (
            <rect
              key={i}
              x={building.x}
              y={building.y}
              width={building.width}
              height={building.height}
              fill={`rgba(180, 190, 200, ${building.opacity})`}
            />
          ))}
        </g>
      )}

      {/* Power lines */}
      {details.hasPowerLines && (
        <g
          className="power-lines"
          stroke="#555"
          strokeWidth="0.5"
          opacity="0.3"
        >
          <line x1="50" y1="0" x2="50" y2="350" />
          <line x1="48" y1="100" x2="100" y2="102" />
          <line x1="48" y1="150" x2="150" y2="152" />
          <line x1="0" y1="80" x2="400" y2="85" />
        </g>
      )}

      {/* Bridge/fence in middle ground */}
      {details.hasFence && (
        <g className="fence">
          <rect
            x="0"
            y={viewBoxHeight - 80}
            width="400"
            height="8"
            fill="#e8ddd0"
          />
          <rect
            x="0"
            y={viewBoxHeight - 72}
            width="400"
            height="72"
            fill="#d4c8b8"
            opacity="0.4"
          />
          {/* Fence posts */}
          {[...Array(10)].map((_, i) => (
            <g key={i}>
              <rect
                x={i * 45 + 10}
                y={viewBoxHeight - 110}
                width="4"
                height="40"
                fill="#b8a898"
              />
              <rect
                x={i * 45 + 8}
                y={viewBoxHeight - 95}
                width="8"
                height="3"
                fill="#c8b8a8"
              />
            </g>
          ))}
          {/* Horizontal rails */}
          <rect
            x="0"
            y={viewBoxHeight - 100}
            width="400"
            height="3"
            fill="#c8b8a8"
          />
          <rect
            x="0"
            y={viewBoxHeight - 85}
            width="400"
            height="3"
            fill="#c8b8a8"
          />
        </g>
      )}

      {/* Cherry blossom trees - left */}
      {details.hasTrees && (
        <g className="cherry-tree-left">
          {/* Tree trunk */}
          <path
            d={`M 40 ${viewBoxHeight} Q 35 ${viewBoxHeight - 100}, 50 ${viewBoxHeight - 200} Q 55 ${viewBoxHeight - 250}, 45 ${viewBoxHeight - 300}`}
            stroke="#5c4033"
            strokeWidth="15"
            fill="none"
          />
          <path
            d={`M 45 ${viewBoxHeight - 250} Q 20 ${viewBoxHeight - 300}, 10 ${viewBoxHeight - 350}`}
            stroke="#5c4033"
            strokeWidth="8"
            fill="none"
          />
          <path
            d={`M 50 ${viewBoxHeight - 280} Q 80 ${viewBoxHeight - 320}, 90 ${viewBoxHeight - 380}`}
            stroke="#5c4033"
            strokeWidth="6"
            fill="none"
          />

          {/* Blossom clusters - multiple layers */}
          {[
            { cx: 30, cy: viewBoxHeight - 420, r: 60 },
            { cx: -10, cy: viewBoxHeight - 380, r: 50 },
            { cx: 70, cy: viewBoxHeight - 450, r: 55 },
            { cx: 50, cy: viewBoxHeight - 500, r: 45 },
            { cx: 90, cy: viewBoxHeight - 400, r: 40 },
            { cx: 10, cy: viewBoxHeight - 470, r: 50 },
            { cx: 60, cy: viewBoxHeight - 350, r: 35 },
          ].map((cluster, i) => (
            <g key={i}>
              <ellipse
                cx={cluster.cx}
                cy={cluster.cy}
                rx={cluster.r}
                ry={cluster.r * 0.8}
                fill="#ffb7c5"
                opacity={0.9 - i * 0.05}
              />
              <ellipse
                cx={cluster.cx + 10}
                cy={cluster.cy - 10}
                rx={cluster.r * 0.7}
                ry={cluster.r * 0.5}
                fill="#ffc8d4"
                opacity={0.7}
              />
            </g>
          ))}
        </g>
      )}

      {/* Cherry blossom trees - right */}
      {details.hasTrees && (
        <g className="cherry-tree-right">
          {/* Tree trunk */}
          <path
            d={`M 370 ${viewBoxHeight} Q 380 ${viewBoxHeight - 120}, 360 ${viewBoxHeight - 220} Q 350 ${viewBoxHeight - 280}, 370 ${viewBoxHeight - 340}`}
            stroke="#5c4033"
            strokeWidth="18"
            fill="none"
          />
          <path
            d={`M 360 ${viewBoxHeight - 250} Q 400 ${viewBoxHeight - 300}, 420 ${viewBoxHeight - 360}`}
            stroke="#5c4033"
            strokeWidth="10"
            fill="none"
          />
          <path
            d={`M 365 ${viewBoxHeight - 300} Q 330 ${viewBoxHeight - 340}, 320 ${viewBoxHeight - 400}`}
            stroke="#5c4033"
            strokeWidth="7"
            fill="none"
          />

          {/* Blossom clusters */}
          {[
            { cx: 380, cy: viewBoxHeight - 450, r: 70 },
            { cx: 420, cy: viewBoxHeight - 400, r: 60 },
            { cx: 340, cy: viewBoxHeight - 420, r: 55 },
            { cx: 360, cy: viewBoxHeight - 520, r: 50 },
            { cx: 400, cy: viewBoxHeight - 480, r: 45 },
            { cx: 320, cy: viewBoxHeight - 470, r: 40 },
            { cx: 390, cy: viewBoxHeight - 350, r: 45 },
          ].map((cluster, i) => (
            <g key={i}>
              <ellipse
                cx={cluster.cx}
                cy={cluster.cy}
                rx={cluster.r}
                ry={cluster.r * 0.85}
                fill="#ffb7c5"
                opacity={0.9 - i * 0.04}
              />
              <ellipse
                cx={cluster.cx - 15}
                cy={cluster.cy - 8}
                rx={cluster.r * 0.6}
                ry={cluster.r * 0.45}
                fill="#ffd0dc"
                opacity={0.6}
              />
            </g>
          ))}
        </g>
      )}

      {/* Falling petals */}
      {details.hasPetals && (
        <g className="falling-petals">
          {petals.map((petal, i) => (
            <g key={i} className={`petal petal-${i % 12}`}>
              <ellipse
                cx={petal.x}
                cy={petal.y}
                rx="5"
                ry="3"
                fill="#ffb7c5"
                opacity={petal.opacity}
                transform={`rotate(${petal.rotation}, ${petal.x}, ${petal.y})`}
              />
            </g>
          ))}
        </g>
      )}
    </g>
  );
}

export default SVGBackground;
