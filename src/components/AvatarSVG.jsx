/* eslint-disable max-lines-per-function */
import React, { useState, useEffect, useMemo } from 'react';
import '../styles/avatarSvg.css';
import { adjustColor, getDetailLevel, DEFAULT_CONFIG } from './svg/utils.js';
import SVGLegs from './svg/SVGLegs.jsx';

const ANIMATIONS = ['idle', 'happy', 'wave', 'nod', 'thinking', 'surprised'];

/**
 * High-quality anime-style SVG Avatar component
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

  // Get detail level from config (default to max)
  const detailLevel = mergedConfig.detailLevel || 10;

  // Handle blinking
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

  // Handle current animation
  useEffect(() => {
    if (currentAnimation && ANIMATIONS.includes(currentAnimation)) {
      setActiveAnimation(currentAnimation);
    } else if (mergedConfig.enableIdleAnimation) {
      setActiveAnimation('idle');
    }
  }, [currentAnimation, mergedConfig.enableIdleAnimation]);

  // Handle talking state
  useEffect(() => {
    if (isTalking) {
      setMouthState('talking');
    } else {
      setMouthState('normal');
    }
  }, [isTalking]);

  const {
    skinColor,
    hairColor,
    eyeColor,
    clothesColor,
    clothesSecondaryColor,
    showBackground,
    showLegs,
  } = mergedConfig;

  // Get legs detail to determine if they should be shown
  const legsDetails = getDetailLevel(detailLevel, 'legs');
  const displayLegs = showLegs && legsDetails.shapes > 0;

  // ViewBox dimensions based on whether legs are shown
  const viewBoxHeight = displayLegs ? 1050 : 600;
  const viewBoxWidth = 400;

  // Get detail settings for each component
  const faceDetails = getDetailLevel(detailLevel, 'face');
  const hairDetails = getDetailLevel(detailLevel, 'hair');
  const eyeDetails = getDetailLevel(detailLevel, 'eyes');
  const bodyDetails = getDetailLevel(detailLevel, 'body');
  const bgDetails = getDetailLevel(detailLevel, 'background');

  // Memoize derived colors to avoid recalculation
  const colors = useMemo(
    () => ({
      skinHighlight: adjustColor(skinColor, 15),
      skinShadow: adjustColor(skinColor, -25),
      skinDeepShadow: adjustColor(skinColor, -40),
      hairHighlight: adjustColor(hairColor, 40),
      hairMidtone: adjustColor(hairColor, 15),
      hairShadow: adjustColor(hairColor, -25),
      hairDeepShadow: adjustColor(hairColor, -45),
      eyeHighlight: adjustColor(eyeColor, 35),
      eyeShadow: adjustColor(eyeColor, -30),
      clothesShadow: adjustColor(clothesColor, -20),
      collarHighlight: adjustColor(clothesSecondaryColor, 20),
    }),
    [skinColor, hairColor, eyeColor, clothesColor, clothesSecondaryColor]
  );

  // Memoize petal positions for performance
  const petals = useMemo(() => {
    if (!bgDetails.hasPetals) {
      return [];
    }
    return [...Array(20)].map((_, i) => ({
      x: 30 + ((i * 19) % 360),
      y: 50 + ((i * 37) % 400),
      rotation: i * 30,
      opacity: 0.6 + (i % 4) * 0.1,
    }));
  }, [bgDetails.hasPetals]);

  // Memoize buildings for performance
  const buildings = useMemo(() => {
    if (!bgDetails.hasCity) {
      return [];
    }
    return [...Array(12)].map((_, i) => ({
      x: i * 35 + Math.floor(i * 0.5),
      y: 450 + (i % 3) * 15,
      width: 20 + (i % 3) * 5,
      height: 150 - (i % 4) * 15,
      opacity: 0.3 + (i % 3) * 0.1,
    }));
  }, [bgDetails.hasCity]);

  return (
    <div className={`avatar-svg-container ${activeAnimation}`}>
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        className="avatar-svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Advanced gradients for realistic shading */}
          <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#5bb5e8" />
            <stop offset="40%" stopColor="#87ceeb" />
            <stop offset="100%" stopColor="#b8e4f9" />
          </linearGradient>

          <linearGradient id="skinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.skinHighlight} />
            <stop offset="50%" stopColor={skinColor} />
            <stop offset="100%" stopColor={colors.skinShadow} />
          </linearGradient>

          <radialGradient id="skinRadial" cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor={colors.skinHighlight} />
            <stop offset="60%" stopColor={skinColor} />
            <stop offset="100%" stopColor={colors.skinShadow} />
          </radialGradient>

          <linearGradient
            id="hairMainGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor={colors.hairHighlight} />
            <stop offset="30%" stopColor={colors.hairMidtone} />
            <stop offset="70%" stopColor={hairColor} />
            <stop offset="100%" stopColor={colors.hairShadow} />
          </linearGradient>

          <linearGradient
            id="hairSideGradient"
            x1="100%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor={colors.hairMidtone} />
            <stop offset="50%" stopColor={hairColor} />
            <stop offset="100%" stopColor={colors.hairDeepShadow} />
          </linearGradient>

          <linearGradient id="eyeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.eyeHighlight} />
            <stop offset="40%" stopColor={eyeColor} />
            <stop offset="100%" stopColor={colors.eyeShadow} />
          </linearGradient>

          <radialGradient id="eyeRadial" cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor={colors.eyeHighlight} />
            <stop offset="50%" stopColor={eyeColor} />
            <stop offset="100%" stopColor={colors.eyeShadow} />
          </radialGradient>

          <linearGradient
            id="clothesGradient"
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor={clothesColor} />
            <stop offset="100%" stopColor={colors.clothesShadow} />
          </linearGradient>

          <linearGradient id="collarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.collarHighlight} />
            <stop offset="100%" stopColor={clothesSecondaryColor} />
          </linearGradient>

          <radialGradient id="blushGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffb6c1" stopOpacity="0.5" />
            <stop offset="70%" stopColor="#ffb6c1" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ffb6c1" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="ribbonGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e84444" />
            <stop offset="50%" stopColor="#cc3333" />
            <stop offset="100%" stopColor="#aa2222" />
          </linearGradient>

          {/* Filters for soft effects */}
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="3" stdDeviation="4" floodOpacity="0.15" />
          </filter>

          <filter id="hairShine" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
            <feOffset dx="1" dy="1" />
            <feComposite
              in2="SourceAlpha"
              operator="arithmetic"
              k2="-1"
              k3="1"
            />
            <feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.3 0" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background with cherry blossoms and scene */}
        {showBackground && bgDetails.shapes > 0 && (
          <g className="background-layer">
            {/* Sky */}
            <rect
              x="0"
              y="0"
              width="400"
              height="600"
              fill="url(#skyGradient)"
            />

            {/* Distant cityscape */}
            {bgDetails.hasCity && (
              <g className="cityscape" opacity="0.3">
                <rect x="0" y="480" width="400" height="120" fill="#c8d4e0" />
                {buildings.map((b, i) => (
                  <rect
                    key={i}
                    x={b.x}
                    y={b.y}
                    width={b.width}
                    height={b.height}
                    fill={`rgba(180, 190, 200, ${b.opacity})`}
                  />
                ))}
              </g>
            )}

            {/* Bridge/fence in middle ground */}
            {bgDetails.hasFence && (
              <g className="fence">
                <rect x="0" y="520" width="400" height="8" fill="#e8ddd0" />
                <rect
                  x="0"
                  y="528"
                  width="400"
                  height="72"
                  fill="#d4c8b8"
                  opacity="0.4"
                />
                {[...Array(10)].map((_, i) => (
                  <g key={i}>
                    <rect
                      x={i * 45 + 10}
                      y="490"
                      width="4"
                      height="40"
                      fill="#b8a898"
                    />
                    <rect
                      x={i * 45 + 8}
                      y="505"
                      width="8"
                      height="3"
                      fill="#c8b8a8"
                    />
                  </g>
                ))}
                <rect x="0" y="500" width="400" height="3" fill="#c8b8a8" />
                <rect x="0" y="515" width="400" height="3" fill="#c8b8a8" />
              </g>
            )}

            {/* Power lines */}
            {bgDetails.hasPowerLines && (
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

            {/* Cherry blossom trees - left */}
            {bgDetails.hasTrees && (
              <g className="cherry-tree-left">
                <path
                  d="M 40 600 Q 35 500, 50 400 Q 55 350, 45 300"
                  stroke="#5c4033"
                  strokeWidth="15"
                  fill="none"
                />
                <path
                  d="M 45 350 Q 20 300, 10 250"
                  stroke="#5c4033"
                  strokeWidth="8"
                  fill="none"
                />
                <path
                  d="M 50 320 Q 80 280, 90 220"
                  stroke="#5c4033"
                  strokeWidth="6"
                  fill="none"
                />
                {[
                  { cx: 30, cy: 180, r: 60 },
                  { cx: -10, cy: 220, r: 50 },
                  { cx: 70, cy: 150, r: 55 },
                  { cx: 50, cy: 100, r: 45 },
                  { cx: 90, cy: 200, r: 40 },
                  { cx: 10, cy: 130, r: 50 },
                  { cx: 60, cy: 250, r: 35 },
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
            {bgDetails.hasTrees && (
              <g className="cherry-tree-right">
                <path
                  d="M 370 600 Q 380 480, 360 380 Q 350 320, 370 260"
                  stroke="#5c4033"
                  strokeWidth="18"
                  fill="none"
                />
                <path
                  d="M 360 350 Q 400 300, 420 240"
                  stroke="#5c4033"
                  strokeWidth="10"
                  fill="none"
                />
                <path
                  d="M 365 300 Q 330 260, 320 200"
                  stroke="#5c4033"
                  strokeWidth="7"
                  fill="none"
                />
                {[
                  { cx: 380, cy: 150, r: 70 },
                  { cx: 420, cy: 200, r: 60 },
                  { cx: 340, cy: 180, r: 55 },
                  { cx: 360, cy: 80, r: 50 },
                  { cx: 400, cy: 120, r: 45 },
                  { cx: 320, cy: 130, r: 40 },
                  { cx: 390, cy: 250, r: 45 },
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
            {bgDetails.hasPetals && (
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
        )}

        {/* Character */}
        <g className="character-group" filter="url(#softShadow)">
          {/* Hair back layer - long flowing hair */}
          {hairDetails.shapes > 0 && (
            <g className="hair-back">
              <path
                d={`M 110 130 Q 70 180, 60 280 Q 50 380, 70 480 Q 80 540, 95 580 Q 100 590, 110 585 Q 130 550, 140 480 Q 150 400, 155 320 Q 158 260, 160 200 Z`}
                fill="url(#hairSideGradient)"
              />
              <path
                d={`M 290 130 Q 330 180, 340 280 Q 350 380, 330 480 Q 320 540, 305 580 Q 300 590, 290 585 Q 270 550, 260 480 Q 250 400, 245 320 Q 242 260, 240 200 Z`}
                fill="url(#hairSideGradient)"
              />
              {hairDetails.hasStrands && (
                <>
                  <path
                    d={`M 95 200 Q 75 300, 85 420 Q 90 480, 100 530 L 115 520 Q 110 450, 115 360 Q 118 280, 115 200 Z`}
                    fill={colors.hairShadow}
                  />
                  <path
                    d={`M 305 200 Q 325 300, 315 420 Q 310 480, 300 530 L 285 520 Q 290 450, 285 360 Q 282 280, 285 200 Z`}
                    fill={colors.hairShadow}
                  />
                </>
              )}
              {hairDetails.hasHighlights && (
                <>
                  <path
                    d="M 85 250 Q 80 320, 88 400"
                    stroke={colors.hairHighlight}
                    strokeWidth="3"
                    fill="none"
                    opacity="0.4"
                  />
                  <path
                    d="M 315 250 Q 320 320, 312 400"
                    stroke={colors.hairHighlight}
                    strokeWidth="3"
                    fill="none"
                    opacity="0.4"
                  />
                </>
              )}
            </g>
          )}

          {/* Neck */}
          {bodyDetails.shapes > 0 && (
            <>
              <path
                d="M 175 320 L 173 375 Q 175 392, 190 395 L 210 395 Q 225 392, 227 375 L 225 320 Z"
                fill="url(#skinGradient)"
              />
              <ellipse
                cx="200"
                cy="330"
                rx="20"
                ry="8"
                fill={colors.skinShadow}
                opacity="0.3"
              />
            </>
          )}

          {/* Body - Sailor uniform */}
          {bodyDetails.shapes > 0 && bodyDetails.hasClothes && (
            <g className="body">
              <path
                d={`M 125 395 Q 105 420, 95 480 Q 90 530, 90 600 L 310 600 Q 310 530, 305 480 Q 295 420, 275 395 Z`}
                fill="url(#clothesGradient)"
              />

              {bodyDetails.hasCollar && (
                <>
                  <path
                    d={`M 145 395 Q 130 410, 125 430 L 115 480 Q 150 450, 200 455 Q 250 450, 285 480 L 275 430 Q 270 410, 255 395 Q 225 400, 200 402 Q 175 400, 145 395 Z`}
                    fill="url(#collarGradient)"
                  />
                  <path
                    d={`M 148 395 L 110 460 L 100 500 L 155 455 L 195 475 L 200 470 Z`}
                    fill="url(#collarGradient)"
                  />
                  <path
                    d={`M 252 395 L 290 460 L 300 500 L 245 455 L 205 475 L 200 470 Z`}
                    fill="url(#collarGradient)"
                  />
                  {bodyDetails.hasDetails && (
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

              {bodyDetails.hasBow && (
                <g className="bow" filter="url(#softGlow)">
                  <path
                    d={`M 180 420 Q 155 408, 145 420 Q 148 435, 175 435 Z`}
                    fill="url(#ribbonGradient)"
                  />
                  <path
                    d={`M 220 420 Q 245 408, 255 420 Q 252 435, 225 435 Z`}
                    fill="url(#ribbonGradient)"
                  />
                  <ellipse cx="200" cy="425" rx="10" ry="8" fill="#dd4444" />
                  <ellipse
                    cx="198"
                    cy="423"
                    rx="4"
                    ry="3"
                    fill="#ee6666"
                    opacity="0.6"
                  />
                  <path
                    d="M 195 433 L 188 485 L 200 478 L 212 485 L 205 433 Z"
                    fill="url(#ribbonGradient)"
                  />
                </g>
              )}

              {bodyDetails.hasSkirt && (
                <>
                  <path
                    d={`M 105 500 Q 90 530, 75 600 L 325 600 Q 310 530, 295 500 Z`}
                    fill={clothesSecondaryColor}
                  />
                  {bodyDetails.hasDetails &&
                    [...Array(8)].map((_, i) => (
                      <path
                        key={i}
                        d={`M ${115 + i * 25} 505 L ${95 + i * 28} 600`}
                        stroke={adjustColor(clothesSecondaryColor, -25)}
                        strokeWidth="2"
                        opacity="0.6"
                      />
                    ))}
                  <path
                    d="M 150 510 Q 200 505, 250 510"
                    stroke={adjustColor(clothesSecondaryColor, 20)}
                    strokeWidth="2"
                    fill="none"
                    opacity="0.4"
                  />
                </>
              )}
            </g>
          )}

          {/* Legs (if enabled and detail level supports it) */}
          {displayLegs && (
            <SVGLegs config={mergedConfig} detailLevel={detailLevel} />
          )}

          {/* Arms */}
          {bodyDetails.hasArms && (
            <g className="arms">
              <path
                d={`M 125 400 Q 90 430, 70 475 Q 55 510, 58 540 Q 62 555, 75 550 Q 95 530, 105 495 Q 120 450, 135 415 Z`}
                fill="url(#skinRadial)"
                className="left-arm"
              />
              <ellipse cx="65" cy="545" rx="12" ry="10" fill={skinColor} />
              <path
                d={`M 275 400 Q 305 375, 325 340 Q 342 305, 335 280 Q 330 268, 318 275 Q 300 295, 288 335 Q 275 375, 268 415 Z`}
                fill="url(#skinRadial)"
                className="right-arm"
              />
              <ellipse cx="328" cy="272" rx="14" ry="12" fill={skinColor} />
              <ellipse cx="335" cy="265" rx="4" ry="6" fill={skinColor} />
            </g>
          )}

          {/* Face/Head */}
          {faceDetails.shapes > 0 && (
            <g className="head">
              <path
                d={`M 130 185 Q 118 210, 118 245 Q 118 285, 135 315 Q 155 345, 175 355 Q 190 362, 200 363 Q 210 362, 225 355 Q 245 345, 265 315 Q 282 285, 282 245 Q 282 210, 270 185 Q 250 135, 200 125 Q 150 135, 130 185 Z`}
                fill="url(#skinRadial)"
              />

              {faceDetails.hasShadows && (
                <>
                  <path
                    d={`M 125 220 Q 120 260, 135 300 Q 130 280, 125 220 Z`}
                    fill={colors.skinShadow}
                    opacity="0.3"
                  />
                  <path
                    d={`M 275 220 Q 280 260, 265 300 Q 270 280, 275 220 Z`}
                    fill={colors.skinShadow}
                    opacity="0.3"
                  />
                </>
              )}

              {faceDetails.hasEars && (
                <>
                  <ellipse cx="116" cy="235" rx="10" ry="16" fill={skinColor} />
                  <ellipse cx="284" cy="235" rx="10" ry="16" fill={skinColor} />
                  <ellipse
                    cx="116"
                    cy="235"
                    rx="5"
                    ry="10"
                    fill={colors.skinShadow}
                    opacity="0.3"
                  />
                  <ellipse
                    cx="284"
                    cy="235"
                    rx="5"
                    ry="10"
                    fill={colors.skinShadow}
                    opacity="0.3"
                  />
                </>
              )}

              {faceDetails.hasBlush && (
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

              {/* Eyes - highly detailed anime style */}
              {eyeDetails.shapes > 0 && (
                <g className={`eyes ${isBlinking ? 'blinking' : ''}`}>
                  {/* Left eye */}
                  <g className="left-eye">
                    {eyeDetails.hasEyelashes && (
                      <path
                        d="M 138 218 Q 160 210, 182 218"
                        stroke={colors.skinDeepShadow}
                        strokeWidth="1.5"
                        fill="none"
                        opacity="0.4"
                      />
                    )}
                    <ellipse cx="160" cy="245" rx="24" ry="30" fill="white" />
                    {eyeDetails.hasHighlights && (
                      <ellipse
                        cx="160"
                        cy="235"
                        rx="22"
                        ry="15"
                        fill="#e8e8f0"
                        opacity="0.5"
                      />
                    )}
                    <ellipse
                      cx="162"
                      cy="250"
                      rx="18"
                      ry="22"
                      fill="url(#eyeRadial)"
                    />
                    {eyeDetails.hasPatterns &&
                      [...Array(8)].map((_, i) => (
                        <line
                          key={i}
                          x1="162"
                          y1="250"
                          x2={162 + Math.cos((i * Math.PI) / 4) * 16}
                          y2={250 + Math.sin((i * Math.PI) / 4) * 20}
                          stroke={colors.eyeShadow}
                          strokeWidth="1"
                          opacity="0.3"
                        />
                      ))}
                    <ellipse cx="164" cy="253" rx="9" ry="11" fill="#1a1a2e" />
                    {eyeDetails.hasHighlights && (
                      <ellipse
                        cx="170"
                        cy="240"
                        rx="6"
                        ry="7"
                        fill="white"
                        opacity="0.95"
                      />
                    )}
                    {eyeDetails.hasReflections && (
                      <ellipse
                        cx="155"
                        cy="258"
                        rx="3"
                        ry="4"
                        fill="white"
                        opacity="0.7"
                      />
                    )}
                    {eyeDetails.hasSparkles && (
                      <circle
                        cx="168"
                        cy="245"
                        r="2"
                        fill="white"
                        opacity="0.8"
                      />
                    )}
                    {eyeDetails.hasEyelashes && (
                      <>
                        <path
                          d="M 136 230 Q 150 218, 160 220 Q 170 218, 184 230"
                          stroke="#2a2a3a"
                          strokeWidth="3"
                          fill="none"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 138 228 Q 135 222, 132 218"
                          stroke="#2a2a3a"
                          strokeWidth="1.5"
                          fill="none"
                        />
                        <path
                          d="M 182 228 Q 186 224, 190 222"
                          stroke="#2a2a3a"
                          strokeWidth="1.5"
                          fill="none"
                        />
                        <path
                          d="M 142 265 Q 160 272, 178 265"
                          stroke="#554455"
                          strokeWidth="1"
                          fill="none"
                          opacity="0.5"
                        />
                      </>
                    )}
                    <ellipse
                      cx="160"
                      cy="245"
                      rx="26"
                      ry="32"
                      fill={skinColor}
                      className="eyelid"
                    />
                  </g>

                  {/* Right eye */}
                  <g className="right-eye">
                    {eyeDetails.hasEyelashes && (
                      <path
                        d="M 218 218 Q 240 210, 262 218"
                        stroke={colors.skinDeepShadow}
                        strokeWidth="1.5"
                        fill="none"
                        opacity="0.4"
                      />
                    )}
                    <ellipse cx="240" cy="245" rx="24" ry="30" fill="white" />
                    {eyeDetails.hasHighlights && (
                      <ellipse
                        cx="240"
                        cy="235"
                        rx="22"
                        ry="15"
                        fill="#e8e8f0"
                        opacity="0.5"
                      />
                    )}
                    <ellipse
                      cx="238"
                      cy="250"
                      rx="18"
                      ry="22"
                      fill="url(#eyeRadial)"
                    />
                    {eyeDetails.hasPatterns &&
                      [...Array(8)].map((_, i) => (
                        <line
                          key={i}
                          x1="238"
                          y1="250"
                          x2={238 + Math.cos((i * Math.PI) / 4) * 16}
                          y2={250 + Math.sin((i * Math.PI) / 4) * 20}
                          stroke={colors.eyeShadow}
                          strokeWidth="1"
                          opacity="0.3"
                        />
                      ))}
                    <ellipse cx="236" cy="253" rx="9" ry="11" fill="#1a1a2e" />
                    {eyeDetails.hasHighlights && (
                      <ellipse
                        cx="230"
                        cy="240"
                        rx="6"
                        ry="7"
                        fill="white"
                        opacity="0.95"
                      />
                    )}
                    {eyeDetails.hasReflections && (
                      <ellipse
                        cx="245"
                        cy="258"
                        rx="3"
                        ry="4"
                        fill="white"
                        opacity="0.7"
                      />
                    )}
                    {eyeDetails.hasSparkles && (
                      <circle
                        cx="232"
                        cy="245"
                        r="2"
                        fill="white"
                        opacity="0.8"
                      />
                    )}
                    {eyeDetails.hasEyelashes && (
                      <>
                        <path
                          d="M 216 230 Q 230 218, 240 220 Q 250 218, 264 230"
                          stroke="#2a2a3a"
                          strokeWidth="3"
                          fill="none"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 218 228 Q 214 224, 210 222"
                          stroke="#2a2a3a"
                          strokeWidth="1.5"
                          fill="none"
                        />
                        <path
                          d="M 262 228 Q 265 222, 268 218"
                          stroke="#2a2a3a"
                          strokeWidth="1.5"
                          fill="none"
                        />
                        <path
                          d="M 222 265 Q 240 272, 258 265"
                          stroke="#554455"
                          strokeWidth="1"
                          fill="none"
                          opacity="0.5"
                        />
                      </>
                    )}
                    <ellipse
                      cx="240"
                      cy="245"
                      rx="26"
                      ry="32"
                      fill={skinColor}
                      className="eyelid"
                    />
                  </g>
                </g>
              )}

              {/* Eyebrows */}
              {faceDetails.hasEyes && (
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

              {/* Nose */}
              {faceDetails.hasNose && (
                <>
                  <path
                    d="M 197 285 Q 200 292, 203 285"
                    stroke={colors.skinShadow}
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                  />
                  {faceDetails.hasHighlights && (
                    <ellipse
                      cx="200"
                      cy="278"
                      rx="3"
                      ry="2"
                      fill={colors.skinHighlight}
                      opacity="0.4"
                    />
                  )}
                </>
              )}

              {/* Mouth */}
              {faceDetails.hasMouth && (
                <g className={`mouth ${mouthState}`}>
                  {mouthState === 'talking' ? (
                    <g>
                      <ellipse
                        cx="200"
                        cy="318"
                        rx="14"
                        ry="10"
                        fill="#c46666"
                        className="mouth-talking"
                      />
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
                    </g>
                  ) : (
                    <g>
                      <path
                        d="M 188 312 Q 200 322, 212 312"
                        stroke="#cc6666"
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                        className="mouth-normal"
                      />
                      <path
                        d="M 193 314 Q 200 318, 207 314"
                        stroke="#ffaaaa"
                        strokeWidth="1"
                        fill="none"
                        opacity="0.5"
                      />
                    </g>
                  )}
                </g>
              )}
            </g>
          )}

          {/* Hair front layer - detailed bangs */}
          {hairDetails.shapes > 0 && (
            <g className="hair-front" filter="url(#hairShine)">
              <path
                d={`M 125 130 Q 135 95, 200 90 Q 265 95, 275 130 Q 280 160, 275 190 Q 270 175, 255 195 Q 245 175, 230 195 Q 215 175, 200 195 Q 185 175, 170 195 Q 155 175, 145 195 Q 130 175, 125 190 Q 120 160, 125 130 Z`}
                fill="url(#hairMainGradient)"
              />

              {hairDetails.hasShine && (
                <>
                  <path
                    d="M 155 105 Q 170 120, 160 160"
                    stroke={colors.hairHighlight}
                    strokeWidth="6"
                    fill="none"
                    opacity="0.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 175 100 Q 185 115, 180 150"
                    stroke={colors.hairHighlight}
                    strokeWidth="4"
                    fill="none"
                    opacity="0.4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 225 105 Q 235 120, 230 155"
                    stroke={colors.hairHighlight}
                    strokeWidth="5"
                    fill="none"
                    opacity="0.45"
                    strokeLinecap="round"
                  />
                </>
              )}

              <path
                d={`M 120 155 Q 100 190, 95 240 Q 92 270, 100 295 L 115 285 Q 115 250, 120 210 Q 125 175, 130 155 Z`}
                fill={hairColor}
              />
              {hairDetails.hasShadows && (
                <path
                  d={`M 100 200 Q 95 240, 102 280 L 108 275 Q 105 240, 108 200 Z`}
                  fill={colors.hairShadow}
                  opacity="0.5"
                />
              )}

              <path
                d={`M 280 155 Q 300 190, 305 240 Q 308 270, 300 295 L 285 285 Q 285 250, 280 210 Q 275 175, 270 155 Z`}
                fill={hairColor}
              />
              {hairDetails.hasShadows && (
                <path
                  d={`M 300 200 Q 305 240, 298 280 L 292 275 Q 295 240, 292 200 Z`}
                  fill={colors.hairShadow}
                  opacity="0.5"
                />
              )}

              <ellipse cx="200" cy="88" rx="75" ry="28" fill={hairColor} />
              {hairDetails.hasHighlights && (
                <ellipse
                  cx="200"
                  cy="82"
                  rx="50"
                  ry="15"
                  fill={colors.hairMidtone}
                  opacity="0.6"
                />
              )}

              {hairDetails.hasAhoge && (
                <>
                  <path
                    d="M 195 68 Q 175 35, 198 25 Q 222 35, 205 68"
                    fill={hairColor}
                  />
                  <path
                    d="M 197 60 Q 185 45, 198 35"
                    stroke={colors.hairHighlight}
                    strokeWidth="2"
                    fill="none"
                    opacity="0.5"
                  />
                </>
              )}
            </g>
          )}

          {/* Bag strap */}
          {bodyDetails.hasBag && (
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
      </svg>
    </div>
  );
}

AvatarSVG.ANIMATIONS = ANIMATIONS;
AvatarSVG.DEFAULT_CONFIG = DEFAULT_CONFIG;

export default AvatarSVG;
