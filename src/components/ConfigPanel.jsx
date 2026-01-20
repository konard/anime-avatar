import React from 'react';

const PRESETS = [
  {
    name: 'Default',
    skin: '#ffd5c8',
    hair: '#2d1b4e',
    eye: '#6b5ce7',
    clothes: '#ff6b9d',
  },
  {
    name: 'Blonde',
    skin: '#ffe4c4',
    hair: '#ffcc00',
    eye: '#00bfff',
    clothes: '#4169e1',
  },
  {
    name: 'Dark',
    skin: '#d4a574',
    hair: '#1a1a1a',
    eye: '#8b4513',
    clothes: '#228b22',
  },
  {
    name: 'Redhead',
    skin: '#ffefd5',
    hair: '#dc143c',
    eye: '#ff4500',
    clothes: '#1a1a1a',
  },
];

const ANIMATIONS = ['happy', 'wave', 'nod', 'thinking', 'surprised'];

function ColorInput({ label, value, onChange }) {
  return (
    <div className="config-item">
      <label>{label}</label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function RangeInput({ label, value, onChange, min, max, step, unit = '' }) {
  return (
    <div className="config-item">
      <label>
        {label}: {value}
        {unit}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

function CheckboxInput({ id, label, checked, onChange }) {
  return (
    <div className="config-item checkbox-group">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}

export function ConfigPanel({
  config,
  onConfigChange,
  onAnimationTrigger,
  isTalking,
  onTalkingToggle,
}) {
  const handleChange = (key, value) =>
    onConfigChange({ ...config, [key]: value });

  const applyPreset = (preset) =>
    onConfigChange({
      ...config,
      skinColor: preset.skin,
      hairColor: preset.hair,
      eyeColor: preset.eye,
      clothesColor: preset.clothes,
    });

  return (
    <div className="config-section">
      <h2>Avatar Configuration</h2>

      <div className="config-group">
        <h3>Appearance</h3>
        <ColorInput
          label="Skin Color"
          value={config.skinColor}
          onChange={(v) => handleChange('skinColor', v)}
        />
        <ColorInput
          label="Hair Color"
          value={config.hairColor}
          onChange={(v) => handleChange('hairColor', v)}
        />
        <ColorInput
          label="Eye Color"
          value={config.eyeColor}
          onChange={(v) => handleChange('eyeColor', v)}
        />
        <ColorInput
          label="Clothes Color"
          value={config.clothesColor}
          onChange={(v) => handleChange('clothesColor', v)}
        />
      </div>

      <div className="config-group">
        <h3>Animation Settings</h3>
        <RangeInput
          label="Blink Interval"
          value={config.blinkInterval}
          onChange={(v) => handleChange('blinkInterval', v)}
          min={1000}
          max={6000}
          step={500}
          unit="ms"
        />
        <RangeInput
          label="Animation Speed"
          value={config.animationSpeed}
          onChange={(v) => handleChange('animationSpeed', v)}
          min={0.5}
          max={2}
          step={0.1}
          unit="x"
        />
        <CheckboxInput
          id="enableIdleAnimation"
          label="Enable Idle Animation"
          checked={config.enableIdleAnimation}
          onChange={(v) => handleChange('enableIdleAnimation', v)}
        />
        <CheckboxInput
          id="enableRandomBlink"
          label="Enable Random Blinking"
          checked={config.enableRandomBlink}
          onChange={(v) => handleChange('enableRandomBlink', v)}
        />
      </div>

      <div className="config-group">
        <h3>Trigger Animation</h3>
        <div className="button-group">
          {ANIMATIONS.map((anim) => (
            <button
              key={anim}
              className="btn btn-secondary"
              onClick={() => onAnimationTrigger(anim)}
            >
              {anim.charAt(0).toUpperCase() + anim.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="config-group">
        <h3>Speaking Mode</h3>
        <div className="button-group">
          <button
            className={`btn ${isTalking ? 'btn-active' : 'btn-primary'}`}
            onClick={onTalkingToggle}
          >
            {isTalking ? 'Stop Talking' : 'Start Talking'}
          </button>
        </div>
        <div className="status-indicator" style={{ marginTop: '10px' }}>
          <span className={`status-dot ${isTalking ? 'talking' : ''}`}></span>
          <span>{isTalking ? 'Speaking...' : 'Silent'}</span>
        </div>
      </div>

      <div className="config-group">
        <h3>Presets</h3>
        <div className="button-group">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              className="btn btn-secondary"
              onClick={() => applyPreset(preset)}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ConfigPanel;
