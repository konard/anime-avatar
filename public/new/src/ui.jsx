// ui.jsx — shared layout primitives. All surfaces share a single liquid-glass
// look (backdrop-blur + saturate + subtle border/shadow) via the GlassPanel
// primitive. Layout primitives (drawer, section, row, slider, …) reuse it.

const { useState, useEffect, useRef } = React;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 720px)').matches);
  useEffect(() => {
    const m = window.matchMedia('(max-width: 720px)');
    const h = () => setIsMobile(m.matches);
    m.addEventListener('change', h);
    return () => m.removeEventListener('change', h);
  }, []);
  return isMobile;
}
window.useIsMobile = useIsMobile;

// -------------------------------------------------------------------------
// Liquid-glass tokens. Applied via GlassPanel to any surface the user sees,
// so badges, drawers, buttons, overlays, tooltips all match.
const GLASS_BG   = 'rgba(22,20,36,0.58)';
const GLASS_BG_L = 'rgba(30,28,48,0.45)';
const GLASS_BORDER = '1px solid rgba(255,255,255,0.10)';
const GLASS_BORDER_INNER = '1px solid rgba(255,255,255,0.05)';
const GLASS_BLUR = 'blur(22px) saturate(1.6)';
const GLASS_SHADOW = '0 16px 40px -16px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)';
window.ACS_GLASS = { GLASS_BG, GLASS_BG_L, GLASS_BORDER, GLASS_BORDER_INNER, GLASS_BLUR, GLASS_SHADOW };

// Generic glass container. All panels should go through this.
function GlassPanel({ style, children, testid, tone = 'base', ...rest }) {
  const bg = tone === 'light' ? GLASS_BG_L : GLASS_BG;
  return (
    <div data-testid={testid} {...rest} style={{
      background: bg,
      backdropFilter: GLASS_BLUR,
      WebkitBackdropFilter: GLASS_BLUR,
      border: GLASS_BORDER,
      borderRadius: 14,
      boxShadow: GLASS_SHADOW,
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      ...style,
    }}>{children}</div>
  );
}
window.GlassPanel = GlassPanel;

// Shared button styles (also glass-tinted).
const btnBase = {
  background: 'rgba(255,255,255,0.06)',
  border: GLASS_BORDER_INNER,
  color: '#fff',
  padding: '8px 12px',
  borderRadius: 8,
  fontSize: 12, fontWeight: 600, letterSpacing: 0.3,
  cursor: 'pointer',
  transition: 'background .14s, border-color .14s',
};
const btnActive = {
  ...btnBase,
  background: 'rgba(140,110,255,0.26)',
  border: '1px solid rgba(160,130,255,0.55)',
};
window.ACS_BTN = { btnBase, btnActive };

// -------------------------------------------------------------------------
// ConfigDrawer: no self-collapse button anymore. Visibility is controlled by
// the top switcher (editor / tests / split / none).
function ConfigDrawer({ title = 'Editor', children, anchor = 'right',
                         rightOffset = 16, widthOverride = 420,
                         mobileBottomHalf = false, hideTitle = false }) {
  const isMobile = useIsMobile();
  const asSheet = isMobile || anchor === 'bottom';
  let width = widthOverride;
  if (!asSheet) {
    const maxAvail = window.innerWidth - rightOffset - 16;
    width = Math.min(widthOverride, Math.max(280, maxAvail));
  }
  // Mobile, single-pane (no split): full-screen flush against the top
  // switcher (issue #19). Mobile + split-with-tests-on-top still uses the
  // bottom-half sheet so the user can see both panes.
  const style = asSheet ? (mobileBottomHalf ? {
    position: 'fixed', left: 8, right: 8, bottom: 8,
    top: 'calc(50vh + 4px)',
    zIndex: 50, overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
  } : {
    position: 'fixed', left: 0, right: 0, top: 48, bottom: 0,
    zIndex: 50, overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
    borderRadius: 0,
  }) : {
    position: 'fixed', top: 64, right: rightOffset, bottom: 16,
    width,
    zIndex: 50, overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
  };

  return (
    <GlassPanel testid="drawer" style={style}>
      {!hideTitle && (
        <div style={{
          height: 40, display: 'flex', alignItems: 'center', padding: '0 14px',
          borderBottom: GLASS_BORDER_INNER,
          fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase',
          opacity: 0.85,
        }}>{title}</div>
      )}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14, fontSize: 13, minWidth: 0 }}>
        {children}
      </div>
    </GlassPanel>
  );
}

function Section({ title, children, onRandomize, onReset, testid }) {
  return (
    <div style={{ marginBottom: 18 }} data-testid={testid ? `section-${testid}` : undefined}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', opacity: 0.55 }}>{title}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {onRandomize && (
            <button onClick={onRandomize} data-testid={testid ? `rand-${testid}` : undefined} title={`Randomize ${title}`} style={miniBtn}>🎲</button>
          )}
          {onReset && (
            <button onClick={onReset} data-testid={testid ? `reset-${testid}` : undefined} title={`Reset ${title}`} style={miniBtn}>↺</button>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, minWidth: 0 }}>
      <span style={{ fontSize: 12, opacity: 0.75, minWidth: 86, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', minWidth: 0 }}>{children}</div>
    </div>
  );
}

function Slider({ value, onChange, min = 0, max = 1, step = 0.01, testid }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1, minWidth: 0 }}>
      <input type="range" min={min} max={max} step={step} value={value}
        data-testid={testid}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, minWidth: 0, accentColor: '#8c6eff', height: 28 }} />
      <span style={{ fontSize: 11, opacity: 0.6, fontVariantNumeric: 'tabular-nums', minWidth: 40, textAlign: 'right', flexShrink: 0 }}>
        {typeof value === 'number' ? (step < 1 ? value.toFixed(2) : value.toFixed(0)) : value}
      </span>
    </div>
  );
}

function ColorPick({ value, onChange, testid }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input type="color" value={value} data-testid={testid}
        onChange={e => onChange(e.target.value)}
        style={{ width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer', padding: 0, borderRadius: 4 }} />
      <span style={{ fontSize: 11, opacity: 0.55, fontFamily: 'ui-monospace, monospace' }}>{value}</span>
    </div>
  );
}

function Select({ value, onChange, options, testid }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} data-testid={testid} style={{
      background: 'rgba(255,255,255,0.06)', color: '#fff', border: GLASS_BORDER_INNER,
      padding: '7px 8px', borderRadius: 6, fontSize: 12, outline: 'none',
      flex: 1, minWidth: 0, maxWidth: '100%',
      textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
    }}>
      {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
    </select>
  );
}

function Chips({ value, onChange, options, testid }) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {options.map(o => {
        const v = o.value || o;
        const on = v === value;
        return (
          <button key={v} onClick={() => onChange(v)} data-testid={testid ? `${testid}-${v}` : undefined} style={on ? btnActive : btnBase}>
            {o.label || o}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ value, onChange, testid }) {
  return (
    <button onClick={() => onChange(!value)} data-testid={testid} style={{
      width: 40, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
      background: value ? '#8c6eff' : 'rgba(255,255,255,0.14)',
      position: 'relative', transition: 'background .15s',
      flexShrink: 0,
    }}>
      <span style={{
        position: 'absolute', top: 2, left: value ? 18 : 2, width: 20, height: 20,
        borderRadius: 10, background: '#fff', transition: 'left .15s',
      }} />
    </button>
  );
}

function Stage({ bg = '#141026', children }) {
  return (
    <div data-testid="stage" style={{ position: 'absolute', inset: 0, background: bg, overflow: 'hidden' }}>
      {children}
    </div>
  );
}

const miniBtn = {
  minWidth: 26, height: 24, background: 'rgba(255,255,255,0.06)', border: GLASS_BORDER_INNER,
  color: '#fff', borderRadius: 6, fontSize: 11, cursor: 'pointer', padding: 0, lineHeight: 1,
};

window.Studio = {
  ConfigDrawer, Section, Row, Slider, ColorPick, Select, Chips, Toggle, Stage,
  miniBtn, GlassPanel,
};
