# Anime Avatar

A configurable AI anime avatar React component with animations, designed for use as an AI speaking avatar in web applications.

**[Live Demo](https://konard.github.io/anime-avatar)**

## Overview

This project provides a customizable anime-style avatar component built entirely with React and CSS. The avatar features natural animations like blinking, head movement, and various expressions, making it ideal for AI-powered applications where a visual character representation is needed for voice interaction or chat interfaces.

The avatar is designed as a **prototype** that can be extended to support:

- WebGL/Three.js for 3D rendering
- Voice input (Speech-to-Text) and output (Text-to-Speech)
- Local AI model integration for in-browser AI responses
- Export compatibility with Unreal Engine and Blender

## Features

- **Configurable Appearance**: Customize skin, hair, eye, and clothes colors in real-time
- **Multiple Animations**: Idle, happy, wave, nod, thinking, surprised expressions
- **Random Animation Cycling**: Animations play randomly at configurable intervals for natural behavior
- **Talking Mode**: Lip-sync animation for AI speaking scenarios
- **Natural Blinking**: Random blinking with configurable timing for realistic appearance
- **Preset Themes**: Quick appearance changes with built-in color presets (Default, Blonde, Dark, Redhead)
- **Responsive Design**: Works on desktop and mobile devices
- **CSS-Only Animations**: No external dependencies for smooth, performant animations
- **Reusable Component**: Easy to integrate into any React application

## Quick Start

### Prerequisites

- Node.js 20.0.0 or higher
- npm (comes with Node.js)

### Installation

```bash
# Clone the repository
git clone https://github.com/konard/anime-avatar.git
cd anime-avatar

# Install dependencies
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser to see the demo application.

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Usage

### Basic Usage

```jsx
import { Avatar } from './components/Avatar';

function App() {
  return <Avatar />;
}
```

### With Full Configuration

```jsx
import { Avatar } from './components/Avatar';

function App() {
  const config = {
    skinColor: '#ffd5c8',
    hairColor: '#2d1b4e',
    eyeColor: '#6b5ce7',
    clothesColor: '#ff6b9d',
    blinkInterval: 3000,
    animationSpeed: 1,
    enableIdleAnimation: true,
    enableRandomBlink: true,
  };

  return <Avatar config={config} isTalking={false} currentAnimation="idle" />;
}
```

### With Animation Cycling Hook

The `useAnimationCycle` hook provides automatic random animation cycling:

```jsx
import { Avatar } from './components/Avatar';
import { useAnimationCycle } from './hooks/useAnimationCycle';

function App() {
  const { currentAnimation, triggerAnimation } = useAnimationCycle({
    enabled: true,
    minInterval: 8000,
    maxInterval: 20000,
    animationDuration: 1500,
  });

  return (
    <div>
      <Avatar currentAnimation={currentAnimation} />
      <button onClick={() => triggerAnimation('wave')}>Wave</button>
      <button onClick={() => triggerAnimation('happy')}>Happy</button>
    </div>
  );
}
```

### With Talking Mode (for AI Voice Applications)

```jsx
import { useState } from 'react';
import { Avatar } from './components/Avatar';

function AISpeakingAvatar() {
  const [isTalking, setIsTalking] = useState(false);

  // Toggle talking when AI starts/stops speaking
  const handleAIResponse = (speaking) => {
    setIsTalking(speaking);
  };

  return <Avatar isTalking={isTalking} />;
}
```

## Configuration Options

### Avatar Configuration

| Option                | Type    | Default   | Description                            |
| --------------------- | ------- | --------- | -------------------------------------- |
| `skinColor`           | string  | `#ffd5c8` | Skin color (hex format)                |
| `hairColor`           | string  | `#2d1b4e` | Hair color (hex format)                |
| `eyeColor`            | string  | `#6b5ce7` | Eye/iris color (hex format)            |
| `clothesColor`        | string  | `#ff6b9d` | Clothes/outfit color (hex format)      |
| `blinkInterval`       | number  | `3000`    | Average time between blinks (ms)       |
| `animationSpeed`      | number  | `1`       | Animation speed multiplier (0.5x - 2x) |
| `enableIdleAnimation` | boolean | `true`    | Enable subtle idle breathing/sway      |
| `enableRandomBlink`   | boolean | `true`    | Enable random natural blinking         |

### Animation Cycle Hook Options

| Option              | Type     | Default        | Description                          |
| ------------------- | -------- | -------------- | ------------------------------------ |
| `animations`        | string[] | All animations | List of animations to cycle through  |
| `minInterval`       | number   | `5000`         | Minimum time between animations (ms) |
| `maxInterval`       | number   | `15000`        | Maximum time between animations (ms) |
| `animationDuration` | number   | `1000`         | How long each animation plays (ms)   |
| `enabled`           | boolean  | `true`         | Enable/disable animation cycling     |
| `excludeFromCycle`  | string[] | `['idle']`     | Animations to skip in random cycling |

## Available Animations

| Animation   | Description                                       |
| ----------- | ------------------------------------------------- |
| `idle`      | Default state with subtle breathing and head sway |
| `happy`     | Happy expression with squinting eyes and smile    |
| `wave`      | Waving hand animation for greetings               |
| `nod`       | Nodding head animation for acknowledgment         |
| `thinking`  | Raised eyebrow with thoughtful expression         |
| `surprised` | Wide-eyed surprised expression                    |

## Project Structure

```
anime-avatar/
├── .github/
│   └── workflows/
│       ├── ci.yml           # Lint, test, and build on PRs
│       └── deploy.yml       # Deploy to GitHub Pages on main
├── src/
│   ├── components/
│   │   ├── Avatar.jsx       # Main avatar component with all visual elements
│   │   └── ConfigPanel.jsx  # Configuration UI panel with controls
│   ├── hooks/
│   │   └── useAnimationCycle.js  # Hook for automatic animation cycling
│   ├── styles/
│   │   ├── index.css        # Global styles and layout
│   │   └── avatar.css       # Avatar-specific styles and animations
│   ├── App.jsx              # Demo application showcasing all features
│   └── main.jsx             # Entry point
├── tests/
│   └── Avatar.test.jsx      # Component tests
├── index.html               # HTML template
├── vite.config.js           # Vite configuration
├── eslint.config.js         # ESLint configuration
├── .prettierrc              # Prettier configuration
└── package.json             # Project dependencies and scripts
```

## Development

### Available Scripts

| Command                | Description                      |
| ---------------------- | -------------------------------- |
| `npm run dev`          | Start development server         |
| `npm run build`        | Build for production             |
| `npm run preview`      | Preview production build locally |
| `npm test`             | Run tests once                   |
| `npm run test:watch`   | Run tests in watch mode          |
| `npm run lint`         | Run ESLint                       |
| `npm run lint:fix`     | Run ESLint with auto-fix         |
| `npm run format`       | Format code with Prettier        |
| `npm run format:check` | Check code formatting            |
| `npm run check`        | Run both lint and format checks  |

### Code Quality

This project uses:

- **ESLint** for code linting with React-specific rules
- **Prettier** for consistent code formatting
- **Husky** for pre-commit hooks to ensure code quality
- **Vitest** for fast unit testing with React Testing Library

## Roadmap

This prototype serves as a foundation for more advanced features. See [GitHub Issues](https://github.com/konard/anime-avatar/issues) for planned enhancements:

- [WebGL/Three.js 3D avatar support](https://github.com/konard/anime-avatar/issues/3)
- [Voice input (STT) and output (TTS) integration](https://github.com/konard/anime-avatar/issues/4)
- [Local AI model integration (GPT)](https://github.com/konard/anime-avatar/issues/5)
- [Extended avatar customization (hairstyles, accessories)](https://github.com/konard/anime-avatar/issues/6)
- [Male character support](https://github.com/konard/anime-avatar/issues/7)
- [Unreal Engine and Blender export compatibility](https://github.com/konard/anime-avatar/issues/8)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code passes linting and tests before submitting:

```bash
npm run check
npm test
```

## License

[Unlicense](LICENSE) - This project is released into the Public Domain. You are free to use, modify, and distribute this code without any restrictions.
