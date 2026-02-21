import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { create } from 'zustand';

// ═══════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════
let _nid = 0;
const uid = () => `n${++_nid}_${Date.now().toString(36)}`;

const useStore = create((set, get) => ({
  models: [], modelsLoading: true, modelsError: null,
  setModels: (m) => set({ models: m, modelsLoading: false }),
  setModelsError: (e) => set({ modelsError: e, modelsLoading: false }),
  nodes: [],
  addNode: (node) => {
    const id = uid();
    set(s => ({ nodes: [...s.nodes, { id, ...node }] }));
    return id;
  },
  removeNode: (id) => set(s => ({
    nodes: s.nodes.filter(n => n.id !== id),
    connections: s.connections.filter(c => c.from !== id && c.to !== id),
    promptTarget: s.promptTarget === id ? null : s.promptTarget,
  })),
  moveNode: (id, x, y) => set(s => ({
    nodes: s.nodes.map(n => n.id === id ? { ...n, x, y } : n)
  })),
  connections: [],
  addConnection: (conn) => {
    const s = get();
    if (s.connections.some(c => c.from === conn.from && c.to === conn.to)) return;
    if (conn.from === conn.to) return;
    set({ connections: [...s.connections, { id: uid(), ...conn }] });
  },
  removeConnection: (id) => set(s => ({
    connections: s.connections.filter(c => c.id !== id)
  })),
  addAgentToWrapper: (wid, aid) => set(s => ({
    nodes: s.nodes.map(n => {
      if (n.id !== wid || n.type !== 'wrapper') return n;
      if (n.agents?.some(a => a.nodeId === aid)) return n;
      return { ...n, agents: [...(n.agents || []), { nodeId: aid }] };
    })
  })),
  removeAgentFromWrapper: (wid, aid) => set(s => ({
    nodes: s.nodes.map(n => n.id !== wid ? n : { ...n, agents: (n.agents || []).filter(a => a.nodeId !== aid) })
  })),
  reorderWrapperAgents: (wid, agents) => set(s => ({
    nodes: s.nodes.map(n => n.id === wid ? { ...n, agents } : n)
  })),
  setWrapperMode: (wid, mode) => set(s => ({
    nodes: s.nodes.map(n => n.id === wid ? { ...n, mode } : n)
  })),
  setWrapperSynthesizer: (wid, idx) => set(s => ({
    nodes: s.nodes.map(n => n.id === wid ? { ...n, synthesizerIdx: idx } : n)
  })),
  apiKeys: (() => { try { return JSON.parse(localStorage.getItem('hm_keys') || '{}'); } catch { return {}; } })(),
  setApiKey: (p, k) => {
    const next = { ...get().apiKeys, [p]: k };
    set({ apiKeys: next }); localStorage.setItem('hm_keys', JSON.stringify(next));
  },
  apiKeyStatus: {},
  setApiKeyStatus: (p, s) => set(st => ({ apiKeyStatus: { ...st.apiKeyStatus, [p]: s } })),
  prompt: '', setPrompt: (p) => set({ prompt: p }),
  uploadedFile: null, setUploadedFile: (f) => set({ uploadedFile: f }),
  promptTarget: null, setPromptTarget: (id) => set({ promptTarget: id }),
  executing: false, setExecuting: (v) => set({ executing: v }),
  executionResults: {},
  setNodeResult: (id, r) => set(s => ({ executionResults: { ...s.executionResults, [id]: r } })),
  finalResult: null, setFinalResult: (r) => set({ finalResult: r }),
  clearResults: () => set({ executionResults: {}, finalResult: null }),
  selectedNode: null, setSelectedNode: (id) => set({ selectedNode: id }),
  showResult: false, setShowResult: (v) => set({ showResult: v }),
  settingsOpen: false, setSettingsOpen: (v) => set({ settingsOpen: v }),
  apiKeyModalFor: null, setApiKeyModalFor: (v) => set({ apiKeyModalFor: v }),
  // Wiring mode: 'prompt-connect' | { type:'port', nodeId, port } | null
  wiringMode: null, setWiringMode: (v) => set({ wiringMode: v }),
}));

// ═══════════════════════════════════════════════════
// AI CALLING
// ═══════════════════════════════════════════════════
async function callModel(model, prompt, apiKeys, fileData) {
  if (fileData && !model.inputMods?.some(m => ['image','file','audio'].includes(m))) {
    return { ok: false, text: `${model.name} doesn't support file input.` };
  }
  if (model.isFree && window.puter) {
    try {
      const r = await window.puter.ai.chat(prompt, { model: `openrouter:${model.id}` });
      const text = typeof r === 'string' ? r : r?.message?.content || r?.text || JSON.stringify(r);
      return { ok: true, text };
    } catch (e) { /* fall through */ }
  }
  const key = apiKeys?.openrouter;
  if (!key && !model.isFree) return { ok: false, text: `API key needed for ${model.name}`, needsKey: true };
  if (key) {
    try {
      const content = [{ type: 'text', text: prompt }];
      if (fileData && model.inputMods?.includes('image'))
        content.push({ type: 'image_url', image_url: { url: fileData } });
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: model.id, messages: [{ role: 'user', content }], max_tokens: 2048 }),
      });
      const j = await r.json();
      if (j.error) return { ok: false, text: j.error.message || JSON.stringify(j.error) };
      return { ok: true, text: j.choices?.[0]?.message?.content || '', tokens: j.usage };
    } catch (e) { return { ok: false, text: e.message }; }
  }
  if (model.isFree && window.puter) {
    try {
      const r = await window.puter.ai.chat(prompt, { model: `openrouter:${model.id}` });
      return { ok: true, text: typeof r === 'string' ? r : r?.message?.content || JSON.stringify(r) };
    } catch (e) { return { ok: false, text: e.message }; }
  }
  return { ok: false, text: 'No API key.', needsKey: true };
}

async function executeWrapper(wrapper, prompt, allNodes, apiKeys, onProgress, fileData) {
  const agents = wrapper.agents || [];
  if (!agents.length) return { ok: false, text: 'Wrapper has no agents.' };
  const mode = wrapper.mode || 'sequential';
  const results = [];
  if (mode === 'sequential') {
    let ctx = prompt;
    for (let i = 0; i < agents.length; i++) {
      const an = allNodes.find(n => n.id === agents[i].nodeId);
      if (!an?.model) continue;
      onProgress?.(agents[i].nodeId, 'running');
      const p = i === 0 ? ctx : `Previous:\n${results.map(r => r.text).join('\n---\n')}\n\nOriginal question: ${prompt}\n\n${i === agents.length - 1 ? 'Synthesize a final answer:' : 'Continue analyzing:'}`;
      const r = await callModel(an.model, p, apiKeys, i === 0 ? fileData : null);
      results.push({ nodeId: agents[i].nodeId, name: an.model.name, ...r });
      onProgress?.(agents[i].nodeId, r.ok ? 'done' : 'error');
      if (r.ok) ctx = r.text;
      if (r.needsKey) return r;
    }
    const last = results[results.length - 1];
    return { ok: last?.ok || false, text: last?.text || 'No output.', agentResults: results };
  }
  const synthIdx = wrapper.synthesizerIdx ?? agents.length - 1;
  const workers = agents.filter((_, i) => i !== synthIdx);
  const synthEntry = agents[synthIdx];
  const pResults = await Promise.all(workers.map(async a => {
    const an = allNodes.find(n => n.id === a.nodeId);
    if (!an?.model) return { nodeId: a.nodeId, ok: false, text: 'Not found' };
    onProgress?.(a.nodeId, 'running');
    const r = await callModel(an.model, prompt, apiKeys, fileData);
    onProgress?.(a.nodeId, r.ok ? 'done' : 'error');
    return { nodeId: a.nodeId, name: an.model.name, ...r };
  }));
  results.push(...pResults);
  const synthNode = allNodes.find(n => n.id === synthEntry?.nodeId);
  if (synthNode?.model) {
    onProgress?.(synthEntry.nodeId, 'running');
    const sp = `Synthesize these AI responses into ONE answer:\n\nQuestion: "${prompt}"\n\n${pResults.map((r, i) => `Agent ${i + 1} (${r.name || '?'}):\n${r.text}`).join('\n\n---\n\n')}\n\nGive one unified answer:`;
    const sr = await callModel(synthNode.model, sp, apiKeys);
    onProgress?.(synthEntry.nodeId, sr.ok ? 'done' : 'error');
    return { ok: sr.ok, text: sr.text, agentResults: [...results, { ...sr, nodeId: synthEntry.nodeId, name: synthNode.model.name, isSynth: true }] };
  }
  return { ok: true, text: pResults.map(r => r.text).join('\n\n'), agentResults: results };
}

async function executeGraph() {
  const st = useStore.getState();
  const { nodes, connections, promptTarget, prompt, apiKeys, uploadedFile } = st;
  if (!prompt.trim() || !promptTarget) return;
  st.clearResults(); st.setExecuting(true); st.setShowResult(false);
  const fileData = uploadedFile?.dataUrl || null;
  try {
    const result = await runNode(promptTarget, prompt, nodes, connections, apiKeys, fileData, new Set());
    st.setFinalResult(result); st.setShowResult(true);
  } catch (e) {
    st.setFinalResult({ ok: false, text: e.message }); st.setShowResult(true);
  }
  st.setExecuting(false);
}

async function runNode(nodeId, input, nodes, conns, keys, fileData, visited) {
  if (visited.has(nodeId)) return { ok: false, text: 'Circular connection.' };
  visited.add(nodeId);
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return { ok: false, text: 'Node not found.' };
  const st = useStore.getState();
  const prog = (aid, s) => st.setNodeResult(aid, { status: s });
  let result;
  if (node.type === 'agent') {
    if (!node.model) return { ok: false, text: 'No model.' };
    if (!node.model.isFree && !keys.openrouter) {
      st.setApiKeyModalFor('openrouter'); return { ok: false, text: 'API key needed.', needsKey: true };
    }
    st.setNodeResult(nodeId, { status: 'running' });
    result = await callModel(node.model, input, keys, fileData);
    st.setNodeResult(nodeId, { status: result.ok ? 'done' : 'error', ...result });
  } else if (node.type === 'wrapper') {
    for (const a of (node.agents || [])) {
      const an = nodes.find(n => n.id === a.nodeId);
      if (an?.model && !an.model.isFree && !keys.openrouter) {
        st.setApiKeyModalFor('openrouter'); return { ok: false, text: 'API key needed.', needsKey: true };
      }
    }
    st.setNodeResult(nodeId, { status: 'running' });
    result = await executeWrapper(node, input, nodes, keys, prog, fileData);
    st.setNodeResult(nodeId, { status: result.ok ? 'done' : 'error', ...result });
  } else if (node.type === 'output') {
    return { ok: true, text: input };
  }
  if (!result?.ok) return result;
  const outConn = conns.filter(c => c.from === nodeId);
  if (!outConn.length) return result;
  return runNode(outConn[0].to, result.text, nodes, conns, keys, null, visited);
}

async function validateOpenRouterKey(key) {
  if (!key || key.length < 10) return 'invalid';
  try {
    const r = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: { 'Authorization': `Bearer ${key}` },
    });
    const j = await r.json();
    return j.data ? 'valid' : 'invalid';
  } catch { return 'invalid'; }
}

// ═══════════════════════════════════════════════════
// APP COMPONENT
// ═══════════════════════════════════════════════════
export default function App() {
  const store = useStore();
  const { models, modelsLoading, nodes, connections, prompt, promptTarget,
    executing, showResult, finalResult, selectedNode, settingsOpen, apiKeys,
    apiKeyModalFor, apiKeyStatus, executionResults, wiringMode } = store;

  const canvasRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [portWiring, setPortWiring] = useState(null); // { nodeId, port, startX, startY }

  // Fetch models
  useEffect(() => {
    fetch('https://openrouter.ai/api/v1/models')
      .then(r => r.json())
      .then(j => {
        const parsed = (j.data || []).map(m => {
          const isFree = m.pricing?.prompt === '0' && m.pricing?.completion === '0';
          const mod = m.architecture?.modality || 'text->text';
          const inputMods = (mod.split('->')[0] || 'text').split('+').map(s => s.trim().toLowerCase());
          return { id: m.id, name: m.name || m.id, contextLength: m.context_length || 4096,
            pricing: m.pricing || {}, isFree, inputMods, provider: m.id.split('/')[0] || '?' };
        });
        store.setModels(parsed);
      })
      .catch(e => store.setModelsError(e.message));
  }, []);

  // Track mouse for wiring line
  useEffect(() => {
    if (!portWiring && wiringMode !== 'prompt-connect') return;
    const onMove = (e) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [portWiring, wiringMode]);

  // ESC to cancel wiring
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setPortWiring(null);
        store.setWiringMode(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Canvas drop handler
  const onCanvasDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const types = e.dataTransfer.types;
    const modelJson = e.dataTransfer.getData('text/model');
    const isWrapper = e.dataTransfer.getData('text/wrapper');
    const isOutput = e.dataTransfer.getData('text/output');

    if (modelJson) {
      try {
        const model = JSON.parse(modelJson);
        const wrapper = nodes.find(n => n.type === 'wrapper' &&
          x >= n.x && x <= n.x + 260 && y >= n.y && y <= n.y + 300);
        store.addNode({ type: 'agent', model, x: x - 90, y: y - 40 });
        if (wrapper) {
          setTimeout(() => {
            const latest = useStore.getState().nodes;
            const nn = latest[latest.length - 1];
            if (nn) store.addAgentToWrapper(wrapper.id, nn.id);
          }, 30);
        }
      } catch {}
    } else if (isWrapper) {
      store.addNode({ type: 'wrapper', agents: [], mode: 'sequential', synthesizerIdx: 0, x: x - 125, y: y - 60 });
    } else if (isOutput) {
      store.addNode({ type: 'output', x: x - 70, y: y - 30 });
    }
  }, [nodes]);

  // Node dragging via mousedown
  const startNodeDrag = useCallback((e, nodeId) => {
    if (e.target.closest('.port') || e.target.closest('.mode-btn') || e.target.closest('button')) return;
    e.stopPropagation();
    store.setSelectedNode(nodeId);
    const node = useStore.getState().nodes.find(n => n.id === nodeId);
    if (!node) return;
    const ox = e.clientX - node.x;
    const oy = e.clientY - node.y;
    const onMove = (ev) => store.moveNode(nodeId, ev.clientX - ox, ev.clientY - oy);
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  // Click on a node while in wiring mode
  const handleNodeClick = useCallback((e, nodeId) => {
    e.stopPropagation();
    // Prompt connect mode
    if (wiringMode === 'prompt-connect') {
      store.setPromptTarget(nodeId);
      store.setWiringMode(null);
      return;
    }
    // Port wiring mode
    if (portWiring) {
      if (portWiring.nodeId === nodeId) return; // can't connect to self
      if (portWiring.port === 'out') {
        store.addConnection({ from: portWiring.nodeId, to: nodeId });
      } else {
        store.addConnection({ from: nodeId, to: portWiring.nodeId });
      }
      setPortWiring(null);
      return;
    }
    store.setSelectedNode(nodeId);
  }, [wiringMode, portWiring]);

  // Port click — start wiring
  const handlePortClick = useCallback((e, nodeId, port) => {
    e.stopPropagation();
    e.preventDefault();
    if (portWiring) {
      // Complete connection
      if (portWiring.nodeId !== nodeId) {
        if (portWiring.port === 'out' && port === 'in') {
          store.addConnection({ from: portWiring.nodeId, to: nodeId });
        } else if (portWiring.port === 'in' && port === 'out') {
          store.addConnection({ from: nodeId, to: portWiring.nodeId });
        }
      }
      setPortWiring(null);
    } else {
      // Start wiring
      const rect = canvasRef.current.getBoundingClientRect();
      setPortWiring({ nodeId, port, startX: e.clientX - rect.left, startY: e.clientY - rect.top });
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  }, [portWiring]);

  // Click canvas background — cancel wiring or deselect
  const handleCanvasClick = useCallback((e) => {
    if (wiringMode || portWiring) {
      store.setWiringMode(null);
      setPortWiring(null);
      return;
    }
    store.setSelectedNode(null);
  }, [wiringMode, portWiring]);

  // Port position calc for SVG
  const portPos = useCallback((nid, port) => {
    const n = nodes.find(x => x.id === nid);
    if (!n) return { x: 0, y: 0 };
    const w = n.type === 'wrapper' ? 250 : n.type === 'output' ? 140 : 180;
    const h = n.type === 'wrapper' ? Math.max(140, 90 + (n.agents?.length || 0) * 28) : n.type === 'output' ? 60 : 95;
    return port === 'out' ? { x: n.x + w, y: n.y + h / 2 } : { x: n.x, y: n.y + h / 2 };
  }, [nodes]);

  // Wiring mode indicator text
  const wiringText = wiringMode === 'prompt-connect'
    ? '🔗 Click on a node to connect the prompt to it'
    : portWiring
    ? `🔗 Click on another node's ${portWiring.port === 'out' ? 'input' : 'output'} port — or press ESC`
    : null;

  return (
    <div className="app">
      {/* TOPBAR */}
      <div className="topbar">
        <div className="logo"><div className="logo-hex">⬡</div>HIVEMIND</div>
        <div className="topbar-sep"/>
        <div className="topbar-stat"><div className="dot-live"/>{models.length} models</div>
        <div className="topbar-sep"/>
        <div className="topbar-stat">{nodes.filter(n=>n.type==='agent').length} agents · {nodes.filter(n=>n.type==='wrapper').length} wrappers</div>
        {executing && <><div className="topbar-sep"/><div className="topbar-stat" style={{color:'var(--amber)'}}><div className="spinner" style={{width:10,height:10}}/> Running</div></>}
        {wiringText && <><div className="topbar-sep"/><div className="topbar-stat" style={{color:'var(--cyan)',fontWeight:600}}>{wiringText}</div></>}
        <div className="topbar-right">
          {apiKeys.openrouter && <span style={{fontFamily:'var(--mono)',fontSize:10,color: apiKeyStatus.openrouter==='valid' ? 'var(--green)' : apiKeyStatus.openrouter==='invalid' ? 'var(--red)' : 'var(--t3)'}}>
            {apiKeyStatus.openrouter==='valid' ? '🔑 Valid' : apiKeyStatus.openrouter==='invalid' ? '🔑 Invalid' : '🔑 Set'}
          </span>}
          <button className="btn" onClick={()=>store.setSettingsOpen(true)}>⚙ Settings</button>
        </div>
      </div>

      {/* LEFT PANEL */}
      <div className="left-panel">
        <div className="panel-head"><span>⚡</span> Prompt</div>
        <div className="prompt-box">
          {/* Prompt connect button — CLICK based, not drag */}
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
            <div className={`prompt-dot ${wiringMode==='prompt-connect' ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (wiringMode === 'prompt-connect') {
                  store.setWiringMode(null);
                } else {
                  store.setWiringMode('prompt-connect');
                  setPortWiring(null);
                }
              }}
              title="Click, then click a node to connect"/>
            <span style={{fontFamily:'var(--mono)',fontSize:10,color: promptTarget ? 'var(--green)' : wiringMode==='prompt-connect' ? 'var(--cyan)' : 'var(--t3)'}}>
              {promptTarget ? '✓ Connected' : wiringMode==='prompt-connect' ? 'Now click a node...' : 'Click dot → click node'}
            </span>
            {promptTarget && <button className="btn btn-sm" style={{marginLeft:'auto',fontSize:9}} onClick={()=>store.setPromptTarget(null)}>✕</button>}
          </div>

          <textarea className="prompt-input" placeholder={"Enter your prompt here...\n\nCtrl+Enter to run."} value={prompt}
            onChange={e=>store.setPrompt(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)) executeGraph(); }}/>

          <button className="btn btn-primary" onClick={executeGraph}
            disabled={executing||!prompt.trim()||!promptTarget}>
            {executing ? <><div className="spinner" style={{marginRight:6}}/> Processing...</> : '⬡ Execute Pipeline'}
          </button>
          {!promptTarget && prompt.trim() && <div style={{fontSize:10,color:'var(--amber)',fontFamily:'var(--mono)'}}>⚠ Click the cyan dot then click a node</div>}
        </div>
      </div>

      {/* CENTER CANVAS */}
      <div className="canvas-wrap">
        <div className={`canvas-area ${dragOver?'drag-over':''}`} ref={canvasRef}
          onDrop={onCanvasDrop}
          onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='move';setDragOver(true);}}
          onDragLeave={()=>setDragOver(false)}
          onClick={handleCanvasClick}>
          <div className="canvas-grid"/>

          {/* SVG layer for connections */}
          <svg className="canvas-svg" style={{width:'100%',height:'100%'}}>
            {/* Prompt → target line */}
            {promptTarget && (()=>{
              const tp = portPos(promptTarget,'in');
              return <line x1={0} y1={tp.y} x2={tp.x} y2={tp.y} stroke="#00e5ff" strokeWidth="2" strokeDasharray="6 3" opacity=".6">
                <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="1s" repeatCount="indefinite"/></line>;
            })()}

            {/* Node → Node connections */}
            {connections.map(c => {
              const f = portPos(c.from,'out'), t = portPos(c.to,'in');
              const mx = (f.x+t.x)/2;
              return <g key={c.id}>
                <path d={`M${f.x},${f.y} C${mx},${f.y} ${mx},${t.y} ${t.x},${t.y}`} stroke="#7c6aef" strokeWidth="2" fill="none" opacity=".5"/>
                <circle r="3" fill="#7c6aef"><animateMotion path={`M${f.x},${f.y} C${mx},${f.y} ${mx},${t.y} ${t.x},${t.y}`} dur="2s" repeatCount="indefinite"/></circle>
              </g>;
            })}

            {/* Active wiring line */}
            {portWiring && <line x1={portWiring.startX} y1={portWiring.startY} x2={mousePos.x} y2={mousePos.y}
              stroke="#7c6aef" strokeWidth="2" strokeDasharray="6 3" opacity=".8"/>}
          </svg>

          {/* Nodes layer */}
          <div className="nodes-layer">
            {nodes.map(node => {
              const sel = selectedNode===node.id;
              const res = executionResults[node.id];
              const statusBorder = res?.status==='running'?'var(--amber)':res?.status==='done'?'var(--green)':res?.status==='error'?'var(--red)':'transparent';

              // AGENT NODE
              if (node.type==='agent') {
                const m = node.model;
                return <div key={node.id} className={`node agent-node ${sel?'selected':''}`} data-nid={node.id}
                  style={{left:node.x,top:node.y}}
                  onMouseDown={e=>startNodeDrag(e,node.id)}
                  onClick={e=>handleNodeClick(e,node.id)}>
                  <div className="port port-in" data-port="in" onClick={e=>handlePortClick(e,node.id,'in')}/>
                  <div className="port port-out" data-port="out" onClick={e=>handlePortClick(e,node.id,'out')}/>
                  {res?.status==='running' && <div className="processing-overlay"><div className="spinner"/></div>}
                  <div className="agent-header" style={{borderLeft:`3px solid ${statusBorder}`}}>
                    <span style={{fontSize:13}}>{m?.isFree?'🟢':'🟡'}</span>
                    <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:11,fontWeight:600}}>
                      {m?.name?.replace(/^[^/]+\//,'') || '?'}
                    </span>
                    {m?.isFree ? <span className="free-badge">FREE</span> : <span className="paid-badge">KEY</span>}
                  </div>
                  <div className="agent-body">
                    <div>{m?.provider}</div>
                    <div style={{fontSize:9}}>ctx: {m?.contextLength ? (m.contextLength/1000).toFixed(0)+'k' : '?'}</div>
                    <div className="agent-caps">{m?.inputMods?.map(mod=><span key={mod} className={`cap-tag ${mod}`}>{mod}</span>)}</div>
                  </div>
                  {sel && <div style={{padding:'4px 8px',borderTop:'1px solid var(--border)'}}>
                    <button className="btn btn-sm btn-danger" style={{width:'100%'}} onClick={e=>{e.stopPropagation();store.removeNode(node.id);}}>Remove</button>
                  </div>}
                </div>;
              }

              // WRAPPER NODE
              if (node.type==='wrapper') {
                const agents = node.agents||[];
                const mode = node.mode||'sequential';
                const synthIdx = node.synthesizerIdx??agents.length-1;
                return <div key={node.id} className={`node wrapper-node ${sel?'selected':''}`} data-nid={node.id}
                  style={{left:node.x,top:node.y}}
                  onMouseDown={e=>startNodeDrag(e,node.id)}
                  onClick={e=>handleNodeClick(e,node.id)}
                  onDrop={e=>{
                    e.preventDefault();e.stopPropagation();
                    const mj=e.dataTransfer.getData('text/model');
                    if(!mj)return;
                    try{
                      const model=JSON.parse(mj);
                      store.addNode({type:'agent',model,x:node.x+20,y:node.y+90+agents.length*28});
                      setTimeout(()=>{const ns=useStore.getState().nodes;const nn=ns[ns.length-1];if(nn)store.addAgentToWrapper(node.id,nn.id);},30);
                    }catch{}
                  }}
                  onDragOver={e=>{e.preventDefault();e.stopPropagation();}}>
                  <div className="port port-in" data-port="in" onClick={e=>handlePortClick(e,node.id,'in')}/>
                  <div className="port port-out" data-port="out" onClick={e=>handlePortClick(e,node.id,'out')}/>
                  {res?.status==='running' && <div className="processing-overlay"><div className="spinner"/></div>}
                  <div className="wrapper-header" style={{borderLeft:`3px solid ${statusBorder}`}}>
                    <span>📦</span><span>Wrapper</span>
                    <span style={{marginLeft:'auto',fontSize:9,fontFamily:'var(--mono)',color:'var(--t3)'}}>{agents.length} agent{agents.length!==1?'s':''}</span>
                  </div>
                  <div className="wrapper-body">
                    <div className="wrapper-mode">
                      <button className={`mode-btn ${mode==='sequential'?'active':''}`} onClick={e=>{e.stopPropagation();store.setWrapperMode(node.id,'sequential');}}>Sequential</button>
                      <button className={`mode-btn ${mode==='parallel'?'active':''}`} onClick={e=>{e.stopPropagation();store.setWrapperMode(node.id,'parallel');}}>Parallel</button>
                    </div>
                    <div className="wrapper-agents">
                      {!agents.length && <div style={{fontSize:10,color:'var(--t3)',textAlign:'center',padding:'10px 0',border:'1px dashed var(--border-b)',borderRadius:6}}>Drop models here</div>}
                      {agents.map((a,i)=>{
                        const an=nodes.find(n=>n.id===a.nodeId);
                        const ar=executionResults[a.nodeId];
                        const isSynth=mode==='parallel'&&i===synthIdx;
                        return <div key={a.nodeId} className="wrapper-agent-item">
                          <span className="priority-num">#{i+1}</span>
                          <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{an?.model?.name?.replace(/^[^/]+\//,'')||'?'}</span>
                          {isSynth && <span className="synthesizer-tag">SYNTH</span>}
                          {ar?.status==='running' && <div className="spinner" style={{width:10,height:10}}/>}
                          {ar?.status==='done' && <span style={{color:'var(--green)',fontSize:10}}>✓</span>}
                          {ar?.status==='error' && <span style={{color:'var(--red)',fontSize:10}}>✗</span>}
                          <button style={{background:'none',border:'none',color:'var(--t3)',cursor:'pointer',fontSize:10}} onClick={e=>{
                            e.stopPropagation();const arr=[...agents];if(i>0){[arr[i],arr[i-1]]=[arr[i-1],arr[i]];store.reorderWrapperAgents(node.id,arr);}
                          }}>▲</button>
                          <button style={{background:'none',border:'none',color:'var(--t3)',cursor:'pointer',fontSize:10}} onClick={e=>{
                            e.stopPropagation();const arr=[...agents];if(i<arr.length-1){[arr[i],arr[i+1]]=[arr[i+1],arr[i]];store.reorderWrapperAgents(node.id,arr);}
                          }}>▼</button>
                          {mode==='parallel'&&!isSynth && <button style={{background:'none',border:'none',color:'var(--cyan)',cursor:'pointer',fontSize:8,fontFamily:'var(--mono)'}}
                            onClick={e=>{e.stopPropagation();store.setWrapperSynthesizer(node.id,i);}}>S</button>}
                          <button style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:12}} onClick={e=>{e.stopPropagation();store.removeAgentFromWrapper(node.id,a.nodeId);}}>×</button>
                        </div>;
                      })}
                    </div>
                  </div>
                  {sel && <div style={{padding:'4px 10px 8px'}}><button className="btn btn-sm btn-danger" style={{width:'100%'}} onClick={e=>{e.stopPropagation();store.removeNode(node.id);}}>Delete</button></div>}
                </div>;
              }

              // OUTPUT NODE
              if (node.type==='output') {
                return <div key={node.id} className={`node output-node ${sel?'selected':''}`} data-nid={node.id}
                  style={{left:node.x,top:node.y}} onMouseDown={e=>startNodeDrag(e,node.id)}
                  onClick={e=>handleNodeClick(e,node.id)}>
                  <div className="port port-in" data-port="in" onClick={e=>handlePortClick(e,node.id,'in')}/>
                  <div style={{fontSize:18}}>📤</div>
                  <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--green)'}}>OUTPUT</div>
                  {sel && <button className="btn btn-sm btn-danger" style={{marginTop:6,width:'100%'}} onClick={e=>{e.stopPropagation();store.removeNode(node.id);}}>Remove</button>}
                </div>;
              }
              return null;
            })}
          </div>

          {/* Empty state */}
          {!nodes.length && <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center',zIndex:15,pointerEvents:'none'}}>
            <div style={{fontSize:40,opacity:.4,marginBottom:12}}>⬡</div>
            <div style={{fontSize:18,fontWeight:700,marginBottom:6,color:'var(--t2)'}}>Build Your AI Pipeline</div>
            <div style={{fontSize:12,color:'var(--t3)',maxWidth:380,lineHeight:1.7}}>
              1. Drag models from the right panel onto the canvas<br/>
              2. Drag a Wrapper to group agents<br/>
              3. Click a purple port ● on one node, then click a port on another to connect<br/>
              4. Click the cyan dot ● then click a node to set prompt source<br/>
              5. Type prompt and Execute
            </div>
          </div>}
        </div>

        {/* Result panel */}
        {showResult && finalResult && <div className="result-panel">
          <div className="result-head">
            <span>{finalResult.ok ? '✅' : '❌'}</span><span>Result</span>
            <button className="btn btn-sm" style={{marginLeft:'auto'}} onClick={()=>store.setShowResult(false)}>Close</button>
          </div>
          <div className="result-body">{finalResult.text || 'No output.'}</div>
          {finalResult.agentResults && <div className="result-meta">
            {finalResult.agentResults.map((r,i)=><span key={i}>{r.isSynth?'🔷':r.ok?'🟢':'🔴'} {r.name?.replace(/^[^/]+\//,'')||`Agent ${i+1}`}</span>)}
          </div>}
        </div>}
      </div>

      {/* RIGHT PANEL */}
      <ModelBrowser/>

      {/* BOTTOMBAR */}
      <div className="bottombar">
        <span>{nodes.filter(n=>n.type==='agent'&&n.model?.isFree).length} free</span><span>·</span>
        <span>{nodes.filter(n=>n.type==='agent'&&!n.model?.isFree).length} paid</span><span>·</span>
        <span>Data stored locally</span>
        <span style={{marginLeft:'auto'}}>HIVEMIND v1.0</span>
      </div>

      {settingsOpen && <SettingsModal/>}
      {apiKeyModalFor && <ApiKeyPromptModal/>}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MODEL BROWSER
// ═══════════════════════════════════════════════════
function ModelBrowser() {
  const models = useStore(s=>s.models);
  const modelsLoading = useStore(s=>s.modelsLoading);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(()=>{
    let list = models;
    if (search) { const q=search.toLowerCase(); list=list.filter(m=>m.name.toLowerCase().includes(q)||m.id.toLowerCase().includes(q)); }
    if (filter==='free') list=list.filter(m=>m.isFree);
    else if (filter==='paid') list=list.filter(m=>!m.isFree);
    else if (filter==='image') list=list.filter(m=>m.inputMods.includes('image'));
    else if (filter==='code') list=list.filter(m=>m.id.includes('code')||m.id.includes('coder'));
    return list.slice(0,150);
  },[models,search,filter]);

  return <div className="right-panel">
    <div className="panel-head"><span>📡</span> Models ({models.length})</div>
    <div className="search-box">
      <input className="search-input" placeholder="Search models..." value={search} onChange={e=>setSearch(e.target.value)}/>
    </div>
    <div className="filter-row">
      {[['all','All'],['free','🟢 Free'],['paid','🟡 Paid'],['image','🖼 Vision'],['code','💻 Code']].map(([k,l])=>
        <button key={k} className={`filter-chip ${filter===k?'active':''}`} onClick={()=>setFilter(k)}>{l}</button>
      )}
    </div>
    <div className="toolbox">
      <div className="model-card tool-item" style={{borderColor:'var(--accent)'}}
        draggable="true" onDragStart={e=>{e.dataTransfer.setData('text/wrapper','1');e.dataTransfer.effectAllowed='move';}}>
        <span style={{fontSize:14}}>📦</span><div style={{fontSize:10,fontFamily:'var(--mono)',color:'var(--accent)'}}>Wrapper</div>
      </div>
      <div className="model-card tool-item" style={{borderColor:'var(--green)'}}
        draggable="true" onDragStart={e=>{e.dataTransfer.setData('text/output','1');e.dataTransfer.effectAllowed='move';}}>
        <span style={{fontSize:14}}>📤</span><div style={{fontSize:10,fontFamily:'var(--mono)',color:'var(--green)'}}>Output</div>
      </div>
    </div>
    <div className="model-list">
      {modelsLoading && <div style={{textAlign:'center',padding:20,color:'var(--t3)'}}><div className="spinner" style={{margin:'0 auto 8px'}}/><div style={{fontSize:11}}>Loading from OpenRouter...</div></div>}
      {filtered.map(m => <div key={m.id} className="model-card" draggable="true"
        onDragStart={e=>{e.dataTransfer.setData('text/model',JSON.stringify(m));e.dataTransfer.effectAllowed='move';}}>
        <div className="model-card-head"><span className="model-card-name">{m.name}</span></div>
        <div className="model-card-provider">{m.provider}</div>
        <div className="model-card-meta">
          <span className={`meta-tag ${m.isFree?'free':'paid'}`}>{m.isFree?'FREE':'PAID'}</span>
          <span className="meta-tag">{(m.contextLength/1000).toFixed(0)}k</span>
          {m.inputMods.map(mod=><span key={mod} className="meta-tag" style={{color:mod==='image'?'var(--pink)':mod==='audio'?'var(--amber)':'var(--t3)'}}>{mod}</span>)}
        </div>
      </div>)}
      {!modelsLoading && !filtered.length && <div style={{textAlign:'center',padding:20,fontSize:11,color:'var(--t3)'}}>No models found.</div>}
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════
// SETTINGS MODAL
// ═══════════════════════════════════════════════════
function SettingsModal() {
  const store = useStore();
  const { apiKeys, apiKeyStatus } = store;
  const [orKey, setOrKey] = useState(apiKeys.openrouter || '');
  const [checking, setChecking] = useState(false);
  const handleSave = async () => {
    if (!orKey.trim()) {
      store.setApiKey('openrouter', ''); store.setApiKeyStatus('openrouter', null);
      store.setSettingsOpen(false); return;
    }
    setChecking(true); store.setApiKeyStatus('openrouter', 'checking');
    const status = await validateOpenRouterKey(orKey.trim());
    store.setApiKeyStatus('openrouter', status);
    if (status === 'valid') store.setApiKey('openrouter', orKey.trim());
    setChecking(false);
  };
  const status = checking ? 'checking' : apiKeyStatus.openrouter;
  return <div className="modal-overlay" onClick={()=>store.setSettingsOpen(false)}>
    <div className="modal" onClick={e=>e.stopPropagation()}>
      <h3>⚙️ Settings</h3>
      <label className="modal-label" style={{marginTop:12}}>OpenRouter API Key</label>
      <input className="modal-input" type="password" placeholder="sk-or-..."
        value={orKey} onChange={e=>setOrKey(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSave()}/>
      {status && <div className={`key-status ${status}`}>
        {status==='valid' && '✅ Key is valid — ready for paid models'}
        {status==='invalid' && '❌ Key is invalid — check and try again'}
        {status==='checking' && <><div className="spinner" style={{width:12,height:12}}/> Validating key...</>}
      </div>}
      {!status && <div className="key-status none">No key set — free models still work via Puter.js</div>}
      <p style={{fontSize:10,color:'var(--t3)',marginBottom:12,lineHeight:1.5}}>
        Get a key at <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" style={{color:'var(--cyan)'}}>openrouter.ai/keys</a>. Your key is stored locally only.
      </p>
      <div className="modal-actions">
        <button className="btn" onClick={()=>store.setSettingsOpen(false)}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={checking}>
          {checking ? <><div className="spinner" style={{width:10,height:10,marginRight:6}}/> Checking...</> : 'Save & Validate'}
        </button>
      </div>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════
// API KEY PROMPT MODAL
// ═══════════════════════════════════════════════════
function ApiKeyPromptModal() {
  const store = useStore();
  const [key, setKey] = useState('');
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState(null);
  const handleSave = async () => {
    if (!key.trim()) return;
    setChecking(true);
    const s = await validateOpenRouterKey(key.trim());
    setStatus(s); setChecking(false);
    if (s === 'valid') {
      store.setApiKey('openrouter', key.trim());
      store.setApiKeyStatus('openrouter', 'valid');
      store.setApiKeyModalFor(null);
    }
  };
  return <div className="modal-overlay" onClick={()=>store.setApiKeyModalFor(null)}>
    <div className="modal" onClick={e=>e.stopPropagation()}>
      <h3 style={{color:'var(--amber)'}}>🔑 API Key Required</h3>
      <p style={{fontSize:12,color:'var(--t2)',marginBottom:12,lineHeight:1.6}}>
        This model needs an OpenRouter API key. Get one at <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" style={{color:'var(--cyan)'}}>openrouter.ai/keys</a>
      </p>
      <input className="modal-input" type="password" placeholder="sk-or-..." value={key}
        onChange={e=>setKey(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSave()} autoFocus/>
      {status==='invalid' && <div className="key-status invalid">❌ Invalid key</div>}
      {status==='valid' && <div className="key-status valid">✅ Valid!</div>}
      <div className="modal-actions">
        <button className="btn" onClick={()=>store.setApiKeyModalFor(null)}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={checking}>
          {checking ? 'Checking...' : 'Save & Validate'}
        </button>
      </div>
    </div>
  </div>;
}
