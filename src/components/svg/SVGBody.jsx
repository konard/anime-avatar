import React from 'react';
import { adjustColor, getDetailLevel, DEFAULT_CONFIG } from './utils.js';

/**
 * SVG Body Component - Sailor uniform body with arms
 * Can be rendered independently for testing
 */
function SVGBody({
  config = {},
  detailLevel = 10,
  animation = 'idle', // idle, wave, etc.
}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const { skinColor, clothesColor, clothesSecondaryColor } = mergedConfig;
  const details = getDetailLevel(detailLevel, 'body');

  // Derived colors
  const skinHighlight = adjustColor(skinColor, 15);
  const skinShadow = adjustColor(skinColor, -25);
  const clothesShadow = adjustColor(clothesColor, -20);
  const collarHighlight = adjustColor(clothesSecondaryColor, 20);

  if (details.shapes === 0) {
    return null;
  }

  return (
    <g className="body">
      {/* Gradient definitions */}
      <defs>
        <linearGradient id="clothesGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={clothesColor} />
          <stop offset="100%" stopColor={clothesShadow} />
        </linearGradient>
        <linearGradient id="collarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={collarHighlight} />
          <stop offset="100%" stopColor={clothesSecondaryColor} />
        </linearGradient>
        <linearGradient id="ribbonGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e84444" />
          <stop offset="50%" stopColor="#cc3333" />
          <stop offset="100%" stopColor="#aa2222" />
        </linearGradient>
        <radialGradient id="skinRadialBody" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor={skinHighlight} />
          <stop offset="60%" stopColor={skinColor} />
          <stop offset="100%" stopColor={skinShadow} />
        </radialGradient>
      </defs>

      {/* Neck */}
      <path
        d="M 175 320 L 173 375 Q 175 392, 190 395 L 210 395 Q 225 392, 227 375 L 225 320 Z"
        fill={skinColor}
      />
      {/* Neck shadow */}
      <ellipse
        cx="200"
        cy="330"
        rx="20"
        ry="8"
        fill={skinShadow}
        opacity="0.3"
      />

      {/* Main torso - sailor top */}
      {details.hasClothes && (
        <>
          <path
            d={`M 125 395
                Q 105 420, 95 480
                Q 90 530, 90 600
                L 310 600
                Q 310 530, 305 480
                Q 295 420, 275 395
                Z`}
            fill="url(#clothesGradient)"
          />

          {/* Sailor collar back piece */}
          {details.hasCollar && (
            <path
              d={`M 145 395
                  Q 130 410, 125 430
                  L 115 480
                  Q 150 450, 200 455
                  Q 250 450, 285 480
                  L 275 430
                  Q 270 410, 255 395
                  Q 225 400, 200 402
                  Q 175 400, 145 395
                  Z`}
              fill="url(#collarGradient)"
            />
          )}

          {/* Collar V-shape front pieces */}
          {details.hasCollar && (
            <>
              <path
                d={`M 148 395
                    L 110 460
                    L 100 500
                    L 155 455
                    L 195 475
                    L 200 470
                    Z`}
                fill="url(#collarGradient)"
              />
              <path
                d={`M 252 395
                    L 290 460
                    L 300 500
                    L 245 455
                    L 205 475
                    L 200 470
                    Z`}
                fill="url(#collarGradient)"
              />

              {/* White collar stripes */}
              {details.hasDetails && (
                <>
                  <path
                    d="M 108 468 L 152 435 L 157 445 L 113 478 Z"
                    fill={clothesColor}
                    opacity="0.95"
                  />
                  <path
                    d="M 112 478 L 155 446 L 158 454 L 116 486 Z"
                    fill={clothesColor}
                    opacity="0.95"
                  />
                  <path
                    d="M 292 468 L 248 435 L 243 445 L 287 478 Z"
                    fill={clothesColor}
                    opacity="0.95"
                  />
                  <path
                    d="M 288 478 L 245 446 L 242 454 L 284 486 Z"
                    fill={clothesColor}
                    opacity="0.95"
                  />
                </>
              )}
            </>
          )}

          {/* Red bow/ribbon */}
          {details.hasBow && (
            <g className="bow">
              {/* Left bow loop */}
              <path
                d={`M 180 420
                    Q 155 408, 145 420
                    Q 148 435, 175 435
                    Z`}
                fill="url(#ribbonGradient)"
              />
              {/* Right bow loop */}
              <path
                d={`M 220 420
                    Q 245 408, 255 420
                    Q 252 435, 225 435
                    Z`}
                fill="url(#ribbonGradient)"
              />
              {/* Bow center knot */}
              <ellipse cx="200" cy="425" rx="10" ry="8" fill="#dd4444" />
              <ellipse
                cx="198"
                cy="423"
                rx="4"
                ry="3"
                fill="#ee6666"
                opacity="0.6"
              />
              {/* Bow tails */}
              <path
                d="M 195 433 L 188 485 L 200 478 L 212 485 L 205 433 Z"
                fill="url(#ribbonGradient)"
              />
            </g>
          )}

          {/* Skirt with pleats */}
          {details.hasSkirt && (
            <>
              <path
                d={`M 105 500
                    Q 90 530, 75 600
                    L 325 600
                    Q 310 530, 295 500
                    Z`}
                fill={clothesSecondaryColor}
              />
              {/* Skirt pleats */}
              {details.hasDetails &&
                [...Array(8)].map((_, i) => (
                  <path
                    key={i}
                    d={`M ${115 + i * 25} 505 L ${95 + i * 28} 600`}
                    stroke={adjustColor(clothesSecondaryColor, -25)}
                    strokeWidth="2"
                    opacity="0.6"
                  />
                ))}
              {/* Skirt highlight */}
              <path
                d="M 150 510 Q 200 505, 250 510"
                stroke={adjustColor(clothesSecondaryColor, 20)}
                strokeWidth="2"
                fill="none"
                opacity="0.4"
              />
            </>
          )}
        </>
      )}

      {/* Arms */}
      {details.hasArms && (
        <g className="arms">
          {/* Left arm - natural down pose */}
          <path
            d={`M 125 400
                Q 90 430, 70 475
                Q 55 510, 58 540
                Q 62 555, 75 550
                Q 95 530, 105 495
                Q 120 450, 135 415
                Z`}
            fill="url(#skinRadialBody)"
            className="left-arm"
          />
          {/* Left hand */}
          <ellipse cx="65" cy="545" rx="12" ry="10" fill={skinColor} />

          {/* Right arm - raised touching hair */}
          <path
            d={`M 275 400
                Q 305 375, 325 340
                Q 342 305, 335 280
                Q 330 268, 318 275
                Q 300 295, 288 335
                Q 275 375, 268 415
                Z`}
            fill="url(#skinRadialBody)"
            className={`right-arm ${animation === 'wave' ? 'waving' : ''}`}
          />
          {/* Right hand near hair */}
          <ellipse cx="328" cy="272" rx="14" ry="12" fill={skinColor} />
          {/* Fingers hint */}
          <ellipse cx="335" cy="265" rx="4" ry="6" fill={skinColor} />
        </g>
      )}

      {/* Bag strap */}
      {details.hasBag && (
        <>
          <path
            d="M 278 395 Q 300 420, 315 500 L 325 498 Q 312 415, 285 390 Z"
            fill="#2a2a2a"
            opacity="0.85"
          />
          <path
            d="M 280 400 Q 298 420, 310 480"
            stroke="#444"
            strokeWidth="1"
            fill="none"
            opacity="0.5"
          />
        </>
      )}
    </g>
  );
}

export default SVGBody;
