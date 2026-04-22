// Tests.jsx — React panel that runs the in-process test suite against __acs.
const { useState, useEffect, useRef } = React;

function TestsPanel({ autoRun = true }) {
  const [tests, setTests] = useState([]);
  const [statuses, setStatuses] = useState({}); // id -> {status, detail, err}
  const [summary, setSummary] = useState({ pass: 0, fail: 0, skip: 0 });
  const [running, setRunning] = useState(false);
  const stopRef = useRef(false);
  const logRef = useRef(null);

  const load = async () => {
    const staticT = window.ACS_buildStaticTests();
    const dynT = await window.ACS_buildDynamicTests();
    const all = [...staticT, ...dynT].map((t, i) => ({ ...t, id: i }));
    setTests(all);
    const st = {};
    for (const t of all) st[t.id] = { status: 'pending' };
    setStatuses(st);
    return all;
  };

  const runAll = async (listFromLoad) => {
    setRunning(true);
    stopRef.current = false;
    const list = listFromLoad || await load();
    let pass = 0, fail = 0, skip = 0;
    setSummary({ pass, fail, skip });
    window.__testResults = [];
    window.__testsDone = null;
    for (const t of list) {
      if (stopRef.current) { skip++; setStatuses(s => ({ ...s, [t.id]: { status: 'skip', detail: 'stopped' } })); continue; }
      setStatuses(s => ({ ...s, [t.id]: { status: 'running' } }));
      window.__testResults = window.__testResults || [];
      const t0 = performance.now();
      try {
        await t.fn();
        pass++;
        setStatuses(s => ({ ...s, [t.id]: { status: 'pass', detail: Math.round(performance.now()-t0)+'ms' } }));
        window.__testResults.push({ id: t.id, group: t.group, name: t.name, status: 'pass', ms: Math.round(performance.now()-t0) });
      } catch (e) {
        fail++;
        const msg = String(e.message || e);
        setStatuses(s => ({ ...s, [t.id]: { status: 'fail', detail: Math.round(performance.now()-t0)+'ms', err: msg } }));
        window.__testResults.push({ id: t.id, group: t.group, name: t.name, status: 'fail', err: msg, ms: Math.round(performance.now()-t0) });
      }
      setSummary({ pass, fail, skip });
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }
    setRunning(false);
    window.__testsDone = { pass, fail, skip, total: list.length };
  };

  const rerunFail = async () => {
    setRunning(true);
    stopRef.current = false;
    let { pass, fail, skip } = summary;
    for (const t of tests) {
      const cur = statuses[t.id];
      if (!cur || cur.status !== 'fail') continue;
      if (stopRef.current) break;
      setStatuses(s => ({ ...s, [t.id]: { status: 'running' } }));
      const t0 = performance.now();
      try {
        await t.fn();
        pass++; fail--;
        setStatuses(s => ({ ...s, [t.id]: { status: 'pass', detail: Math.round(performance.now()-t0)+'ms' } }));
      } catch (e) {
        setStatuses(s => ({ ...s, [t.id]: { status: 'fail', detail: Math.round(performance.now()-t0)+'ms', err: String(e.message || e) } }));
      }
      setSummary({ pass, fail, skip });
    }
    setRunning(false);
  };

  useEffect(() => {
    if (!autoRun) return;
    (async () => {
      const list = await load();
      await runAll(list);
    })();
  }, []);

  const byGroup = new Map();
  for (const t of tests) {
    if (!byGroup.has(t.group)) byGroup.set(t.group, []);
    byGroup.get(t.group).push(t);
  }

  const total = tests.length;
  const done = summary.pass + summary.fail + summary.skip;

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', color:'#e8e8f0', fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif' }}>
      <div style={{ padding: '14px 14px 10px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:600 }}>🧪 Test Harness</div>
            <div style={{ fontSize:11, opacity:0.55, marginTop:2 }}>In-process, no iframe. {total} tests.</div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={() => runAll()} disabled={running} style={btn}>{running ? 'Running…' : '▶ Run all'}</button>
            <button onClick={() => { stopRef.current = true; }} disabled={!running} style={btnGhost}>Stop</button>
            <button onClick={rerunFail} disabled={running} style={btnGhost}>↻ Failures</button>
          </div>
        </div>
        <div style={{ display:'flex', gap:18, fontSize:12, marginTop:8 }}>
          <div><span style={{color:'#7be098',fontSize:18,fontWeight:600,marginRight:4}}>{summary.pass}</span>pass</div>
          <div><span style={{color:'#ff8a8a',fontSize:18,fontWeight:600,marginRight:4}}>{summary.fail}</span>fail</div>
          <div><span style={{color:'#c0a060',fontSize:18,fontWeight:600,marginRight:4}}>{summary.skip}</span>skip</div>
          <div style={{marginLeft:'auto'}}><span style={{color:'#8a9cff',fontSize:18,fontWeight:600,marginRight:4}}>{done}/{total}</span></div>
        </div>
        <div style={{ marginTop:8, height:3, background:'rgba(255,255,255,0.05)', borderRadius:2, overflow:'hidden' }}>
          <div style={{ height:'100%', width: `${total ? done/total*100 : 0}%`, background:'linear-gradient(90deg,#8a9cff,#7be098)', transition:'width 0.3s ease' }} />
        </div>
      </div>
      <div ref={logRef} style={{ flex:1, overflow:'auto' }}>
        {[...byGroup.entries()].map(([group, arr]) => (
          <div key={group}>
            <div style={{ padding:'10px 14px', fontSize:10, letterSpacing:2, textTransform:'uppercase', opacity:0.55, background:'rgba(255,255,255,0.02)' }}>
              {group} ({arr.length})
            </div>
            {arr.map(t => {
              const st = statuses[t.id] || { status: 'pending' };
              return (
                <div key={t.id} style={{ padding:'5px 14px', fontSize:12, borderTop:'1px solid rgba(255,255,255,0.03)', display:'grid', gridTemplateColumns:'16px 1fr auto', gap:8, alignItems:'center' }}>
                  <span style={{ width:10, height:10, borderRadius:5, background: statusColor(st.status), boxShadow: st.status==='running' ? '0 0 6px rgba(138,156,255,0.6)':'none' }} />
                  <span style={{ fontFamily:'ui-monospace,Menlo,monospace', fontSize:11 }}>{t.name}</span>
                  <span style={{ fontSize:10, opacity:0.5, fontFamily:'ui-monospace,monospace' }}>{st.detail || ''}</span>
                  {st.err && (
                    <div style={{ gridColumn:'2/4', fontSize:10, color:'#ffa0a0', opacity:0.85, lineHeight:1.4, fontFamily:'ui-monospace,monospace', paddingTop:2 }}>{st.err}</div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function statusColor(s) {
  return s === 'pass' ? '#7be098'
       : s === 'fail' ? '#ff6a6a'
       : s === 'skip' ? '#c0a060'
       : s === 'running' ? '#8a9cff'
       : 'rgba(255,255,255,0.15)';
}

const btn = { ...(window.ACS_BTN?.btnActive || {}), padding:'6px 10px', fontSize:11, borderRadius:6 };
const btnGhost = { ...(window.ACS_BTN?.btnBase || {}), padding:'6px 10px', fontSize:11, borderRadius:6 };

window.TestsPanel = TestsPanel;
