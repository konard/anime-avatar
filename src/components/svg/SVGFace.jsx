import React from 'react';
import { adjustColor, getDetailLevel, DEFAULT_CONFIG } from './utils.js';
import SVGEyes from './SVGEyes.jsx';

/**
 * SVG Face Component - Anime-style face with eyes, nose, mouth
 * Can be rendered independently for testing
 */
function SVGFace({
  config = {},
  isBlinking = false,
  isTalking = false,
  detailLevel = 10,
  position = { x: 200, y: 240 }, // Center of face
}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const { skinColor, hairColor } = mergedConfig;
  const details = getDetailLevel(detailLevel, 'face');

  // Derived colors
  const skinHighlight = adjustColor(skinColor, 15);
  const skinShadow = adjustColor(skinColor, -25);

  if (details.shapes === 0) {
    return null;
  }

  return (
    <g className="face">
      {/* Gradient definitions */}
      <defs>
        <radialGradient id="skinRadial" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor={skinHighlight} />
          <stop offset="60%" stopColor={skinColor} />
          <stop offset="100%" stopColor={skinShadow} />
        </radialGradient>
        <linearGradient id="skinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={skinHighlight} />
          <stop offset="50%" stopColor={skinColor} />
          <stop offset="100%" stopColor={skinShadow} />
        </linearGradient>
        <radialGradient id="blushGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffb6c1" stopOpacity="0.5" />
          <stop offset="70%" stopColor="#ffb6c1" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ffb6c1" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Face base shape - anime style pointed chin */}
      <path
        d={`M 130 185
            Q 118 210, 118 245
            Q 118 285, 135 315
            Q 155 345, 175 355
            Q 190 362, 200 363
            Q 210 362, 225 355
            Q 245 345, 265 315
            Q 282 285, 282 245
            Q 282 210, 270 185
            Q 250 135, 200 125
            Q 150 135, 130 185
            Z`}
        fill="url(#skinRadial)"
      />

      {/* Face shadow on sides for depth */}
      {details.hasShadows && (
        <>
          <path
            d={`M 125 220 Q 120 260, 135 300 Q 130 280, 125 220 Z`}
            fill={skinShadow}
            opacity="0.3"
          />
          <path
            d={`M 275 220 Q 280 260, 265 300 Q 270 280, 275 220 Z`}
            fill={skinShadow}
            opacity="0.3"
          />
        </>
      )}

      {/* Ears */}
      {details.hasEars && (
        <>
          <ellipse cx="116" cy="235" rx="10" ry="16" fill={skinColor} />
          <ellipse cx="284" cy="235" rx="10" ry="16" fill={skinColor} />
          <ellipse
            cx="116"
            cy="235"
            rx="5"
            ry="10"
            fill={skinShadow}
            opacity="0.3"
          />
          <ellipse
            cx="284"
            cy="235"
            rx="5"
            ry="10"
            fill={skinShadow}
            opacity="0.3"
          />
        </>
      )}

      {/* Blush - cute anime element */}
      {details.hasBlush && (
        <>
          <ellipse
            cx="148"
            cy="280"
            rx="22"
            ry="12"
            fill="url(#blushGradient)"
          />
          <ellipse
            cx="252"
            cy="280"
            rx="22"
            ry="12"
            fill="url(#blushGradient)"
          />
        </>
      )}

      {/* Eyes */}
      {details.hasEyes && (
        <SVGEyes
          config={config}
          isBlinking={isBlinking}
          detailLevel={detailLevel}
          position={{ x: position.x, y: position.y + 5 }}
        />
      )}

      {/* Eyebrows */}
      {details.hasEyes && (
        <>
          <path
            d="M 138 212 Q 155 205, 178 212"
            stroke={hairColor}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 222 212 Q 245 205, 262 212"
            stroke={hairColor}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
        </>
      )}

      {/* Nose - subtle anime style */}
      {details.hasNose && (
        <>
          <path
            d="M 197 285 Q 200 292, 203 285"
            stroke={skinShadow}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          {details.hasHighlights && (
            <ellipse
              cx="200"
              cy="278"
              rx="3"
              ry="2"
              fill={skinHighlight}
              opacity="0.4"
            />
          )}
        </>
      )}

      {/* Mouth */}
      {details.hasMouth && (
        <g className={`mouth ${isTalking ? 'talking' : 'normal'}`}>
          {isTalking ? (
            <>
              <ellipse
                cx="200"
                cy="318"
                rx="14"
                ry="10"
                fill="#c46666"
                className="mouth-talking"
              >
                {/* Animated talking effect */}
                <animate
                  attributeName="ry"
                  values="8;12;8"
                  dur="0.2s"
                  repeatCount="indefinite"
                />
              </ellipse>
              <ellipse
                cx="200"
                cy="315"
                rx="10"
                ry="5"
                fill="#ffb6b6"
                opacity="0.5"
              />
              <path
                d="M 188 320 Q 200 328, 212 320"
                stroke="#aa4444"
                strokeWidth="1"
                fill="none"
              />
            </>
          ) : (
            <>
              <path
                d="M 188 312 Q 200 322, 212 312"
                stroke="#cc6666"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                className="mouth-normal"
              />
              {/* Smile highlight */}
              <path
                d="M 193 314 Q 200 318, 207 314"
                stroke="#ffaaaa"
                strokeWidth="1"
                fill="none"
                opacity="0.5"
              />
            </>
          )}
        </g>
      )}
    </g>
  );
}

export default SVGFace;
