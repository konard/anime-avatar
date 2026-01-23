import React from 'react';
import { DEFAULT_CONFIG } from './utils.js';
import SVGFace from './SVGFace.jsx';
import SVGHair from './SVGHair.jsx';

/**
 * SVG Head Component - Combines face and hair
 * Can be rendered independently for testing
 */
function SVGHead({
  config = {},
  isBlinking = false,
  isTalking = false,
  detailLevel = 10,
}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  return (
    <g className="head">
      {/* Back hair layer first */}
      <SVGHair config={mergedConfig} detailLevel={detailLevel} layer="back" />

      {/* Face with all features */}
      <SVGFace
        config={mergedConfig}
        isBlinking={isBlinking}
        isTalking={isTalking}
        detailLevel={detailLevel}
      />

      {/* Front hair layer on top */}
      <SVGHair config={mergedConfig} detailLevel={detailLevel} layer="front" />
    </g>
  );
}

export default SVGHead;
