/* eslint-disable max-lines-per-function, complexity */
import React, { useState, useEffect, useMemo } from 'react';
import '../styles/avatarSvg.css';
import { adjustColor, getDetailLevel, DEFAULT_CONFIG } from './svg/utils.js';
import SVGLegs from './svg/SVGLegs.jsx';

const ANIMATIONS = ['idle', 'happy', 'wave', 'nod', 'thinking', 'surprised'];

/**
 * Gradient definitions for the SVG avatar
 */
function AvatarGradients({
  colors,
  skinColor,
  hairColor,
  eyeColor,
  clothesColor,
  clothesSecondaryColor,
}) {
  return (
    <defs>
      {/* Sky gradient - matching reference image */}
      <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#4da6e8" />
        <stop offset="30%" stopColor="#6bc5f0" />
        <stop offset="60%" stopColor="#8dd8f8" />
        <stop offset="100%" stopColor="#b8ecff" />
      </linearGradient>

      {/* Skin gradients - soft anime shading */}
      <linearGradient id="skinGradient" x1="30%" y1="0%" x2="70%" y2="100%">
        <stop offset="0%" stopColor={colors.skinHighlight} />
        <stop offset="40%" stopColor={skinColor} />
        <stop offset="100%" stopColor={colors.skinShadow} />
      </linearGradient>

      <radialGradient id="skinRadial" cx="45%" cy="35%" r="65%">
        <stop offset="0%" stopColor={colors.skinHighlight} />
        <stop offset="50%" stopColor={skinColor} />
        <stop offset="100%" stopColor={colors.skinShadow} />
      </radialGradient>

      {/* Hair gradients - rich warm tones with highlights */}
      <linearGradient id="hairMainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={colors.hairLightHighlight} />
        <stop offset="20%" stopColor={colors.hairHighlight} />
        <stop offset="50%" stopColor={hairColor} />
        <stop offset="80%" stopColor={colors.hairShadow} />
        <stop offset="100%" stopColor={colors.hairDeepShadow} />
      </linearGradient>

      <linearGradient id="hairSideGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={colors.hairMidtone} />
        <stop offset="40%" stopColor={hairColor} />
        <stop offset="100%" stopColor={colors.hairDeepShadow} />
      </linearGradient>

      <linearGradient id="hairShineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop
          offset="0%"
          stopColor={colors.hairLightHighlight}
          stopOpacity="0.8"
        />
        <stop offset="50%" stopColor={colors.hairHighlight} stopOpacity="0.4" />
        <stop offset="100%" stopColor={colors.hairHighlight} stopOpacity="0" />
      </linearGradient>

      {/* Eye gradients - large detailed anime eyes */}
      <linearGradient id="eyeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor={colors.eyeDeepShadow} />
        <stop offset="30%" stopColor={eyeColor} />
        <stop offset="70%" stopColor={colors.eyeHighlight} />
        <stop offset="100%" stopColor={colors.eyeLightHighlight} />
      </linearGradient>

      <radialGradient id="eyeRadial" cx="50%" cy="40%" r="55%">
        <stop offset="0%" stopColor={colors.eyeLightHighlight} />
        <stop offset="40%" stopColor={eyeColor} />
        <stop offset="100%" stopColor={colors.eyeDeepShadow} />
      </radialGradient>

      {/* Clothes gradients */}
      <linearGradient id="clothesGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor={clothesColor} />
        <stop offset="60%" stopColor={colors.clothesShadow} />
        <stop offset="100%" stopColor={colors.clothesDeepShadow} />
      </linearGradient>

      <linearGradient id="collarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor={colors.collarHighlight} />
        <stop offset="50%" stopColor={clothesSecondaryColor} />
        <stop offset="100%" stopColor={colors.collarShadow} />
      </linearGradient>

      {/* Blush gradient */}
      <radialGradient id="blushGradient" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ffb6c1" stopOpacity="0.6" />
        <stop offset="60%" stopColor="#ffb6c1" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#ffb6c1" stopOpacity="0" />
      </radialGradient>

      {/* Ribbon/bow gradient */}
      <linearGradient id="ribbonGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ff5555" />
        <stop offset="40%" stopColor="#e84444" />
        <stop offset="100%" stopColor="#bb2222" />
      </linearGradient>

      {/* Cherry blossom gradient */}
      <radialGradient id="blossomGradient" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#ffd8e0" />
        <stop offset="50%" stopColor="#ffb7c5" />
        <stop offset="100%" stopColor="#ff9eb0" />
      </radialGradient>

      {/* Filters */}
      <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="2" stdDeviation="3" floodOpacity="0.12" />
      </filter>
    </defs>
  );
}

/**
 * Background layer with cherry blossoms or plain colors
 */
function AvatarBackground({
  bgDetails,
  viewBoxHeight,
  petals,
  backgroundModel = 'cherry-blossom-road',
}) {
  // Plain background modes
  if (backgroundModel === 'plain-white') {
    return (
      <g className="background-layer">
        <rect x="0" y="0" width="400" height={viewBoxHeight} fill="#ffffff" />
      </g>
    );
  }

  if (backgroundModel === 'plain-gray') {
    return (
      <g className="background-layer">
        <rect x="0" y="0" width="400" height={viewBoxHeight} fill="#808080" />
      </g>
    );
  }

  // Cherry blossom road (default)
  return (
    <g className="background-layer">
      {/* Sky */}
      <rect
        x="0"
        y="0"
        width="400"
        height={viewBoxHeight}
        fill="url(#skyGradient)"
      />

      {/* Distant cityscape silhouette */}
      {bgDetails.hasCity && (
        <g className="cityscape" opacity="0.25">
          {[...Array(15)].map((_, i) => (
            <rect
              key={i}
              x={i * 28}
              y={480 - (i % 4) * 20 - Math.floor(i / 3) * 10}
              width={18 + (i % 3) * 6}
              height={120 + (i % 4) * 30}
              fill="#c0d0e0"
            />
          ))}
        </g>
      )}

      {/* Fence/railing */}
      {bgDetails.hasFence && (
        <g className="fence">
          <rect x="0" y="505" width="400" height="5" fill="#d4c4b0" />
          <rect x="0" y="525" width="400" height="4" fill="#c8b8a4" />
          {[...Array(12)].map((_, i) => (
            <rect
              key={i}
              x={i * 35 + 10}
              y="480"
              width="4"
              height="55"
              fill="#baa890"
            />
          ))}
        </g>
      )}

      {/* Cherry blossom trees - left */}
      {bgDetails.hasTrees && (
        <g className="cherry-tree-left">
          <path
            d="M 45 600 Q 40 520, 50 420 Q 55 360, 48 300 Q 45 260, 55 220"
            stroke="#5c4033"
            strokeWidth="18"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 50 340 Q 20 300, 5 260"
            stroke="#5c4033"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 52 280 Q 80 250, 95 210"
            stroke="#5c4033"
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
          />
          {[
            { cx: 30, cy: 160, r: 65 },
            { cx: -15, cy: 210, r: 55 },
            { cx: 75, cy: 140, r: 50 },
            { cx: 50, cy: 90, r: 45 },
            { cx: 95, cy: 180, r: 45 },
            { cx: 5, cy: 120, r: 50 },
            { cx: 70, cy: 240, r: 40 },
            { cx: -5, cy: 280, r: 35 },
          ].map((cluster, i) => (
            <g key={i}>
              <ellipse
                cx={cluster.cx}
                cy={cluster.cy}
                rx={cluster.r}
                ry={cluster.r * 0.85}
                fill="url(#blossomGradient)"
                opacity={0.92 - i * 0.03}
              />
              <ellipse
                cx={cluster.cx + 12}
                cy={cluster.cy - 12}
                rx={cluster.r * 0.6}
                ry={cluster.r * 0.5}
                fill="#ffd8e4"
                opacity={0.7}
              />
            </g>
          ))}
        </g>
      )}

      {/* Cherry blossom trees - right */}
      {bgDetails.hasTrees && (
        <g className="cherry-tree-right">
          <path
            d="M 375 600 Q 385 500, 368 400 Q 355 320, 375 250"
            stroke="#5c4033"
            strokeWidth="20"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 365 340 Q 410 290, 430 240"
            stroke="#5c4033"
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 370 280 Q 330 250, 315 200"
            stroke="#5c4033"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
          {[
            { cx: 390, cy: 130, r: 75 },
            { cx: 440, cy: 180, r: 65 },
            { cx: 340, cy: 160, r: 55 },
            { cx: 370, cy: 70, r: 50 },
            { cx: 420, cy: 100, r: 50 },
            { cx: 310, cy: 120, r: 45 },
            { cx: 400, cy: 240, r: 50 },
            { cx: 360, cy: 200, r: 40 },
          ].map((cluster, i) => (
            <g key={i}>
              <ellipse
                cx={cluster.cx}
                cy={cluster.cy}
                rx={cluster.r}
                ry={cluster.r * 0.88}
                fill="url(#blossomGradient)"
                opacity={0.9 - i * 0.03}
              />
              <ellipse
                cx={cluster.cx - 15}
                cy={cluster.cy - 10}
                rx={cluster.r * 0.55}
                ry={cluster.r * 0.45}
                fill="#ffdce8"
                opacity={0.65}
              />
            </g>
          ))}
        </g>
      )}

      {/* Falling petals */}
      {bgDetails.hasPetals && (
        <g className="falling-petals">
          {petals.map((petal, i) => (
            <g key={i} className={`petal petal-${i % 12}`}>
              <ellipse
                cx={petal.x}
                cy={petal.y}
                rx={petal.size}
                ry={petal.size * 0.6}
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

/**
 * Anime-style eyes component
 */
function AvatarEyes({ eyeDetails, isBlinking, skinColor, colors }) {
  const renderEye = (cx, isLeft) => {
    const xOffset = isLeft ? -2 : 2;
    const highlightX = isLeft ? cx + 12 : cx - 12;
    const secondaryHighlightX = isLeft ? cx - 6 : cx + 6;
    const sparkleX = isLeft ? cx + 10 : cx - 10;
    const lashPath1 = isLeft
      ? `M 130 235 Q 145 220, 158 222 Q 171 220, 186 235`
      : `M 214 235 Q 229 220, 242 222 Q 255 220, 270 235`;
    const lashPath2 = isLeft
      ? `M 132 232 Q 128 224, 124 218`
      : `M 216 232 Q 211 226, 206 222`;
    const lashPath3 = isLeft
      ? `M 184 232 Q 189 226, 194 222`
      : `M 268 232 Q 272 224, 276 218`;
    const lowerLashPath = isLeft
      ? `M 138 278 Q 158 286, 178 278`
      : `M 222 278 Q 242 286, 262 278`;

    return (
      <g className={isLeft ? 'left-eye' : 'right-eye'}>
        {eyeDetails.hasEyelashes && (
          <ellipse
            cx={cx}
            cy="248"
            rx="30"
            ry="35"
            fill={colors.skinShadow}
            opacity="0.15"
          />
        )}
        <ellipse cx={cx} cy="252" rx="27" ry="33" fill="white" />
        {eyeDetails.hasHighlights && (
          <ellipse
            cx={cx}
            cy="240"
            rx="25"
            ry="18"
            fill="#e8e8f5"
            opacity="0.6"
          />
        )}
        <ellipse
          cx={cx + xOffset}
          cy="258"
          rx="20"
          ry="25"
          fill="url(#eyeRadial)"
        />
        {eyeDetails.hasPatterns &&
          [...Array(10)].map((_, i) => (
            <line
              key={i}
              x1={cx + xOffset}
              y1="258"
              x2={cx + xOffset + Math.cos((i * Math.PI) / 5) * 18}
              y2={258 + Math.sin((i * Math.PI) / 5) * 23}
              stroke={colors.eyeShadow}
              strokeWidth="1"
              opacity="0.25"
            />
          ))}
        <ellipse
          cx={cx + xOffset + (isLeft ? 2 : -2)}
          cy="262"
          rx="10"
          ry="12"
          fill="#1a1a2e"
        />
        {eyeDetails.hasHighlights && (
          <ellipse
            cx={highlightX}
            cy="245"
            rx="8"
            ry="9"
            fill="white"
            opacity="0.98"
          />
        )}
        {eyeDetails.hasReflections && (
          <ellipse
            cx={secondaryHighlightX}
            cy="268"
            rx="4"
            ry="5"
            fill="white"
            opacity="0.8"
          />
        )}
        {eyeDetails.hasSparkles && (
          <circle cx={sparkleX} cy="250" r="2" fill="white" opacity="0.9" />
        )}
        {eyeDetails.hasEyelashes && (
          <>
            <path
              d={lashPath1}
              stroke="#2a2a3a"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
            <path d={lashPath2} stroke="#2a2a3a" strokeWidth="2" fill="none" />
            <path d={lashPath3} stroke="#2a2a3a" strokeWidth="2" fill="none" />
            <path
              d={lowerLashPath}
              stroke="#554455"
              strokeWidth="1"
              fill="none"
              opacity="0.4"
            />
          </>
        )}
        <ellipse
          cx={cx}
          cy="252"
          rx="29"
          ry="35"
          fill={skinColor}
          className="eyelid"
        />
      </g>
    );
  };

  return (
    <g className={`eyes ${isBlinking ? 'blinking' : ''}`}>
      {renderEye(158, true)}
      {renderEye(242, false)}
    </g>
  );
}

/**
 * Hair components (back and front layers)
 */
function AvatarHairBack({ hairDetails, colors }) {
  return (
    <g className="hair-back">
      <path
        d={`M 115 140 Q 75 200, 60 300 Q 45 420, 65 520 Q 75 560, 90 590 Q 100 600, 115 595 Q 135 560, 145 480 Q 155 380, 160 280 Q 163 200, 165 160 Z`}
        fill="url(#hairSideGradient)"
      />
      <path
        d={`M 285 140 Q 325 200, 340 300 Q 355 420, 335 520 Q 325 560, 310 590 Q 300 600, 285 595 Q 265 560, 255 480 Q 245 380, 240 280 Q 237 200, 235 160 Z`}
        fill="url(#hairSideGradient)"
      />
      {hairDetails.hasStrands && (
        <>
          <path
            d={`M 85 220 Q 65 340, 78 460 Q 85 520, 100 570`}
            stroke={colors.hairShadow}
            strokeWidth="12"
            fill="none"
            opacity="0.7"
            strokeLinecap="round"
          />
          <path
            d={`M 315 220 Q 335 340, 322 460 Q 315 520, 300 570`}
            stroke={colors.hairShadow}
            strokeWidth="12"
            fill="none"
            opacity="0.7"
            strokeLinecap="round"
          />
        </>
      )}
      {hairDetails.hasHighlights && (
        <>
          <path
            d="M 80 260 Q 70 350, 82 450"
            stroke={colors.hairHighlight}
            strokeWidth="4"
            fill="none"
            opacity="0.5"
            strokeLinecap="round"
          />
          <path
            d="M 320 260 Q 330 350, 318 450"
            stroke={colors.hairHighlight}
            strokeWidth="4"
            fill="none"
            opacity="0.5"
            strokeLinecap="round"
          />
        </>
      )}
    </g>
  );
}

function AvatarHairFront({ hairDetails, colors, hairColor }) {
  return (
    <g className="hair-front">
      <path
        d={`M 122 130 Q 135 95, 200 88 Q 265 95, 278 130 Q 285 165, 280 200 Q 270 185, 255 210 Q 240 185, 220 210 Q 200 185, 180 210 Q 160 185, 145 210 Q 130 185, 120 200 Q 115 165, 122 130 Z`}
        fill="url(#hairMainGradient)"
      />
      {hairDetails.hasShine && (
        <>
          <path
            d="M 152 105 Q 168 125, 156 175"
            stroke="url(#hairShineGradient)"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 178 100 Q 188 120, 180 165"
            stroke="url(#hairShineGradient)"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 228 105 Q 240 125, 232 170"
            stroke="url(#hairShineGradient)"
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
          />
        </>
      )}
      <path
        d={`M 118 160 Q 95 200, 90 260 Q 87 300, 98 330 L 115 320 Q 112 270, 118 220 Q 124 180, 130 160 Z`}
        fill={hairColor}
      />
      {hairDetails.hasShadows && (
        <path
          d={`M 95 215 Q 90 265, 100 315`}
          stroke={colors.hairShadow}
          strokeWidth="8"
          fill="none"
          opacity="0.45"
          strokeLinecap="round"
        />
      )}
      <path
        d={`M 282 160 Q 305 200, 310 260 Q 313 300, 302 330 L 285 320 Q 288 270, 282 220 Q 276 180, 270 160 Z`}
        fill={hairColor}
      />
      {hairDetails.hasShadows && (
        <path
          d={`M 305 215 Q 310 265, 300 315`}
          stroke={colors.hairShadow}
          strokeWidth="8"
          fill="none"
          opacity="0.45"
          strokeLinecap="round"
        />
      )}
      <ellipse cx="200" cy="88" rx="80" ry="30" fill={hairColor} />
      {hairDetails.hasHighlights && (
        <ellipse
          cx="200"
          cy="82"
          rx="55"
          ry="18"
          fill={colors.hairMidtone}
          opacity="0.65"
        />
      )}
      {hairDetails.hasAhoge && (
        <>
          <path
            d="M 194 68 Q 172 32, 198 20 Q 228 32, 206 68"
            fill={hairColor}
          />
          <path
            d="M 196 58 Q 182 42, 198 30"
            stroke={colors.hairHighlight}
            strokeWidth="3"
            fill="none"
            opacity="0.55"
            strokeLinecap="round"
          />
        </>
      )}
    </g>
  );
}

/**
 * Body with sailor uniform
 */
function AvatarBody({
  bodyDetails,
  colors,
  clothesColor,
  clothesSecondaryColor,
}) {
  return (
    <g className="body">
      <path
        d={`M 130 400 Q 110 430, 100 490 Q 95 540, 95 600 L 305 600 Q 305 540, 300 490 Q 290 430, 270 400 Z`}
        fill="url(#clothesGradient)"
      />
      {bodyDetails.hasCollar && (
        <>
          <path
            d={`M 148 400 Q 130 420, 120 450 L 108 510 Q 145 475, 200 478 Q 255 475, 292 510 L 280 450 Q 270 420, 252 400 Q 225 405, 200 407 Q 175 405, 148 400 Z`}
            fill="url(#collarGradient)"
          />
          <path
            d={`M 150 400 L 105 475 L 95 520 L 155 470 L 198 492 L 200 485 Z`}
            fill="url(#collarGradient)"
          />
          <path
            d={`M 250 400 L 295 475 L 305 520 L 245 470 L 202 492 L 200 485 Z`}
            fill="url(#collarGradient)"
          />
          {bodyDetails.hasDetails && (
            <>
              <path
                d="M 105 485 L 152 448 L 156 456 L 109 494 Z"
                fill={clothesColor}
                opacity="0.95"
              />
              <path
                d="M 109 496 L 155 460 L 158 467 L 112 504 Z"
                fill={clothesColor}
                opacity="0.95"
              />
              <path
                d="M 295 485 L 248 448 L 244 456 L 291 494 Z"
                fill={clothesColor}
                opacity="0.95"
              />
              <path
                d="M 291 496 L 245 460 L 242 467 L 288 504 Z"
                fill={clothesColor}
                opacity="0.95"
              />
            </>
          )}
        </>
      )}
      {bodyDetails.hasBow && (
        <g className="bow" filter="url(#softGlow)">
          <path
            d={`M 178 428 Q 150 415, 140 430 Q 145 448, 175 445 Z`}
            fill="url(#ribbonGradient)"
          />
          <path
            d={`M 222 428 Q 250 415, 260 430 Q 255 448, 225 445 Z`}
            fill="url(#ribbonGradient)"
          />
          <ellipse cx="200" cy="432" rx="12" ry="10" fill="#e84444" />
          <ellipse
            cx="197"
            cy="429"
            rx="5"
            ry="4"
            fill="#ff7777"
            opacity="0.7"
          />
          <path
            d="M 193 440 L 185 510 L 200 500 L 215 510 L 207 440 Z"
            fill="url(#ribbonGradient)"
          />
        </g>
      )}
      {bodyDetails.hasSkirt && (
        <>
          <path
            d={`M 110 510 Q 90 550, 70 600 L 330 600 Q 310 550, 290 510 Z`}
            fill={clothesSecondaryColor}
          />
          {bodyDetails.hasDetails &&
            [...Array(10)].map((_, i) => (
              <path
                key={i}
                d={`M ${118 + i * 22} 515 L ${90 + i * 25} 600`}
                stroke={colors.collarShadow}
                strokeWidth="2"
                opacity="0.5"
              />
            ))}
          <path
            d="M 155 518 Q 200 512, 245 518"
            stroke={colors.collarHighlight}
            strokeWidth="2"
            fill="none"
            opacity="0.35"
          />
        </>
      )}
    </g>
  );
}

/**
 * Arms component
 */
function AvatarArms({ skinColor }) {
  return (
    <g className="arms">
      <path
        d={`M 130 405 Q 95 440, 75 490 Q 58 535, 62 565 Q 68 580, 82 575 Q 105 555, 115 515 Q 130 460, 145 420 Z`}
        fill="url(#skinRadial)"
        className="left-arm"
      />
      <ellipse cx="70" cy="570" rx="14" ry="12" fill={skinColor} />
      <path
        d={`M 270 405 Q 310 375, 330 335 Q 348 295, 340 265 Q 332 250, 318 260 Q 295 285, 280 330 Q 265 380, 260 420 Z`}
        fill="url(#skinRadial)"
        className="right-arm"
      />
      <ellipse cx="332" cy="258" rx="16" ry="14" fill={skinColor} />
      <ellipse cx="340" cy="248" rx="5" ry="7" fill={skinColor} />
    </g>
  );
}

/**
 * Face component (head shape, features except eyes)
 */
function AvatarFace({ faceDetails, colors, skinColor, hairColor, mouthState }) {
  return (
    <g className="head">
      <path
        d={`M 128 190 Q 115 220, 115 255 Q 115 295, 135 325 Q 160 358, 185 368 Q 195 372, 200 373 Q 205 372, 215 368 Q 240 358, 265 325 Q 285 295, 285 255 Q 285 220, 272 190 Q 250 140, 200 130 Q 150 140, 128 190 Z`}
        fill="url(#skinRadial)"
      />
      {faceDetails.hasShadows && (
        <>
          <path
            d={`M 122 230 Q 118 270, 135 310`}
            stroke={colors.skinShadow}
            strokeWidth="8"
            fill="none"
            opacity="0.2"
            strokeLinecap="round"
          />
          <path
            d={`M 278 230 Q 282 270, 265 310`}
            stroke={colors.skinShadow}
            strokeWidth="8"
            fill="none"
            opacity="0.2"
            strokeLinecap="round"
          />
        </>
      )}
      {faceDetails.hasEars && (
        <>
          <ellipse cx="114" cy="245" rx="10" ry="18" fill={skinColor} />
          <ellipse cx="286" cy="245" rx="10" ry="18" fill={skinColor} />
          <ellipse
            cx="114"
            cy="245"
            rx="5"
            ry="11"
            fill={colors.skinShadow}
            opacity="0.25"
          />
          <ellipse
            cx="286"
            cy="245"
            rx="5"
            ry="11"
            fill={colors.skinShadow}
            opacity="0.25"
          />
        </>
      )}
      {faceDetails.hasBlush && (
        <>
          <ellipse
            cx="145"
            cy="290"
            rx="25"
            ry="14"
            fill="url(#blushGradient)"
          />
          <ellipse
            cx="255"
            cy="290"
            rx="25"
            ry="14"
            fill="url(#blushGradient)"
          />
        </>
      )}
      {faceDetails.hasEyes && (
        <>
          <path
            d="M 135 218 Q 155 208, 182 218"
            stroke={hairColor}
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 218 218 Q 245 208, 265 218"
            stroke={hairColor}
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
        </>
      )}
      {faceDetails.hasNose && (
        <>
          <path
            d="M 196 298 Q 200 308, 204 298"
            stroke={colors.skinShadow}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          {faceDetails.hasHighlights && (
            <ellipse
              cx="200"
              cy="290"
              rx="3"
              ry="2"
              fill={colors.skinHighlight}
              opacity="0.35"
            />
          )}
        </>
      )}
      {faceDetails.hasMouth && (
        <g className={`mouth ${mouthState}`}>
          {mouthState === 'talking' ? (
            <g>
              <ellipse
                cx="200"
                cy="332"
                rx="16"
                ry="12"
                fill="#c46666"
                className="mouth-talking"
              />
              <ellipse
                cx="200"
                cy="328"
                rx="12"
                ry="6"
                fill="#ffb6b6"
                opacity="0.6"
              />
              <path
                d="M 186 335 Q 200 344, 214 335"
                stroke="#aa4444"
                strokeWidth="1.5"
                fill="none"
              />
            </g>
          ) : (
            <g>
              <path
                d="M 186 325 Q 200 338, 214 325"
                stroke="#cc6666"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                className="mouth-normal"
              />
              <path
                d="M 192 328 Q 200 334, 208 328"
                stroke="#ffaaaa"
                strokeWidth="1.5"
                fill="none"
                opacity="0.5"
              />
            </g>
          )}
        </g>
      )}
    </g>
  );
}

/**
 * High-quality anime-style SVG Avatar component
 * Designed to match reference image style closely
 * Features configurable detail levels and modular body parts
 */
export function AvatarSVG({
  config = {},
  isTalking = false,
  currentAnimation = null,
}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const [isBlinking, setIsBlinking] = useState(false);
  const [activeAnimation, setActiveAnimation] = useState('idle');
  const [mouthState, setMouthState] = useState('normal');

  const detailLevel = mergedConfig.detailLevel || 10;

  useEffect(() => {
    if (!mergedConfig.enableRandomBlink) {
      return;
    }
    const scheduleNextBlink = () => {
      const variance = Math.random() * 2000 - 1000;
      const interval = mergedConfig.blinkInterval + variance;
      return setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
        scheduleNextBlink();
      }, interval);
    };
    const timeoutId = scheduleNextBlink();
    return () => clearTimeout(timeoutId);
  }, [mergedConfig.blinkInterval, mergedConfig.enableRandomBlink]);

  useEffect(() => {
    if (currentAnimation && ANIMATIONS.includes(currentAnimation)) {
      setActiveAnimation(currentAnimation);
    } else if (mergedConfig.enableIdleAnimation) {
      setActiveAnimation('idle');
    }
  }, [currentAnimation, mergedConfig.enableIdleAnimation]);

  useEffect(() => {
    setMouthState(isTalking ? 'talking' : 'normal');
  }, [isTalking]);

  const {
    skinColor,
    hairColor,
    eyeColor,
    clothesColor,
    clothesSecondaryColor,
    showBackground,
    showLegs,
    characterScale = 1,
    backgroundModel = 'cherry-blossom-road',
  } = mergedConfig;

  const legsDetails = getDetailLevel(detailLevel, 'legs');
  const displayLegs = showLegs && legsDetails.shapes > 0;
  // Base dimensions - full body is 1050, bust is 600
  const baseViewBoxHeight = displayLegs ? 1050 : 600;
  const baseViewBoxWidth = 400;
  // characterScale controls zoom: 1 = normal, <1 = zoomed out (see more), >1 = zoomed in
  // When characterScale > 1, reduce viewBox to zoom in (show less, centered on face)
  // When characterScale < 1, expand viewBox to zoom out (show more of the scene)
  const viewBoxHeight = baseViewBoxHeight / characterScale;
  const viewBoxWidth = baseViewBoxWidth / characterScale;
  // For full body mode at scale=1, we want to see the whole character from head to feet
  // The viewBox should start from y=0 to ensure the head is always visible
  // The preserveAspectRatio will handle centering horizontally
  const viewBoxX = (baseViewBoxWidth - viewBoxWidth) / 2;
  // Start from top (y=0) by default to ensure face/head is visible
  // When zoomed in (scale > 1), center on face area
  const faceCenterY = 250; // Face is centered around y=250
  const viewBoxY =
    characterScale > 1
      ? Math.max(0, faceCenterY - viewBoxHeight / 2) // Zoom in: center on face
      : 0; // Normal/zoom out: start from top

  const faceDetails = getDetailLevel(detailLevel, 'face');
  const hairDetails = getDetailLevel(detailLevel, 'hair');
  const eyeDetails = getDetailLevel(detailLevel, 'eyes');
  const bodyDetails = getDetailLevel(detailLevel, 'body');
  const bgDetails = getDetailLevel(detailLevel, 'background');

  const colors = useMemo(
    () => ({
      skinHighlight: adjustColor(skinColor, 20),
      skinMidtone: adjustColor(skinColor, 5),
      skinShadow: adjustColor(skinColor, -20),
      skinDeepShadow: adjustColor(skinColor, -35),
      hairHighlight: adjustColor(hairColor, 50),
      hairLightHighlight: adjustColor(hairColor, 70),
      hairMidtone: adjustColor(hairColor, 20),
      hairShadow: adjustColor(hairColor, -20),
      hairDeepShadow: adjustColor(hairColor, -40),
      eyeHighlight: adjustColor(eyeColor, 40),
      eyeLightHighlight: adjustColor(eyeColor, 60),
      eyeShadow: adjustColor(eyeColor, -25),
      eyeDeepShadow: adjustColor(eyeColor, -40),
      clothesShadow: adjustColor(clothesColor, -15),
      clothesDeepShadow: adjustColor(clothesColor, -30),
      collarHighlight: adjustColor(clothesSecondaryColor, 25),
      collarShadow: adjustColor(clothesSecondaryColor, -20),
    }),
    [skinColor, hairColor, eyeColor, clothesColor, clothesSecondaryColor]
  );

  const petals = useMemo(() => {
    if (!bgDetails.hasPetals) {
      return [];
    }
    return [...Array(25)].map((_, i) => ({
      x: 20 + ((i * 17) % 370),
      y: 40 + ((i * 31) % 520),
      rotation: i * 27,
      opacity: 0.5 + (i % 5) * 0.1,
      size: 4 + (i % 3),
    }));
  }, [bgDetails.hasPetals]);

  return (
    <div className={`avatar-svg-container ${activeAnimation}`}>
      <svg
        viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        className="avatar-svg"
        preserveAspectRatio="xMidYMin meet"
      >
        <AvatarGradients
          colors={colors}
          skinColor={skinColor}
          hairColor={hairColor}
          eyeColor={eyeColor}
          clothesColor={clothesColor}
          clothesSecondaryColor={clothesSecondaryColor}
        />

        {showBackground && (
          <AvatarBackground
            bgDetails={bgDetails}
            viewBoxHeight={viewBoxHeight}
            petals={petals}
            backgroundModel={backgroundModel}
          />
        )}

        <g className="character-group" filter="url(#softShadow)">
          {hairDetails.shapes > 0 && (
            <AvatarHairBack hairDetails={hairDetails} colors={colors} />
          )}

          {bodyDetails.shapes > 0 && (
            <>
              <path
                d="M 178 325 L 176 385 Q 180 400, 195 402 L 205 402 Q 220 400, 224 385 L 222 325 Z"
                fill="url(#skinGradient)"
              />
              <ellipse
                cx="200"
                cy="340"
                rx="18"
                ry="6"
                fill={colors.skinShadow}
                opacity="0.25"
              />
            </>
          )}

          {bodyDetails.shapes > 0 && bodyDetails.hasClothes && (
            <AvatarBody
              bodyDetails={bodyDetails}
              colors={colors}
              clothesColor={clothesColor}
              clothesSecondaryColor={clothesSecondaryColor}
            />
          )}

          {displayLegs && (
            <SVGLegs config={mergedConfig} detailLevel={detailLevel} />
          )}

          {bodyDetails.hasArms && <AvatarArms skinColor={skinColor} />}

          {faceDetails.shapes > 0 && (
            <>
              <AvatarFace
                faceDetails={faceDetails}
                colors={colors}
                skinColor={skinColor}
                hairColor={hairColor}
                mouthState={mouthState}
              />
              {eyeDetails.shapes > 0 && (
                <AvatarEyes
                  eyeDetails={eyeDetails}
                  isBlinking={isBlinking}
                  skinColor={skinColor}
                  colors={colors}
                />
              )}
            </>
          )}

          {hairDetails.shapes > 0 && (
            <AvatarHairFront
              hairDetails={hairDetails}
              colors={colors}
              hairColor={hairColor}
            />
          )}

          {bodyDetails.hasBag && (
            <>
              <path
                d="M 275 405 Q 300 435, 318 520 L 330 518 Q 315 430, 285 400 Z"
                fill="#2a2a2a"
                opacity="0.88"
              />
              <path
                d="M 280 415 Q 302 440, 315 500"
                stroke="#444"
                strokeWidth="1.5"
                fill="none"
                opacity="0.45"
              />
            </>
          )}
        </g>
      </svg>
    </div>
  );
}

AvatarSVG.ANIMATIONS = ANIMATIONS;
AvatarSVG.DEFAULT_CONFIG = DEFAULT_CONFIG;

export default AvatarSVG;
