import React from 'react';
import { adjustColor, getDetailLevel, DEFAULT_CONFIG } from './utils.js';

/**
 * SVG Hair Component - Anime-style detailed hair
 * Can be rendered independently for testing
 */
function SVGHair({
  config = {},
  detailLevel = 10,
  layer = 'all', // 'front', 'back', or 'all'
}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const { hairColor } = mergedConfig;
  const details = getDetailLevel(detailLevel, 'hair');

  // Derived colors for shading
  const hairHighlight = adjustColor(hairColor, 40);
  const hairMidtone = adjustColor(hairColor, 15);
  const hairShadow = adjustColor(hairColor, -25);
  const hairDeepShadow = adjustColor(hairColor, -45);

  if (details.shapes === 0) {
    return null;
  }

  const renderBackHair = () => (
    <g className="hair-back">
      {/* Main back hair mass - left side */}
      <path
        d={`M 110 130
            Q 70 180, 60 280
            Q 50 380, 70 480
            Q 80 540, 95 580
            Q 100 590, 110 585
            Q 130 550, 140 480
            Q 150 400, 155 320
            Q 158 260, 160 200
            Z`}
        fill={`url(#hairSideGradient)`}
      />

      {/* Main back hair mass - right side */}
      <path
        d={`M 290 130
            Q 330 180, 340 280
            Q 350 380, 330 480
            Q 320 540, 305 580
            Q 300 590, 290 585
            Q 270 550, 260 480
            Q 250 400, 245 320
            Q 242 260, 240 200
            Z`}
        fill={`url(#hairSideGradient)`}
      />

      {/* Additional hair strands for volume */}
      {details.hasStrands && (
        <>
          <path
            d={`M 95 200 Q 75 300, 85 420 Q 90 480, 100 530 L 115 520 Q 110 450, 115 360 Q 118 280, 115 200 Z`}
            fill={hairShadow}
          />
          <path
            d={`M 305 200 Q 325 300, 315 420 Q 310 480, 300 530 L 285 520 Q 290 450, 285 360 Q 282 280, 285 200 Z`}
            fill={hairShadow}
          />
        </>
      )}

      {/* Hair highlight streaks on back */}
      {details.hasHighlights && (
        <>
          <path
            d="M 85 250 Q 80 320, 88 400"
            stroke={hairHighlight}
            strokeWidth="3"
            fill="none"
            opacity="0.4"
          />
          <path
            d="M 315 250 Q 320 320, 312 400"
            stroke={hairHighlight}
            strokeWidth="3"
            fill="none"
            opacity="0.4"
          />
        </>
      )}

      {/* Flowing strands at the bottom */}
      {details.hasFlowingStrands && (
        <>
          <path
            d={`M 75 480 Q 65 530, 80 590 L 95 585 Q 85 540, 90 490 Z`}
            fill={hairDeepShadow}
            opacity="0.7"
          />
          <path
            d={`M 325 480 Q 335 530, 320 590 L 305 585 Q 315 540, 310 490 Z`}
            fill={hairDeepShadow}
            opacity="0.7"
          />
        </>
      )}
    </g>
  );

  const renderFrontHair = () => (
    <g className="hair-front">
      {/* Main hair cap/top */}
      <path
        d={`M 125 130
            Q 135 95, 200 90
            Q 265 95, 275 130
            Q 280 160, 275 190
            Q 270 175, 255 195
            Q 245 175, 230 195
            Q 215 175, 200 195
            Q 185 175, 170 195
            Q 155 175, 145 195
            Q 130 175, 125 190
            Q 120 160, 125 130
            Z`}
        fill="url(#hairMainGradient)"
      />

      {/* Hair highlight shine - key for anime look */}
      {details.hasShine && (
        <>
          <path
            d="M 155 105 Q 170 120, 160 160"
            stroke={hairHighlight}
            strokeWidth="6"
            fill="none"
            opacity="0.5"
            strokeLinecap="round"
          />
          <path
            d="M 175 100 Q 185 115, 180 150"
            stroke={hairHighlight}
            strokeWidth="4"
            fill="none"
            opacity="0.4"
            strokeLinecap="round"
          />
          <path
            d="M 225 105 Q 235 120, 230 155"
            stroke={hairHighlight}
            strokeWidth="5"
            fill="none"
            opacity="0.45"
            strokeLinecap="round"
          />
        </>
      )}

      {/* Side bangs - left */}
      <path
        d={`M 120 155
            Q 100 190, 95 240
            Q 92 270, 100 295
            L 115 285
            Q 115 250, 120 210
            Q 125 175, 130 155
            Z`}
        fill={hairColor}
      />

      {/* Side bang shadow */}
      {details.hasShadows && (
        <path
          d={`M 100 200 Q 95 240, 102 280 L 108 275 Q 105 240, 108 200 Z`}
          fill={hairShadow}
          opacity="0.5"
        />
      )}

      {/* Side bangs - right */}
      <path
        d={`M 280 155
            Q 300 190, 305 240
            Q 308 270, 300 295
            L 285 285
            Q 285 250, 280 210
            Q 275 175, 270 155
            Z`}
        fill={hairColor}
      />

      {/* Side bang shadow - right */}
      {details.hasShadows && (
        <path
          d={`M 300 200 Q 305 240, 298 280 L 292 275 Q 295 240, 292 200 Z`}
          fill={hairShadow}
          opacity="0.5"
        />
      )}

      {/* Extra hair volume top */}
      <ellipse cx="200" cy="88" rx="75" ry="28" fill={hairColor} />
      {details.hasHighlights && (
        <ellipse
          cx="200"
          cy="82"
          rx="50"
          ry="15"
          fill={hairMidtone}
          opacity="0.6"
        />
      )}

      {/* Ahoge (hair antenna) - signature anime element */}
      {details.hasAhoge && (
        <>
          <path
            d="M 195 68 Q 175 35, 198 25 Q 222 35, 205 68"
            fill={hairColor}
          />
          <path
            d="M 197 60 Q 185 45, 198 35"
            stroke={hairHighlight}
            strokeWidth="2"
            fill="none"
            opacity="0.5"
          />
        </>
      )}

      {/* Bangs strands for detail */}
      {details.hasStrands && (
        <>
          <path
            d="M 165 120 Q 160 150, 168 185"
            stroke={hairShadow}
            strokeWidth="8"
            fill="none"
            opacity="0.4"
          />
          <path
            d="M 185 115 Q 182 145, 188 180"
            stroke={hairShadow}
            strokeWidth="6"
            fill="none"
            opacity="0.35"
          />
          <path
            d="M 215 115 Q 218 145, 212 180"
            stroke={hairShadow}
            strokeWidth="6"
            fill="none"
            opacity="0.35"
          />
          <path
            d="M 235 120 Q 240 150, 232 185"
            stroke={hairShadow}
            strokeWidth="8"
            fill="none"
            opacity="0.4"
          />
        </>
      )}
    </g>
  );

  return (
    <g className="hair">
      {/* Gradient definitions */}
      <defs>
        <linearGradient
          id="hairMainGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor={hairHighlight} />
          <stop offset="30%" stopColor={hairMidtone} />
          <stop offset="70%" stopColor={hairColor} />
          <stop offset="100%" stopColor={hairShadow} />
        </linearGradient>
        <linearGradient
          id="hairSideGradient"
          x1="100%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor={hairMidtone} />
          <stop offset="50%" stopColor={hairColor} />
          <stop offset="100%" stopColor={hairDeepShadow} />
        </linearGradient>
      </defs>

      {(layer === 'back' || layer === 'all') && renderBackHair()}
      {(layer === 'front' || layer === 'all') && renderFrontHair()}
    </g>
  );
}

export default SVGHair;
