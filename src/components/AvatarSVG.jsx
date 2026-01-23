import React, { useState, useEffect } from 'react';
import '../styles/avatarSvg.css';

const DEFAULT_CONFIG = {
  skinColor: '#fad5c5',
  hairColor: '#b07850',
  eyeColor: '#4a90c2',
  clothesColor: '#ffffff',
  clothesSecondaryColor: '#1a3a5c',
  blinkInterval: 3000,
  animationSpeed: 1,
  enableIdleAnimation: true,
  enableRandomBlink: true,
  showBackground: true,
};

const ANIMATIONS = ['idle', 'happy', 'wave', 'nod', 'thinking', 'surprised'];

export function AvatarSVG({
  config = {},
  isTalking = false,
  currentAnimation = null,
}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const [isBlinking, setIsBlinking] = useState(false);
  const [activeAnimation, setActiveAnimation] = useState('idle');
  const [mouthState, setMouthState] = useState('normal');

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
  } = mergedConfig;

  // Derived colors
  const skinShadow = adjustColor(skinColor, -20);
  const hairHighlight = adjustColor(hairColor, 30);
  const hairShadow = adjustColor(hairColor, -30);

  return (
    <div className={`avatar-svg-container ${activeAnimation}`}>
      <svg
        viewBox="0 0 400 600"
        xmlns="http://www.w3.org/2000/svg"
        className="avatar-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Gradients for depth */}
          <linearGradient id="skinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={skinColor} />
            <stop offset="100%" stopColor={skinShadow} />
          </linearGradient>

          <linearGradient id="hairGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={hairHighlight} />
            <stop offset="50%" stopColor={hairColor} />
            <stop offset="100%" stopColor={hairShadow} />
          </linearGradient>

          <linearGradient id="eyeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={adjustColor(eyeColor, 30)} />
            <stop offset="50%" stopColor={eyeColor} />
            <stop offset="100%" stopColor={adjustColor(eyeColor, -30)} />
          </linearGradient>

          <linearGradient
            id="clothesGradient"
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor={clothesColor} />
            <stop offset="100%" stopColor={adjustColor(clothesColor, -15)} />
          </linearGradient>

          <radialGradient id="blushGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffb6c1" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ffb6c1" stopOpacity="0" />
          </radialGradient>

          {/* Background gradient */}
          <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#87ceeb" />
            <stop offset="100%" stopColor="#b0e0e6" />
          </linearGradient>

          {/* Filter for soft shadow */}
          <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.2" />
          </filter>

          {/* Eye shine filter */}
          <filter id="eyeShine">
            <feGaussianBlur stdDeviation="0.5" />
          </filter>
        </defs>

        {/* Background with cherry blossoms */}
        {showBackground && (
          <g className="background-layer">
            {/* Sky */}
            <rect
              x="0"
              y="0"
              width="400"
              height="600"
              fill="url(#skyGradient)"
            />

            {/* Cherry blossom trees - left */}
            <g className="cherry-tree-left" transform="translate(-50, 50)">
              <ellipse
                cx="100"
                cy="150"
                rx="120"
                ry="100"
                fill="#ffb7c5"
                opacity="0.9"
              />
              <ellipse
                cx="80"
                cy="180"
                rx="80"
                ry="60"
                fill="#ffc0cb"
                opacity="0.85"
              />
              <ellipse
                cx="130"
                cy="120"
                rx="90"
                ry="70"
                fill="#ffb7c5"
                opacity="0.8"
              />
            </g>

            {/* Cherry blossom trees - right */}
            <g className="cherry-tree-right" transform="translate(250, 30)">
              <ellipse
                cx="100"
                cy="150"
                rx="140"
                ry="120"
                fill="#ffb7c5"
                opacity="0.9"
              />
              <ellipse
                cx="120"
                cy="180"
                rx="100"
                ry="80"
                fill="#ffc0cb"
                opacity="0.85"
              />
              <ellipse
                cx="80"
                cy="100"
                rx="80"
                ry="60"
                fill="#ffb7c5"
                opacity="0.8"
              />
            </g>

            {/* Falling petals */}
            <g className="falling-petals">
              {[...Array(12)].map((_, i) => (
                <ellipse
                  key={i}
                  cx={50 + i * 30}
                  cy={100 + (i % 4) * 100}
                  rx="4"
                  ry="6"
                  fill="#ffb7c5"
                  opacity="0.7"
                  className={`petal petal-${i}`}
                />
              ))}
            </g>

            {/* Distant cityscape hint */}
            <rect
              x="0"
              y="520"
              width="400"
              height="80"
              fill="#e8e8e8"
              opacity="0.3"
            />
          </g>
        )}

        {/* Character group - apply animations here */}
        <g className="character-group" filter="url(#softShadow)">
          {/* Hair back layer */}
          <g className="hair-back">
            {/* Main hair mass */}
            <path
              d={`M 120 120
                  Q 80 150, 70 250
                  Q 65 350, 90 450
                  Q 100 480, 110 500
                  L 130 480
                  Q 140 400, 145 300
                  Q 148 250, 155 200
                  Z`}
              fill="url(#hairGradient)"
            />
            <path
              d={`M 280 120
                  Q 320 150, 330 250
                  Q 335 350, 310 450
                  Q 300 480, 290 500
                  L 270 480
                  Q 260 400, 255 300
                  Q 252 250, 245 200
                  Z`}
              fill="url(#hairGradient)"
            />
            {/* Side hair strands */}
            <path
              d={`M 100 200 Q 85 280, 95 380 Q 100 420, 105 450 L 120 440 Q 115 350, 120 280 Z`}
              fill={hairShadow}
            />
            <path
              d={`M 300 200 Q 315 280, 305 380 Q 300 420, 295 450 L 280 440 Q 285 350, 280 280 Z`}
              fill={hairShadow}
            />
          </g>

          {/* Neck */}
          <path
            d="M 175 320 L 175 370 Q 175 385, 185 390 L 215 390 Q 225 385, 225 370 L 225 320 Z"
            fill="url(#skinGradient)"
          />

          {/* Body - Sailor uniform */}
          <g className="body">
            {/* Main body/torso */}
            <path
              d={`M 120 390
                  Q 100 420, 90 500
                  L 90 600
                  L 310 600
                  L 310 500
                  Q 300 420, 280 390
                  Z`}
              fill="url(#clothesGradient)"
            />

            {/* Sailor collar */}
            <path
              d={`M 140 390
                  L 100 440
                  L 90 500
                  L 150 450
                  L 200 480
                  L 250 450
                  L 310 500
                  L 300 440
                  L 260 390
                  Q 230 400, 200 405
                  Q 170 400, 140 390
                  Z`}
              fill={clothesSecondaryColor}
            />

            {/* Collar stripes */}
            <path
              d="M 105 450 L 145 420 L 150 430 L 110 460 Z"
              fill={clothesColor}
              opacity="0.9"
            />
            <path
              d="M 295 450 L 255 420 L 250 430 L 290 460 Z"
              fill={clothesColor}
              opacity="0.9"
            />

            {/* Red bow/ribbon */}
            <g className="bow">
              <path
                d="M 180 420 Q 160 410, 150 420 Q 155 430, 175 430 Z"
                fill="#cc3333"
              />
              <path
                d="M 220 420 Q 240 410, 250 420 Q 245 430, 225 430 Z"
                fill="#cc3333"
              />
              <circle cx="200" cy="425" r="8" fill="#dd4444" />
              <path
                d="M 195 433 L 190 480 L 200 475 L 210 480 L 205 433 Z"
                fill="#cc3333"
              />
            </g>

            {/* Skirt */}
            <path
              d={`M 100 500
                  Q 90 520, 80 600
                  L 320 600
                  Q 310 520, 300 500
                  Z`}
              fill={clothesSecondaryColor}
            />
            {/* Skirt pleats */}
            {[...Array(6)].map((_, i) => (
              <line
                key={i}
                x1={120 + i * 30}
                y1="505"
                x2={100 + i * 35}
                y2="600"
                stroke={adjustColor(clothesSecondaryColor, -20)}
                strokeWidth="2"
                opacity="0.5"
              />
            ))}
          </g>

          {/* Arms */}
          <g className="arms">
            {/* Left arm */}
            <path
              d={`M 120 400
                  Q 80 430, 60 480
                  Q 50 510, 55 530
                  Q 60 540, 70 535
                  Q 85 520, 95 490
                  Q 110 450, 130 420
                  Z`}
              fill="url(#skinGradient)"
              className="left-arm"
            />
            {/* Right arm - posed touching hair */}
            <path
              d={`M 280 400
                  Q 310 380, 330 340
                  Q 345 310, 340 290
                  Q 335 280, 325 285
                  Q 310 300, 295 340
                  Q 280 380, 270 420
                  Z`}
              fill="url(#skinGradient)"
              className="right-arm"
            />
            {/* Right hand near hair */}
            <ellipse cx="330" cy="280" rx="15" ry="12" fill={skinColor} />
          </g>

          {/* Face/Head */}
          <g className="head">
            {/* Face shape */}
            <path
              d={`M 130 180
                  Q 120 200, 120 240
                  Q 120 280, 140 310
                  Q 170 350, 200 355
                  Q 230 350, 260 310
                  Q 280 280, 280 240
                  Q 280 200, 270 180
                  Q 250 130, 200 120
                  Q 150 130, 130 180
                  Z`}
              fill="url(#skinGradient)"
            />

            {/* Ears */}
            <ellipse cx="118" cy="230" rx="12" ry="18" fill={skinColor} />
            <ellipse cx="282" cy="230" rx="12" ry="18" fill={skinColor} />

            {/* Blush */}
            <ellipse
              cx="145"
              cy="275"
              rx="20"
              ry="12"
              fill="url(#blushGradient)"
            />
            <ellipse
              cx="255"
              cy="275"
              rx="20"
              ry="12"
              fill="url(#blushGradient)"
            />

            {/* Eyes */}
            <g className={`eyes ${isBlinking ? 'blinking' : ''}`}>
              {/* Left eye */}
              <g className="left-eye">
                {/* Eye white */}
                <ellipse cx="160" cy="240" rx="22" ry="28" fill="white" />
                {/* Iris */}
                <ellipse
                  cx="162"
                  cy="245"
                  rx="16"
                  ry="20"
                  fill="url(#eyeGradient)"
                />
                {/* Pupil */}
                <ellipse cx="164" cy="248" rx="8" ry="10" fill="#1a1a2e" />
                {/* Highlights */}
                <ellipse
                  cx="168"
                  cy="238"
                  rx="5"
                  ry="6"
                  fill="white"
                  opacity="0.9"
                />
                <ellipse
                  cx="158"
                  cy="252"
                  rx="3"
                  ry="3"
                  fill="white"
                  opacity="0.7"
                />
                {/* Eyelid for blinking */}
                <ellipse
                  cx="160"
                  cy="240"
                  rx="24"
                  ry="30"
                  fill={skinColor}
                  className="eyelid"
                />
              </g>

              {/* Right eye */}
              <g className="right-eye">
                {/* Eye white */}
                <ellipse cx="240" cy="240" rx="22" ry="28" fill="white" />
                {/* Iris */}
                <ellipse
                  cx="238"
                  cy="245"
                  rx="16"
                  ry="20"
                  fill="url(#eyeGradient)"
                />
                {/* Pupil */}
                <ellipse cx="236" cy="248" rx="8" ry="10" fill="#1a1a2e" />
                {/* Highlights */}
                <ellipse
                  cx="232"
                  cy="238"
                  rx="5"
                  ry="6"
                  fill="white"
                  opacity="0.9"
                />
                <ellipse
                  cx="242"
                  cy="252"
                  rx="3"
                  ry="3"
                  fill="white"
                  opacity="0.7"
                />
                {/* Eyelid for blinking */}
                <ellipse
                  cx="240"
                  cy="240"
                  rx="24"
                  ry="30"
                  fill={skinColor}
                  className="eyelid"
                />
              </g>
            </g>

            {/* Eyebrows */}
            <path
              d="M 140 210 Q 155 205, 175 210"
              stroke={hairColor}
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 225 210 Q 245 205, 260 210"
              stroke={hairColor}
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />

            {/* Nose - subtle */}
            <path
              d="M 198 275 Q 200 280, 202 275"
              stroke={skinShadow}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />

            {/* Mouth */}
            <g className={`mouth ${mouthState}`}>
              {mouthState === 'talking' ? (
                <ellipse
                  cx="200"
                  cy="310"
                  rx="12"
                  ry="8"
                  fill="#cc6666"
                  className="mouth-talking"
                />
              ) : (
                <path
                  d="M 188 305 Q 200 315, 212 305"
                  stroke="#cc6666"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  className="mouth-normal"
                />
              )}
            </g>
          </g>

          {/* Hair front layer */}
          <g className="hair-front">
            {/* Main bangs */}
            <path
              d={`M 130 120
                  Q 140 100, 200 95
                  Q 260 100, 270 120
                  Q 275 150, 270 180
                  L 250 200
                  Q 240 180, 230 195
                  Q 220 175, 200 190
                  Q 180 175, 170 195
                  Q 160 180, 150 200
                  L 130 180
                  Q 125 150, 130 120
                  Z`}
              fill="url(#hairGradient)"
            />

            {/* Hair highlights */}
            <path
              d="M 160 110 Q 170 130, 165 160"
              stroke={hairHighlight}
              strokeWidth="4"
              fill="none"
              opacity="0.6"
              strokeLinecap="round"
            />
            <path
              d="M 220 115 Q 225 135, 220 165"
              stroke={hairHighlight}
              strokeWidth="4"
              fill="none"
              opacity="0.6"
              strokeLinecap="round"
            />

            {/* Side bangs */}
            <path
              d={`M 125 150
                  Q 110 180, 105 220
                  Q 100 250, 108 270
                  L 118 260
                  Q 120 230, 125 200
                  Q 130 170, 135 150
                  Z`}
              fill={hairColor}
            />
            <path
              d={`M 275 150
                  Q 290 180, 295 220
                  Q 300 250, 292 270
                  L 282 260
                  Q 280 230, 275 200
                  Q 270 170, 265 150
                  Z`}
              fill={hairColor}
            />

            {/* Top hair volume */}
            <ellipse cx="200" cy="90" rx="70" ry="25" fill={hairColor} />

            {/* Ahoge (hair antenna) */}
            <path
              d="M 195 70 Q 180 40, 200 30 Q 220 40, 205 70"
              fill={hairColor}
              stroke={hairHighlight}
              strokeWidth="1"
            />
          </g>

          {/* Bag strap */}
          <path
            d="M 280 400 Q 300 420, 310 500 L 320 500 Q 310 410, 285 390 Z"
            fill="#333"
            opacity="0.8"
          />
        </g>
      </svg>
    </div>
  );
}

// Helper function to adjust color brightness
function adjustColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

AvatarSVG.ANIMATIONS = ANIMATIONS;
AvatarSVG.DEFAULT_CONFIG = DEFAULT_CONFIG;

export default AvatarSVG;
