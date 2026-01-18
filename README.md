# Anime Avatar

A configurable AI anime avatar React component with animations.

**[Live Demo](https://konard.github.io/anime-avatar)**

## Features

- **Configurable Appearance**: Customize skin, hair, eye, and clothes colors
- **Multiple Animations**: Idle, happy, wave, nod, thinking, surprised
- **Random Animation Cycling**: Animations play randomly at configurable intervals
- **Talking Mode**: Lip-sync animation for AI speaking scenarios
- **Responsive Design**: Works on desktop and mobile devices
- **CSS-Only Animations**: No external dependencies for animations
- **Reusable Component**: Easy to integrate into React applications

## Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

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

### With Configuration

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

### With Animation Hook

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
    </div>
  );
}
```

## Configuration Options

| Option                | Type    | Default   | Description                 |
| --------------------- | ------- | --------- | --------------------------- |
| `skinColor`           | string  | `#ffd5c8` | Skin color (hex)            |
| `hairColor`           | string  | `#2d1b4e` | Hair color (hex)            |
| `eyeColor`            | string  | `#6b5ce7` | Eye color (hex)             |
| `clothesColor`        | string  | `#ff6b9d` | Clothes color (hex)         |
| `blinkInterval`       | number  | `3000`    | Average blink interval (ms) |
| `animationSpeed`      | number  | `1`       | Animation speed multiplier  |
| `enableIdleAnimation` | boolean | `true`    | Enable idle breathing/sway  |
| `enableRandomBlink`   | boolean | `true`    | Enable random blinking      |

## Available Animations

- `idle` - Default state with subtle breathing and head sway
- `happy` - Happy expression with squinting eyes
- `wave` - Waving hand animation
- `nod` - Nodding head animation
- `thinking` - Raised eyebrow thinking expression
- `surprised` - Wide-eyed surprised expression

## Project Structure

```
src/
├── components/
│   ├── Avatar.jsx       # Main avatar component
│   └── ConfigPanel.jsx  # Configuration UI panel
├── hooks/
│   └── useAnimationCycle.js  # Animation cycling hook
├── styles/
│   ├── index.css        # Global styles
│   └── avatar.css       # Avatar-specific styles
├── App.jsx              # Demo application
└── main.jsx             # Entry point
```

## Future Plans

See [GitHub Issues](https://github.com/konard/anime-avatar/issues) for planned features:

- WebGL/Three.js 3D avatar support
- Voice input (STT) and output (TTS) integration
- Local AI model integration (GPT)
- More customization options (hairstyles, accessories, etc.)
- Male character support
- Unreal Engine and Blender compatibility

## Development

### Lint

```bash
npm run lint
```

### Format

```bash
npm run format
```

### Test

```bash
npm test
```

## License

[Unlicense](LICENSE) - Public Domain
