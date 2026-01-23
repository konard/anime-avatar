import React from 'react';
import { DEFAULT_CONFIG, getDetailLevel } from './utils.js';
import SVGHead from './SVGHead.jsx';
import SVGBody from './SVGBody.jsx';
import SVGLegs from './SVGLegs.jsx';
import SVGBackground from './SVGBackground.jsx';

/**
 * SVG Character Component - Full character with all parts
 * This is the main component that combines all body parts
 * Can be rendered independently for testing
 */
function SVGCharacter({
  config = {},
  isBlinking = false,
  isTalking = false,
  currentAnimation = 'idle',
  detailLevel = 10,
  showBackground = true,
  showLegs = false, // Whether to show full body with legs
}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const legsDetails = getDetailLevel(detailLevel, 'legs');

  // Determine if legs should be shown
  const displayLegs = showLegs && legsDetails.shapes > 0;

  // ViewBox dimensions based on whether legs are shown
  const viewBoxHeight = displayLegs ? 1050 : 600;
  const viewBoxWidth = 400;

  return (
    <svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      xmlns="http://www.w3.org/2000/svg"
      className="avatar-svg"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Global filter definitions */}
      <defs>
        <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="2" dy="3" stdDeviation="4" floodOpacity="0.15" />
        </filter>
        <filter id="hairShine" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
          <feOffset dx="1" dy="1" />
          <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.3 0" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background */}
      {showBackground && (
        <SVGBackground
          detailLevel={detailLevel}
          showBackground={showBackground}
          viewBoxHeight={viewBoxHeight}
        />
      )}

      {/* Character group with drop shadow */}
      <g className="character-group" filter="url(#softShadow)">
        {/* Legs (if enabled and at higher detail levels) */}
        {displayLegs && (
          <SVGLegs config={mergedConfig} detailLevel={detailLevel} />
        )}

        {/* Body */}
        <SVGBody
          config={mergedConfig}
          detailLevel={detailLevel}
          animation={currentAnimation}
        />

        {/* Head (face + hair) */}
        <SVGHead
          config={mergedConfig}
          isBlinking={isBlinking}
          isTalking={isTalking}
          detailLevel={detailLevel}
        />
      </g>
    </svg>
  );
}

// Export available animations for use by parent components
SVGCharacter.ANIMATIONS = [
  'idle',
  'happy',
  'wave',
  'nod',
  'thinking',
  'surprised',
];

export default SVGCharacter;
