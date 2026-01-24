import React from 'react';
import { adjustColor, getDetailLevel, DEFAULT_CONFIG } from './utils.js';

/**
 * SVG Eyes Component - Anime-style detailed eyes
 * Can be rendered independently for testing
 */
function SVGEyes({
  config = {},
  isBlinking = false,
  detailLevel = 10,
  position = { x: 200, y: 245 }, // Center position for the eyes group
}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const { eyeColor, skinColor } = mergedConfig;
  const details = getDetailLevel(detailLevel, 'eyes');

  // Derived colors
  const eyeHighlight = adjustColor(eyeColor, 35);
  const eyeShadow = adjustColor(eyeColor, -30);
  const skinShadow = adjustColor(skinColor, -40);

  // Eye spacing and size based on detail level
  const eyeSpacing = 40; // Distance between eye centers
  const eyeWidth = details.shapes >= 10 ? 24 : details.shapes >= 6 ? 20 : 16;
  const eyeHeight = details.shapes >= 10 ? 30 : details.shapes >= 6 ? 25 : 20;

  if (details.shapes === 0) {
    return null;
  }

  const renderEye = (side, xOffset) => {
    const eyeX = position.x + xOffset;
    const eyeY = position.y;
    const irisOffset = side === 'left' ? 2 : -2;

    return (
      <g key={side} className={`${side}-eye`}>
        {/* Upper eyelid crease - only at higher detail */}
        {details.hasEyelashes && (
          <path
            d={`M ${eyeX - eyeWidth - 2} ${eyeY - eyeHeight + 12} Q ${eyeX} ${eyeY - eyeHeight}, ${eyeX + eyeWidth + 2} ${eyeY - eyeHeight + 12}`}
            stroke={skinShadow}
            strokeWidth="1.5"
            fill="none"
            opacity="0.4"
          />
        )}

        {/* Eye white */}
        <ellipse
          cx={eyeX}
          cy={eyeY}
          rx={eyeWidth}
          ry={eyeHeight}
          fill="white"
        />

        {/* Eye shadow on white - adds depth */}
        {details.hasHighlights && (
          <ellipse
            cx={eyeX}
            cy={eyeY - 10}
            rx={eyeWidth - 2}
            ry={15}
            fill="#e8e8f0"
            opacity="0.5"
          />
        )}

        {/* Iris outer */}
        <ellipse
          cx={eyeX + irisOffset}
          cy={eyeY + 5}
          rx={eyeWidth * 0.75}
          ry={eyeHeight * 0.73}
          fill={`url(#eyeRadial-${side})`}
        />

        {/* Iris pattern - radial lines for detail */}
        {details.hasPatterns &&
          [...Array(8)].map((_, i) => (
            <line
              key={i}
              x1={eyeX + irisOffset}
              y1={eyeY + 5}
              x2={
                eyeX +
                irisOffset +
                Math.cos((i * Math.PI) / 4) * (eyeWidth * 0.67)
              }
              y2={eyeY + 5 + Math.sin((i * Math.PI) / 4) * (eyeHeight * 0.67)}
              stroke={eyeShadow}
              strokeWidth="1"
              opacity="0.3"
            />
          ))}

        {/* Pupil */}
        <ellipse
          cx={eyeX + irisOffset + (side === 'left' ? 2 : -2)}
          cy={eyeY + 8}
          rx={eyeWidth * 0.375}
          ry={eyeHeight * 0.37}
          fill="#1a1a2e"
        />

        {/* Main highlight - key to anime look */}
        {details.hasHighlights && (
          <ellipse
            cx={eyeX + (side === 'left' ? eyeWidth * 0.4 : -eyeWidth * 0.4)}
            cy={eyeY - 5}
            rx={6}
            ry={7}
            fill="white"
            opacity="0.95"
          />
        )}

        {/* Secondary highlight */}
        {details.hasReflections && (
          <ellipse
            cx={eyeX + (side === 'left' ? -eyeWidth * 0.2 : eyeWidth * 0.2)}
            cy={eyeY + 13}
            rx={3}
            ry={4}
            fill="white"
            opacity="0.7"
          />
        )}

        {/* Small sparkle for extra anime effect */}
        {details.hasSparkles && (
          <circle
            cx={eyeX + (side === 'left' ? eyeWidth * 0.33 : -eyeWidth * 0.33)}
            cy={eyeY}
            r="2"
            fill="white"
            opacity="0.8"
          />
        )}

        {/* Upper eyelashes */}
        {details.hasEyelashes && (
          <>
            <path
              d={`M ${eyeX - eyeWidth - 4} ${eyeY - 15} Q ${eyeX - eyeWidth / 2} ${eyeY - eyeHeight - 7}, ${eyeX} ${eyeY - eyeHeight - 5} Q ${eyeX + eyeWidth / 2} ${eyeY - eyeHeight - 7}, ${eyeX + eyeWidth + 4} ${eyeY - 15}`}
              stroke="#2a2a3a"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            {/* Eyelash detail strokes */}
            <path
              d={`M ${eyeX - eyeWidth - 2} ${eyeY - 17} Q ${eyeX - eyeWidth - 5} ${eyeY - 23}, ${eyeX - eyeWidth - 8} ${eyeY - 27}`}
              stroke="#2a2a3a"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d={`M ${eyeX + eyeWidth + 2} ${eyeY - 17} Q ${eyeX + eyeWidth + 5} ${eyeY - 21}, ${eyeX + eyeWidth + 8} ${eyeY - 23}`}
              stroke="#2a2a3a"
              strokeWidth="1.5"
              fill="none"
            />
          </>
        )}

        {/* Lower lash line */}
        {details.hasEyelashes && (
          <path
            d={`M ${eyeX - eyeWidth + 2} ${eyeY + 20} Q ${eyeX} ${eyeY + 27}, ${eyeX + eyeWidth - 2} ${eyeY + 20}`}
            stroke="#554455"
            strokeWidth="1"
            fill="none"
            opacity="0.5"
          />
        )}

        {/* Eyelid for blinking */}
        <ellipse
          cx={eyeX}
          cy={eyeY}
          rx={eyeWidth + 2}
          ry={eyeHeight + 2}
          fill={skinColor}
          className="eyelid"
          style={{
            transform: isBlinking ? 'scaleY(1)' : 'scaleY(0)',
            transformOrigin: `${eyeX}px ${eyeY}px`,
            transition: 'transform 0.15s ease',
          }}
        />
      </g>
    );
  };

  return (
    <g className={`eyes ${isBlinking ? 'blinking' : ''}`}>
      {/* Gradient definitions for this component */}
      <defs>
        <radialGradient id="eyeRadial-left" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor={eyeHighlight} />
          <stop offset="50%" stopColor={eyeColor} />
          <stop offset="100%" stopColor={eyeShadow} />
        </radialGradient>
        <radialGradient id="eyeRadial-right" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor={eyeHighlight} />
          <stop offset="50%" stopColor={eyeColor} />
          <stop offset="100%" stopColor={eyeShadow} />
        </radialGradient>
      </defs>

      {renderEye('left', -eyeSpacing)}
      {renderEye('right', eyeSpacing)}
    </g>
  );
}

export default SVGEyes;
