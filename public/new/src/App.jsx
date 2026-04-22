// App.jsx — top-level layout, view switcher, persistence.
//
// Views:
//   editor : full-screen stage + drawer on the right.
//   tests  : full-screen stage + tests panel on the right (editor still
//            mounted off-screen so tests can drive state).
//   split  : tests panel on the right, editor drawer inlined below tests
//            so the user can see the model + the harness at once. On narrow
//            screens split degrades to 'tests' (panel) with the stage behind.
//   none   : just the stage.
//
// Top bar is glass-styled and right-aligned. Clicking the active view button
// toggles to 'none'. 'avatar studio' wordmark on the left always returns to
// editor when clicked.
const { useState, useEffect } = React;

function App() {
  const [cfg, setCfg] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('acs_B') || 'null');
      if (saved) return { ...window.ACS_DEFAULTS, ...saved };
    } catch {}
    return window.ACS_DEFAULTS;
  });
  useEffect(() => {
    try { localStorage.setItem('acs_B', JSON.stringify(cfg)); } catch {}
  }, [cfg]);
  useEffect(() => {
    window.__acs = { cfg, setCfg, probe: () => window.__acsProbe?.B?.() };
  }, [cfg]);

  const [view, setView] = useState(() => {
    const u = new URL(location.href);
    return u.searchParams.get('view') || localStorage.getItem('acs_view') || 'editor';
  });
  useEffect(() => {
    try { localStorage.setItem('acs_view', view); } catch {}
    const u = new URL(location.href);
    u.searchParams.set('view', view);
    history.replaceState(null, '', u);
  }, [view]);

  const isMobile = window.useIsMobile();
  const eff = view; // no degrade — split works even on narrow, as a tall sheet

  // Editor is ALWAYS mounted so its state machine and drawer buttons exist
  // for the tests. Its stage is full-width in every view.
  const editorWrapStyle = {
    position: 'fixed', top: 48, left: 0, right: 0, bottom: 0, pointerEvents: 'auto',
  };

  // Desktop widths. On narrower screens the drawer stretches to whichever
  // space is free.
  const drawerWidth = 420;
  const testsWidth = 420;

  // Drawer is ONLY rendered in 'editor' view; tests panel only in 'tests'/'split'.
  // In split view both appear side-by-side on desktop. On mobile they stack.
  const showDrawer = eff === 'editor' || eff === 'split';
  const showTests = eff === 'tests' || eff === 'split';

  const stackMobile = isMobile && eff === 'split';

  return (
    <>
      <TopSwitcher view={view} setView={setView} />
      <div style={editorWrapStyle} data-testid={`editor-wrap-${eff}`}>
        <window.Editor
          cfg={cfg}
          setCfg={setCfg}
          hideDrawer={!showDrawer}
          inlineDrawer={eff === 'split' && !isMobile}
          drawerWidth={drawerWidth}
          testsOnRight={showTests}
          testsWidth={testsWidth}
        />
      </div>
      {showTests && (
        <window.TestsPanelFrame
          stackMobile={stackMobile}
          drawerWidth={drawerWidth}
          testsWidth={testsWidth}
          splitWithDrawer={eff === 'split'}
        />
      )}
    </>
  );
}

function TopSwitcher({ view, setView }) {
  const { btnBase, btnActive } = window.ACS_BTN;
  const views = [
    { id: 'editor', label: 'Editor' },
    { id: 'tests',  label: 'Tests' },
    { id: 'split',  label: 'Split' },
  ];
  const onPick = (id) => {
    if (view === id) setView('none');
    else setView(id);
  };
  const G = window.ACS_GLASS;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 48, zIndex: 200,
      background: 'rgba(10,8,20,0.55)',
      backdropFilter: G.GLASS_BLUR, WebkitBackdropFilter: G.GLASS_BLUR,
      borderBottom: G.GLASS_BORDER,
      display: 'flex', alignItems: 'center', padding: '0 14px',
      fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      color: '#fff',
    }}>
      <button data-testid="logo" onClick={() => setView('editor')} style={{
        background:'transparent', border:'none', color:'#fff',
        fontSize:12, fontWeight:700, letterSpacing:1.3, textTransform:'lowercase',
        opacity:0.9, cursor:'pointer', padding:'0 4px',
      }}>avatar studio</button>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
        {views.map(v => {
          const on = view === v.id;
          return (
            <button key={v.id} data-testid={`view-${v.id}`} onClick={() => onPick(v.id)}
              style={on ? btnActive : btnBase}
              title={on ? `Click to hide (${v.label} active)` : `Show ${v.label}`}>
              {v.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Tests panel wrapped in a glass chrome so it visually matches the drawer.
// When in split view (desktop), it sits right of the drawer; on mobile split,
// it takes the top half while the drawer takes the bottom.
function TestsPanelFrame({ splitWithDrawer, stackMobile, drawerWidth, testsWidth }) {
  const G = window.ACS_GLASS;
  // Default 'tests' mode: full right-side column.
  // Split mode desktop: tests panel on far right, drawer to its left.
  // Split mode mobile: tests on top half.
  let style;
  if (splitWithDrawer && stackMobile) {
    style = {
      position: 'fixed', left: 8, right: 8, top: 56,
      height: 'calc(50vh - 32px)',
      zIndex: 48,
    };
  } else if (splitWithDrawer) {
    // Right column, fixed width.
    style = {
      position: 'fixed', top: 64, right: 16, bottom: 16,
      width: testsWidth,
      zIndex: 48,
    };
  } else {
    // 'tests' only — occupy the whole right column (desktop) or the sheet (mobile).
    style = {
      position: 'fixed', top: 64, right: 16, bottom: 16,
      width: Math.min(testsWidth, window.innerWidth - 32),
      zIndex: 48,
    };
  }
  return (
    <div data-testid="tests-wrap" style={{ ...style, overflow: 'hidden' }}>
      <window.GlassPanel style={{ height: '100%', display:'flex', flexDirection:'column' }}>
        <window.TestsPanel />
      </window.GlassPanel>
    </div>
  );
}
window.TestsPanelFrame = TestsPanelFrame;

window.App = App;
