import React from 'react';
import { adjustColor, getDetailLevel, DEFAULT_CONFIG } from './utils.js';

/**
 * SVG Legs Component - Anime-style legs like Genshin Impact
 * Can be rendered independently for testing
 */
function SVGLegs({ config = {}, detailLevel = 10 }) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const { skinColor } = mergedConfig;
  const details = getDetailLevel(detailLevel, 'legs');

  // Derived colors
  const skinHighlight = adjustColor(skinColor, 10);
  const skinShadow = adjustColor(skinColor, -20);
  const sockColor = '#f5f5f5';
  const shoeColor = '#3a2a1a';
  const shoeShadow = adjustColor(shoeColor, -20);

  if (details.shapes === 0) {
    return null;
  }

  return (
    <g className="legs">
      {/* Gradient definitions */}
      <defs>
        <linearGradient id="legGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={skinShadow} />
          <stop offset="30%" stopColor={skinColor} />
          <stop offset="70%" stopColor={skinHighlight} />
          <stop offset="100%" stopColor={skinShadow} />
        </linearGradient>
        <linearGradient id="sockGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={sockColor} />
          <stop offset="100%" stopColor="#e8e8e8" />
        </linearGradient>
        <linearGradient id="shoeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={shoeColor} />
          <stop offset="100%" stopColor={shoeShadow} />
        </linearGradient>
      </defs>

      {/* Left leg */}
      <g className="left-leg">
        {/* Upper leg (thigh - under skirt) */}
        <path
          d={`M 140 590
              Q 135 650, 138 720
              Q 140 760, 145 800
              L 175 800
              Q 178 760, 175 720
              Q 172 650, 168 590
              Z`}
          fill="url(#legGradient)"
        />

        {/* Lower leg (calf) */}
        <path
          d={`M 138 800
              Q 135 850, 140 920
              Q 142 960, 145 1000
              L 170 1000
              Q 172 960, 170 920
              Q 168 850, 172 800
              Z`}
          fill="url(#legGradient)"
        />

        {/* Knee shadow */}
        {details.hasDetails && (
          <ellipse
            cx="155"
            cy="800"
            rx="12"
            ry="6"
            fill={skinShadow}
            opacity="0.2"
          />
        )}

        {/* Socks */}
        {details.hasSocks && (
          <path
            d={`M 140 920
                Q 138 950, 142 1000
                L 168 1000
                Q 170 950, 168 920
                Z`}
            fill="url(#sockGradient)"
          />
        )}

        {/* Shoes */}
        {details.hasShoes && (
          <>
            <path
              d={`M 138 1000
                  Q 130 1005, 125 1015
                  Q 128 1030, 145 1035
                  L 170 1035
                  Q 185 1030, 182 1015
                  Q 178 1005, 172 1000
                  Z`}
              fill="url(#shoeGradient)"
            />
            {/* Shoe strap */}
            {details.hasDetails && (
              <rect
                x="135"
                y="1005"
                width="40"
                height="5"
                rx="2"
                fill="#2a1a0a"
              />
            )}
          </>
        )}
      </g>

      {/* Right leg */}
      <g className="right-leg">
        {/* Upper leg (thigh - under skirt) */}
        <path
          d={`M 232 590
              Q 228 650, 225 720
              Q 222 760, 225 800
              L 260 800
              Q 265 760, 262 720
              Q 265 650, 260 590
              Z`}
          fill="url(#legGradient)"
        />

        {/* Lower leg (calf) */}
        <path
          d={`M 228 800
              Q 225 850, 230 920
              Q 232 960, 235 1000
              L 260 1000
              Q 262 960, 260 920
              Q 258 850, 262 800
              Z`}
          fill="url(#legGradient)"
        />

        {/* Knee shadow */}
        {details.hasDetails && (
          <ellipse
            cx="245"
            cy="800"
            rx="12"
            ry="6"
            fill={skinShadow}
            opacity="0.2"
          />
        )}

        {/* Socks */}
        {details.hasSocks && (
          <path
            d={`M 230 920
                Q 228 950, 232 1000
                L 258 1000
                Q 260 950, 258 920
                Z`}
            fill="url(#sockGradient)"
          />
        )}

        {/* Shoes */}
        {details.hasShoes && (
          <>
            <path
              d={`M 232 1000
                  Q 220 1005, 218 1015
                  Q 222 1030, 240 1035
                  L 265 1035
                  Q 280 1030, 278 1015
                  Q 272 1005, 262 1000
                  Z`}
              fill="url(#shoeGradient)"
            />
            {/* Shoe strap */}
            {details.hasDetails && (
              <rect
                x="225"
                y="1005"
                width="40"
                height="5"
                rx="2"
                fill="#2a1a0a"
              />
            )}
          </>
        )}
      </g>
    </g>
  );
}

export default SVGLegs;
