import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { create } from 'zustand';

// ═══════════════════════════════════════════════════
// THEMES
// ═══════════════════════════════════════════════════
const THEMES = {
  default: {
    name: 'Void',
    icon: '🌌',
    vars: {
      '--bg-0':'#06080d','--bg-1':'#0a0d16','--bg-2':'#10142a','--bg-3':'#181d3a','--bg-4':'#1f254a',
      '--border':'#1c2040','--border-b':'#282e58','--t1':'#e6e8f0','--t2':'#9298b8','--t3':'#585e80',
      '--accent':'#7c6aef','--accent-g':'rgba(124,106,239,.25)','--cyan':'#00e5ff','--cyan-g':'rgba(0,229,255,.2)',
      '--green':'#22c55e','--green-g':'rgba(34,197,94,.2)','--amber':'#f59e0b','--amber-g':'rgba(245,158,11,.2)',
      '--red':'#ef4444','--red-g':'rgba(239,68,68,.2)','--pink':'#f472b6',
    }
  },
  matrix: {
    name: 'Matrix',
    icon: '💊',
    vars: {
      '--bg-0':'#000800','--bg-1':'#001200','--bg-2':'#001a00','--bg-3':'#002200','--bg-4':'#002a00',
      '--border':'#004000','--border-b':'#006000','--t1':'#00ff41','--t2':'#00cc33','--t3':'#007722',
      '--accent':'#00ff41','--accent-g':'rgba(0,255,65,.2)','--cyan':'#00ffaa','--cyan-g':'rgba(0,255,170,.2)',
      '--green':'#00ff41','--green-g':'rgba(0,255,65,.2)','--amber':'#aaff00','--amber-g':'rgba(170,255,0,.2)',
      '--red':'#ff2244','--red-g':'rgba(255,34,68,.2)','--pink':'#00ffcc',
    }
  },
  cyberpunk: {
    name: 'Cyberpunk',
    icon: '⚡',
    vars: {
      '--bg-0':'#03001c','--bg-1':'#060012','--bg-2':'#0a0020','--bg-3':'#0e0028','--bg-4':'#130030',
      '--border':'#1a0040','--border-b':'#2d0060','--t1':'#fffde7','--t2':'#ffd600','--t3':'#9e7600',
      '--accent':'#ff00ff','--accent-g':'rgba(255,0,255,.25)','--cyan':'#00ffff','--cyan-g':'rgba(0,255,255,.2)',
      '--green':'#39ff14','--green-g':'rgba(57,255,20,.2)','--amber':'#ffd600','--amber-g':'rgba(255,214,0,.2)',
      '--red':'#ff0055','--red-g':'rgba(255,0,85,.2)','--pink':'#ff00aa',
    }
  },
  synthwave: {
    name: 'Synthwave',
    icon: '🌅',
    vars: {
      '--bg-0':'#0f0028','--bg-1':'#1a0038','--bg-2':'#220048','--bg-3':'#2a0058','--bg-4':'#320068',
      '--border':'#440080','--border-b':'#6600aa','--t1':'#ff80ff','--t2':'#dd55dd','--t3':'#882288',
      '--accent':'#ff00cc','--accent-g':'rgba(255,0,204,.25)','--cyan':'#00ffff','--cyan-g':'rgba(0,255,255,.2)',
      '--green':'#aaff44','--green-g':'rgba(170,255,68,.2)','--amber':'#ffaa00','--amber-g':'rgba(255,170,0,.2)',
      '--red':'#ff4466','--red-g':'rgba(255,68,102,.2)','--pink':'#ff55ff',
    }
  },
  sketch: {
    name: 'Sketch',
    icon: '✏️',
    vars: {
      '--bg-0':'#f5f0e8','--bg-1':'#ede8de','--bg-2':'#e5dfd3','--bg-3':'#ddd8cc','--bg-4':'#d5d0c4',
      '--border':'#c5bfb2','--border-b':'#a8a29a','--t1':'#1a1612','--t2':'#4a4540','--t3':'#8a8580',
      '--accent':'#2d4fc1','--accent-g':'rgba(45,79,193,.2)','--cyan':'#0088cc','--cyan-g':'rgba(0,136,204,.2)',
      '--green':'#2a7a3a','--green-g':'rgba(42,122,58,.2)','--amber':'#c27a00','--amber-g':'rgba(194,122,0,.2)',
      '--red':'#cc2222','--red-g':'rgba(204,34,34,.2)','--pink':'#cc44aa',
    }
  },
  blueprint: {
    name: 'Blueprint',
    icon: '📐',
    vars: {
      '--bg-0':'#001833','--bg-1':'#002244','--bg-2':'#002a55','--bg-3':'#003266','--bg-4':'#003a77',
      '--border':'#004488','--border-b':'#0055aa','--t1':'#cce8ff','--t2':'#88bbee','--t3':'#4488bb',
      '--accent':'#4db8ff','--accent-g':'rgba(77,184,255,.25)','--cyan':'#ffffff','--cyan-g':'rgba(255,255,255,.2)',
      '--green':'#44ffaa','--green-g':'rgba(68,255,170,.2)','--amber':'#ffcc44','--amber-g':'rgba(255,204,68,.2)',
      '--red':'#ff4455','--red-g':'rgba(255,68,85,.2)','--pink':'#ff88cc',
    }
  },
};

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
  addNode: (node) => { const id = uid(); set(s => ({ nodes: [...s.nodes, { id, ...node }] })); return id; },
  removeNode: (id) => set(s => ({
    nodes: s.nodes.filter(n => n.id !== id),
    connections: s.connections.filter(c => c.from !== id && c.to !== id),
    promptTargets: s.promptTargets.filter(t => t !== id),
  })),
  moveNode: (id, x, y) => set(s => ({ nodes: s.nodes.map(n => n.id === id ? { ...n, x, y } : n) })),
  connections: [],
  addConnection: (conn) => {
    const s = get();
    if (s.connections.some(c => c.from === conn.from && c.to === conn.to)) return;
    if (conn.from === conn.to) return;
    set({ connections: [...s.connections, { id: uid(), ...conn }] });
  },
  removeConnection: (id) => set(s => ({ connections: s.connections.filter(c => c.id !== id) })),
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
  reorderWrapperAgents: (wid, agents) => set(s => ({ nodes: s.nodes.map(n => n.id === wid ? { ...n, agents } : n) })),
  setWrapperMode: (wid, mode) => set(s => ({ nodes: s.nodes.map(n => n.id === wid ? { ...n, mode } : n) })),
  setWrapperSynthesizer: (wid, idx) => set(s => ({ nodes: s.nodes.map(n => n.id === wid ? { ...n, synthesizerIdx: idx } : n) })),
  apiKeys: (() => { try { return JSON.parse(localStorage.getItem('hm_keys') || '{}'); } catch { return {}; } })(),
  setApiKey: (p, k) => { const next = { ...get().apiKeys, [p]: k }; set({ apiKeys: next }); localStorage.setItem('hm_keys', JSON.stringify(next)); },
  apiKeyStatus: {},
  setApiKeyStatus: (p, s) => set(st => ({ apiKeyStatus: { ...st.apiKeyStatus, [p]: s } })),
  prompt: '', setPrompt: (p) => set({ prompt: p }),
  uploadedFiles: [],
  addUploadedFile: (f) => set(s => ({ uploadedFiles: [...s.uploadedFiles, f] })),
  removeUploadedFile: (idx) => set(s => ({ uploadedFiles: s.uploadedFiles.filter((_, i) => i !== idx) })),
  clearUploadedFiles: () => set({ uploadedFiles: [] }),
  promptTargets: [],
  addPromptTarget: (id) => set(s => ({ promptTargets: s.promptTargets.includes(id) ? s.promptTargets : [...s.promptTargets, id] })),
  removePromptTarget: (id) => set(s => ({ promptTargets: s.promptTargets.filter(t => t !== id) })),
  clearPromptTargets: () => set({ promptTargets: [] }),
  executing: false, setExecuting: (v) => set({ executing: v }),
  executionResults: {},
  setNodeResult: (id, r) => set(s => ({ executionResults: { ...s.executionResults, [id]: r } })),
  finalResults: [],
  setFinalResults: (r) => set({ finalResults: r }),
  clearResults: () => set({ executionResults: {}, finalResults: [] }),
  selectedNode: null, setSelectedNode: (id) => set({ selectedNode: id }),
  showResult: false, setShowResult: (v) => set({ showResult: v }),
  settingsOpen: false, setSettingsOpen: (v) => set({ settingsOpen: v }),
  apiKeyModalFor: null, setApiKeyModalFor: (v) => set({ apiKeyModalFor: v }),
  wiringMode: null, setWiringMode: (v) => set({ wiringMode: v }),
  execLog: [], addExecLog: (msg) => set(s => ({ execLog: [...s.execLog, { t: Date.now(), msg }] })),
  clearExecLog: () => set({ execLog: [] }),
  // LIVE MONITOR
  liveMonitorOpen: false, setLiveMonitorOpen: (v) => set({ liveMonitorOpen: v }),
  liveStreams: {},
  setLiveStream: (id, data) => set(s => ({ liveStreams: { ...s.liveStreams, [id]: { ...(s.liveStreams[id]||{}), ...data } } })),
  clearLiveStreams: () => set({ liveStreams: {} }),
  // AI DEBUGGER
  debugPanelOpen: false, setDebugPanelOpen: (v) => set({ debugPanelOpen: v }),
  debugEvents: [], // { t, nodeId, modelName, event, detail, status }
  addDebugEvent: (ev) => set(s => ({ debugEvents: [...s.debugEvents.slice(-200), { t: Date.now(), ...ev }] })),
  clearDebugEvents: () => set({ debugEvents: [] }),
  // THEME
  theme: (() => { try { return localStorage.getItem('hm_theme') || 'default'; } catch { return 'default'; } })(),
  setTheme: (t) => { set({ theme: t }); try { localStorage.setItem('hm_theme', t); } catch {} },
}));

// ═══════════════════════════════════════════════════
// AI CALLING with streaming
// ═══════════════════════════════════════════════════
// ─── IMAGE GENERATION VIA OPENROUTER ────────────────────────────────────────
// Models like dall-e-3, stable-diffusion, flux, etc. use /images/generations
const IMAGE_GEN_IDS = [
  'openai/dall-e-3','openai/dall-e-2',
  'stability/stable-diffusion-3','stability/stable-image-ultra','stability/sdxl',
  'black-forest-labs/flux-1.1-pro','black-forest-labs/flux-schnell','black-forest-labs/flux-pro',
  'google/imagen-3','google/imagen-3-fast',
];

// ─── VIDEO GENERATION VIA FAL.AI ─────────────────────────────────────────────
// fal.ai models are identified by provider prefix "fal-ai/"
const VIDEO_GEN_IDS = [
  'fal-ai/kling-video','fal-ai/wan-t2v','fal-ai/wan-i2v',
  'fal-ai/minimax-video','fal-ai/hunyuan-video','fal-ai/mochi-v1',
  'fal-ai/ltx-video','fal-ai/cogvideox-5b','fal-ai/animatediff-v2v',
];

function isImageGenModel(model) {
  return IMAGE_GEN_IDS.includes(model.id) ||
    model.outputMods?.includes('image') ||
    /dall.e|stable.diff|flux|imagen|midjourney|sdxl|sd3/i.test(model.id);
}

function isVideoGenModel(model) {
  return VIDEO_GEN_IDS.includes(model.id) ||
    model.outputMods?.includes('video') ||
    model.id?.startsWith('fal-ai/') ||
    /kling|wan.t2v|hunyuan.video|mochi|ltx.video|cogvideo|animate.*diff|video.*gen/i.test(model.id);
}

// Poll fal.ai queue until done
async function pollFal(requestId, falKey, onStream) {
  const headers = { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' };
  let attempts = 0;
  while (attempts < 120) {
    await new Promise(r => setTimeout(r, 3000));
    attempts++;
    onStream?.(`⟳ Processing video... (${attempts * 3}s elapsed)`);
    try {
      const r = await fetch(`https://queue.fal.run/status/${requestId}`, { headers });
      const j = await r.json();
      if (j.status === 'COMPLETED') {
        const res = await fetch(`https://queue.fal.run/result/${requestId}`, { headers });
        const result = await res.json();
        return result;
      }
      if (j.status === 'FAILED') throw new Error(j.error || 'Video generation failed');
    } catch (e) {
      if (e.message.includes('failed')) throw e;
    }
  }
  throw new Error('Video generation timed out (6 minutes)');
}

async function callModel(model, prompt, apiKeys, files, onStream) {
  const canImage = model.inputMods?.includes('image');
  const canAudio = model.inputMods?.includes('audio');
  const imageFiles = (files || []).filter(f => f.fileType === 'image');
  const audioFiles = (files || []).filter(f => f.fileType === 'audio');

  // ── VIDEO GENERATION (fal.ai) ──────────────────────────────────────────────
  if (isVideoGenModel(model)) {
    const falKey = apiKeys?.fal;
    if (!falKey) return { ok: false, text: 'fal.ai API key required for video generation. Add it in Settings.', needsKey: true, needsKeyProvider: 'fal', modelName: model.name };
    try {
      onStream?.('🎬 Submitting video generation job to fal.ai...');
      const headers = { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' };
      const modelPath = model.id.replace('fal-ai/', '');
      const input = { prompt };
      // Attach image if image-to-video model
      if (imageFiles.length > 0 && /i2v|image.to.video/i.test(model.id)) {
        input.image_url = imageFiles[0].dataUrl;
      }
      const r = await fetch(`https://queue.fal.run/fal-ai/${modelPath}`, {
        method: 'POST', headers, body: JSON.stringify({ input }),
      });
      if (!r.ok) {
        const j = await r.json().catch(()=>({}));
        return { ok: false, text: j.detail || j.error || 'fal.ai submission failed', modelName: model.name };
      }
      const j = await r.json();
      const requestId = j.request_id;
      if (!requestId) return { ok: false, text: 'No request ID from fal.ai', modelName: model.name };
      onStream?.(`🎬 Job queued (ID: ${requestId.slice(0,12)}...). Polling for result...`);
      const result = await pollFal(requestId, falKey, onStream);
      // Extract video URL
      const videoUrl = result?.video?.url || result?.videos?.[0]?.url || result?.output?.video_url;
      const images = (result?.images || []).map(i => i.url || i).filter(Boolean);
      if (videoUrl) {
        onStream?.('✅ Video ready!');
        return { ok: true, text: '', videos: [videoUrl], modelName: model.name, generatesVideo: true };
      }
      if (images.length) {
        return { ok: true, text: '', images, modelName: model.name, generatesImage: true };
      }
      return { ok: false, text: 'No video URL in response: ' + JSON.stringify(result).slice(0,200), modelName: model.name };
    } catch(e) {
      return { ok: false, text: e.message, modelName: model.name };
    }
  }

  // ── IMAGE GENERATION (OpenRouter /images/generations) ─────────────────────
  if (isImageGenModel(model)) {
    const key = apiKeys?.openrouter;
    if (!key) return { ok: false, text: 'OpenRouter API key required for image generation.', needsKey: true, modelName: model.name };
    try {
      onStream?.('🎨 Generating image...');
      const body = { model: model.id, prompt, n: 1, size: '1024x1024', response_format: 'url' };
      const r = await fetch('https://openrouter.ai/api/v1/images/generations', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (j.error) return { ok: false, text: j.error.message || JSON.stringify(j.error), modelName: model.name };
      const imgUrl = j.data?.[0]?.url || j.data?.[0]?.b64_json;
      const imgSrc = j.data?.[0]?.b64_json ? `data:image/png;base64,${j.data[0].b64_json}` : imgUrl;
      if (imgSrc) {
        onStream?.('✅ Image ready!');
        return { ok: true, text: '', images: [imgSrc], modelName: model.name, generatesImage: true };
      }
      return { ok: false, text: 'No image in response', modelName: model.name };
    } catch(e) {
      return { ok: false, text: e.message, modelName: model.name };
    }
  }

  // ── TEXT / CHAT (OpenRouter /chat/completions) ─────────────────────────────
  if (model.isFree && window.puter) {
    try {
      onStream?.('⟳ Connecting via Puter.js...');
      const r = await window.puter.ai.chat(prompt, { model: `openrouter:${model.id}` });
      const text = typeof r === 'string' ? r : r?.message?.content || r?.text || JSON.stringify(r);
      onStream?.(text);
      return { ok: true, text, modelName: model.name };
    } catch {}
  }

  const key = apiKeys?.openrouter;
  if (!key && !model.isFree) return { ok: false, text: `API key needed for ${model.name}`, needsKey: true, modelName: model.name };

  if (key) {
    try {
      const msgContent = [{ type: 'text', text: prompt }];
      if (canImage && imageFiles.length > 0) for (const f of imageFiles) msgContent.push({ type: 'image_url', image_url: { url: f.dataUrl } });
      if (canAudio && audioFiles.length > 0) for (const f of audioFiles) msgContent.push({ type: 'input_audio', input_audio: { data: f.dataUrl.split(',')[1], format: 'wav' } });

      onStream?.('⟳ Connecting to model...');
      const body = { model: model.id, messages: [{ role: 'user', content: msgContent }], max_tokens: 4096, stream: true };
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }, body: JSON.stringify(body),
      });

      if (!r.ok) { const j = await r.json(); return { ok: false, text: j.error?.message || 'API error', modelName: model.name }; }

      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let images = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const j = JSON.parse(data);
            const delta = j.choices?.[0]?.delta?.content;
            if (delta) { fullText += delta; onStream?.(fullText); }
          } catch {}
        }
      }

      // Extract any image URLs from text responses
      const urlRegex = /(https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|webp|gif))/gi;
      let match;
      while ((match = urlRegex.exec(fullText)) !== null) images.push(match[1]);

      return { ok: true, text: fullText || (images.length ? '[Image in response]' : ''), images: images.length ? images : undefined, modelName: model.name };
    } catch (e) { return { ok: false, text: e.message, modelName: model.name }; }
  }

  if (model.isFree && window.puter) {
    try {
      const r = await window.puter.ai.chat(prompt, { model: `openrouter:${model.id}` });
      return { ok: true, text: typeof r === 'string' ? r : r?.message?.content || JSON.stringify(r), modelName: model.name };
    } catch (e) { return { ok: false, text: e.message, modelName: model.name }; }
  }

  return { ok: false, text: 'No API key.', needsKey: true, modelName: model.name };
}

async function executeWrapper(wrapper, prompt, allNodes, apiKeys, onProgress, files, onStream) {
  const agents = wrapper.agents || [];
  if (!agents.length) return { ok: false, text: 'Wrapper has no agents.' };
  const mode = wrapper.mode || 'sequential';
  const results = [];

  if (mode === 'sequential') {
    let currentInput = prompt;
    for (let i = 0; i < agents.length; i++) {
      const an = allNodes.find(n => n.id === agents[i].nodeId);
      if (!an?.model) continue;
      onProgress?.(agents[i].nodeId, 'running');
      const t0 = Date.now();
      let agentPrompt = i === 0 ? currentInput : `You are agent #${i+1} in a chain. Original question:\n"${prompt}"\n\nPrevious agent's response:\n${currentInput}\n\nRefine and improve:`;
      const r = await callModel(an.model, agentPrompt, apiKeys, i === 0 ? files : null, (t) => onStream?.(agents[i].nodeId, t));
      const dur = Date.now() - t0;
      results.push({ nodeId: agents[i].nodeId, name: an.model.name, ...r, duration: dur });
      onProgress?.(agents[i].nodeId, r.ok ? 'done' : 'error', r);
      if (r.ok) currentInput = r.text;
      if (r.needsKey) return r;
    }
    const last = results[results.length - 1];
    return { ok: last?.ok || false, text: last?.text || 'No output.', images: last?.images, videos: last?.videos, generatesImage: last?.generatesImage, generatesVideo: last?.generatesVideo, agentResults: results };
  }

  const synthIdx = wrapper.synthesizerIdx ?? agents.length - 1;
  const workers = agents.filter((_, i) => i !== synthIdx);
  const synthEntry = agents[synthIdx];

  const pResults = await Promise.all(workers.map(async a => {
    const an = allNodes.find(n => n.id === a.nodeId);
    if (!an?.model) return { nodeId: a.nodeId, ok: false, text: 'Not found' };
    onProgress?.(a.nodeId, 'running');
    const t0 = Date.now();
    const r = await callModel(an.model, prompt, apiKeys, files, (t) => onStream?.(a.nodeId, t));
    onProgress?.(a.nodeId, r.ok ? 'done' : 'error', r);
    return { nodeId: a.nodeId, name: an.model.name, ...r, duration: Date.now() - t0 };
  }));
  results.push(...pResults);

  const synthNode = allNodes.find(n => n.id === synthEntry?.nodeId);
  if (synthNode?.model) {
    onProgress?.(synthEntry.nodeId, 'running');
    const t0 = Date.now();
    const sp = `You are a synthesizer. Multiple AI agents answered:\n"${prompt}"\n\nResponses:\n\n${pResults.map((r,i)=>`=== Agent ${i+1}: ${r.name||'?'} ===\n${r.text}`).join('\n\n')}\n\nProvide a unified comprehensive answer:`;
    const sr = await callModel(synthNode.model, sp, apiKeys, null, (t) => onStream?.(synthEntry.nodeId, t));
    onProgress?.(synthEntry.nodeId, sr.ok ? 'done' : 'error', sr);
    return { ok: sr.ok, text: sr.text, agentResults: [...results, { ...sr, nodeId: synthEntry.nodeId, name: synthNode.model.name, isSynth: true, duration: Date.now() - t0 }] };
  }
  return { ok: true, text: pResults.map(r => r.text).join('\n\n'), agentResults: results };
}

async function executeGraph() {
  const st = useStore.getState();
  const { nodes, connections, promptTargets, prompt, apiKeys, uploadedFiles } = st;
  if (!prompt.trim() || !promptTargets.length) return;

  st.clearResults(); st.clearExecLog(); st.clearLiveStreams(); st.clearDebugEvents(); st.setExecuting(true); st.setShowResult(false);
  st.addExecLog(`Starting with ${promptTargets.length} entry point(s)`);

  const files = uploadedFiles.length > 0 ? uploadedFiles : null;
  const allResults = [];

  try {
    const outcomes = await Promise.all(promptTargets.map(async targetId => {
      const path = [];
      const result = await runNode(targetId, prompt, nodes, connections, apiKeys, files, new Set(), path);
      return { targetId, result, path };
    }));

    for (const o of outcomes) allResults.push({ startNodeId: o.targetId, startNodeName: getNodeLabel(nodes, o.targetId), result: o.result, path: o.path });
    st.setFinalResults(allResults); st.setShowResult(true);
    st.addExecLog(`Complete: ${allResults.length} path(s)`);
  } catch (e) {
    st.setFinalResults([{ startNodeId: null, startNodeName: 'Error', result: { ok: false, text: e.message }, path: [] }]);
    st.setShowResult(true);
  }
  st.setExecuting(false);
}

function getNodeLabel(nodes, nid) {
  const n = nodes.find(x => x.id === nid);
  if (!n) return '?';
  if (n.type === 'agent') return n.model?.name?.replace(/^[^/]+\//, '') || '?';
  if (n.type === 'wrapper') return `Wrapper (${(n.agents || []).length} agents)`;
  if (n.type === 'output') return 'Output';
  return '?';
}

async function runNode(nodeId, input, nodes, conns, keys, files, visited, path) {
  if (visited.has(nodeId)) return { ok: false, text: 'Circular connection.' };
  visited.add(nodeId);
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return { ok: false, text: 'Node not found.' };
  const st = useStore.getState();
  path.push(getNodeLabel(nodes, nodeId));
  st.addExecLog(`→ ${getNodeLabel(nodes, nodeId)}`);
  let result;

  if (node.type === 'agent') {
    if (!node.model) return { ok: false, text: 'No model.' };
    if (!node.model.isFree && !keys.openrouter) { st.setApiKeyModalFor('openrouter'); return { ok: false, text: 'API key needed', needsKey: true }; }
    st.setNodeResult(nodeId, { status: 'running', modelName: node.model.name });
    st.setLiveStream(nodeId, { text: '', status: 'running', modelName: node.model.name });
    st.addDebugEvent({ nodeId, modelName: node.model.name, event: 'start', status: 'running', detail: `Sending prompt (${input.length} chars)` });
    const t0 = Date.now();
    result = await callModel(node.model, input, keys, files, (text) => {
      st.setLiveStream(nodeId, { text, status: 'streaming', modelName: node.model.name });
    });
    const dur = Date.now() - t0;
    st.setNodeResult(nodeId, { status: result.ok ? 'done' : 'error', ...result, duration: dur, modelName: node.model.name });
    st.setLiveStream(nodeId, { text: result.text, status: result.ok ? 'done' : 'error', modelName: node.model.name, duration: dur });
    st.addDebugEvent({ nodeId, modelName: node.model.name, event: result.ok ? 'done' : 'error', status: result.ok ? 'done' : 'error', detail: result.ok ? `${(result.text||'').length} chars in ${dur}ms` : result.text?.slice(0,80) || 'Unknown error', duration: dur });

  } else if (node.type === 'wrapper') {
    for (const a of (node.agents || [])) {
      const an = nodes.find(n => n.id === a.nodeId);
      if (an?.model && !an.model.isFree && !keys.openrouter) { st.setApiKeyModalFor('openrouter'); return { ok: false, text: 'API key needed', needsKey: true }; }
    }
    st.setNodeResult(nodeId, { status: 'running' });
    const t0 = Date.now();
    result = await executeWrapper(node, input, nodes, keys,
      (aid, status, r) => st.setNodeResult(aid, { status, ...r, modelName: nodes.find(n=>n.id===aid)?.model?.name }),
      files,
      (aid, text) => st.setLiveStream(aid, { text, status: 'streaming', modelName: nodes.find(n=>n.id===aid)?.model?.name }));
    st.setNodeResult(nodeId, { status: result.ok ? 'done' : 'error', ...result, duration: Date.now() - t0 });

  } else if (node.type === 'output') {
    st.setNodeResult(nodeId, { status: 'done', text: input });
    return { ok: true, text: input };
  }

  if (!result?.ok) return result;
  const outConns = conns.filter(c => c.from === nodeId);
  if (!outConns.length) return result;
  if (outConns.length === 1) return runNode(outConns[0].to, result.text, nodes, conns, keys, null, visited, path);
  const fanResults = await Promise.all(outConns.map(c => runNode(c.to, result.text, nodes, conns, keys, null, new Set(visited), [...path])));
  return { ok: fanResults.every(r => r.ok), text: fanResults.map(r => r.text).join('\n\n'), fanOut: fanResults };
}

async function validateOpenRouterKey(key) {
  if (!key || key.length < 10) return 'invalid';
  try {
    const r = await fetch('https://openrouter.ai/api/v1/auth/key', { headers: { 'Authorization': `Bearer ${key}` } });
    const j = await r.json();
    return j.data ? 'valid' : 'invalid';
  } catch { return 'invalid'; }
}

// ═══════════════════════════════════════════════════
// PARTICLE BACKGROUND
// ═══════════════════════════════════════════════════
function ParticleBackground({ theme }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    const onResize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);

    if (theme === 'matrix') {
      const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノHIVEMIND'.split('');

      // Three depth layers: far (tiny/faint), mid, near
      const layers = [
        { size: 7,  spacing: 11, speed: 0.18, alpha: 0.10, brightAlpha: 0.20 },
        { size: 9,  spacing: 15, speed: 0.30, alpha: 0.17, brightAlpha: 0.33 },
        { size: 11, spacing: 20, speed: 0.45, alpha: 0.25, brightAlpha: 0.50 },
      ];

      const layerDrops = layers.map(l => ({
        ...l,
        drops: Array.from({ length: Math.floor(W / l.spacing) }, () => Math.random() * -120),
      }));

      const draw = () => {
        ctx.fillStyle = 'rgba(0,8,0,0.055)';
        ctx.fillRect(0, 0, W, H);

        layerDrops.forEach(layer => {
          ctx.font = layer.size + 'px monospace';
          layer.drops.forEach((y, i) => {
            const char = chars[Math.floor(Math.random() * chars.length)];
            const bright = Math.random() > 0.97;
            const alpha = bright ? layer.brightAlpha : layer.alpha * (0.6 + Math.random() * 0.4);
            ctx.fillStyle = bright
              ? 'rgba(180,255,180,' + alpha + ')'
              : 'rgba(0,' + Math.floor(180 + Math.random()*75) + ',' + Math.floor(40 + Math.random()*30) + ',' + alpha + ')';
            ctx.fillText(char, i * layer.spacing, y * layer.size);
            if (y * layer.size > H && Math.random() > 0.978) layer.drops[i] = 0;
            layer.drops[i] += layer.speed;
          });
        });

        animRef.current = requestAnimationFrame(draw);
      };
      ctx.fillStyle = '#000800'; ctx.fillRect(0, 0, W, H);
      draw();

    } else if (theme === 'cyberpunk') {
      const particles = Array.from({ length: 100 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 1, vy: (Math.random() - 0.5) * 1,
        size: Math.random() * 2.5 + 0.5,
        color: ['255,0,255','0,255,255','255,214,0','255,0,85','57,255,20'][Math.floor(Math.random()*5)],
        life: Math.random() * Math.PI * 2,
      }));
      const draw = () => {
        ctx.clearRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(255,0,255,0.06)'; ctx.lineWidth = 1;
        for (let x = 0; x < W; x += 55) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
        for (let y = 0; y < H; y += 55) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
        particles.forEach(p => {
          p.x = (p.x + p.vx + W) % W; p.y = (p.y + p.vy + H) % H; p.life += 0.02;
          const alpha = Math.sin(p.life) * 0.4 + 0.5;
          ctx.shadowBlur = 15; ctx.shadowColor = `rgb(${p.color})`;
          ctx.fillStyle = `rgba(${p.color},${alpha})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
          ctx.shadowBlur = 0;
        });
        animRef.current = requestAnimationFrame(draw);
      };
      draw();

    } else if (theme === 'synthwave') {
      let t = 0;
      const stars = Array.from({ length: 200 }, () => ({
        x: Math.random()*W, y: Math.random()*H*0.55, size: Math.random()*2+0.3, speed: Math.random()*0.4+0.1,
      }));
      const draw = () => {
        ctx.fillStyle = 'rgba(15,0,40,0.9)'; ctx.fillRect(0,0,W,H); t += 0.004;
        stars.forEach(s => {
          s.y -= s.speed; if (s.y < 0) { s.y = H*0.55; s.x = Math.random()*W; }
          ctx.fillStyle = `rgba(255,128,255,${0.3+Math.sin(t+s.x)*0.25})`;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI*2); ctx.fill();
        });
        const hor = H * 0.56;
        for (let i = 0; i <= 18; i++) {
          const x = (i/18)*W;
          ctx.strokeStyle = `rgba(255,0,204,${0.12+Math.sin(i*0.5+t*2)*0.04})`; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(W/2+(x-W/2)*0.02, hor); ctx.lineTo(x, H); ctx.stroke();
        }
        for (let i = 0; i <= 10; i++) {
          const y = hor + (H-hor)*Math.pow(i/10, 1.4);
          ctx.strokeStyle = `rgba(255,0,204,${0.04+(i/10)*0.15})`; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
        }
        const cx=W/2, cy=hor, r=90;
        const g = ctx.createLinearGradient(cx,cy-r,cx,cy+r);
        g.addColorStop(0,'rgba(255,200,0,0.8)'); g.addColorStop(0.5,'rgba(255,50,180,0.6)'); g.addColorStop(1,'rgba(80,0,180,0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
        animRef.current = requestAnimationFrame(draw);
      };
      draw();

    } else if (theme === 'sketch') {
      ctx.fillStyle = '#f5f0e8'; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 6000; i++) {
        const x=Math.random()*W, y=Math.random()*H;
        ctx.fillStyle = `rgba(120,100,70,${Math.random()*0.05})`; ctx.fillRect(x,y,1,1);
      }
      ctx.strokeStyle='rgba(60,40,20,0.03)'; ctx.lineWidth=0.5;
      for (let i=0; i<50; i++) {
        const y=(i/50)*H+Math.random()*15-7;
        ctx.beginPath(); ctx.moveTo(0,y);
        for (let x=0; x<W; x+=15) ctx.lineTo(x+Math.random()*4-2, y+Math.random()*4-2);
        ctx.stroke();
      }
      const dots = Array.from({length:35},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.25,vy:(Math.random()-.5)*.25,size:Math.random()*2.5+1,alpha:Math.random()*.12+.03}));
      const drawSketch = () => {
        ctx.fillStyle='rgba(245,240,232,0.05)'; ctx.fillRect(0,0,W,H);
        dots.forEach(d => {
          d.x=(d.x+d.vx+W)%W; d.y=(d.y+d.vy+H)%H;
          ctx.fillStyle=`rgba(45,79,193,${d.alpha})`; ctx.beginPath(); ctx.arc(d.x,d.y,d.size,0,Math.PI*2); ctx.fill();
        });
        animRef.current = requestAnimationFrame(drawSketch);
      };
      drawSketch();

    } else if (theme === 'blueprint') {
      ctx.fillStyle='#001833'; ctx.fillRect(0,0,W,H);
      ctx.lineWidth=0.5; ctx.strokeStyle='rgba(77,184,255,0.08)';
      for (let x=0;x<W;x+=20) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
      for (let y=0;y<H;y+=20) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
      ctx.lineWidth=1; ctx.strokeStyle='rgba(77,184,255,0.18)';
      for (let x=0;x<W;x+=100) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
      for (let y=0;y<H;y+=100) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
      ctx.strokeStyle='rgba(77,184,255,0.22)';
      for (let x=0;x<W;x+=100) for (let y=0;y<H;y+=100) {
        const s=8; ctx.beginPath(); ctx.moveTo(x-s,y); ctx.lineTo(x+s,y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x,y-s); ctx.lineTo(x,y+s); ctx.stroke();
      }

    } else {
      const orbs = Array.from({length:30},()=>({
        x:Math.random()*W, y:Math.random()*H, vx:(Math.random()-.5)*.35, vy:(Math.random()-.5)*.35,
        r:Math.random()*100+40,
        color:['124,106,239','0,229,255','244,114,182'][Math.floor(Math.random()*3)],
        phase:Math.random()*Math.PI*2,
      }));
      const draw = () => {
        ctx.clearRect(0,0,W,H);
        orbs.forEach(o => {
          o.x=(o.x+o.vx+W)%W; o.y=(o.y+o.vy+H)%H; o.phase+=0.008;
          const alpha = Math.sin(o.phase)*0.025+0.035;
          const g=ctx.createRadialGradient(o.x,o.y,0,o.x,o.y,o.r);
          g.addColorStop(0,`rgba(${o.color},${alpha})`); g.addColorStop(1,`rgba(${o.color},0)`);
          ctx.fillStyle=g; ctx.beginPath(); ctx.arc(o.x,o.y,o.r,0,Math.PI*2); ctx.fill();
        });
        animRef.current = requestAnimationFrame(draw);
      };
      draw();
    }

    return () => {
      window.removeEventListener('resize', onResize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [theme]);

  return <canvas ref={canvasRef} style={{position:'fixed',inset:0,width:'100vw',height:'100vh',zIndex:0,pointerEvents:'none',opacity:theme==='sketch'?1:0.7}}/>;
}

// ═══════════════════════════════════════════════════
// LIVE MONITOR
// ═══════════════════════════════════════════════════
function LiveMonitorPanel({ onClose }) {
  const { liveStreams, nodes, executing, executionResults } = useStore();
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const termRef = useRef(null);

  const agentNodes = nodes.filter(n => n.type === 'agent' && n.model);
  const activeIds = Object.keys(liveStreams).filter(id => liveStreams[id]?.text || liveStreams[id]?.status !== 'idle');

  const currentId = selectedNodeId || activeIds[0] || agentNodes[0]?.id;
  const stream = liveStreams[currentId];
  const nodeInfo = nodes.find(n => n.id === currentId);
  const res = executionResults[currentId];
  const isStreaming = stream?.status === 'streaming' || stream?.status === 'running';

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [stream?.text]);

  return (
    <div className="live-monitor">
      <div className="live-monitor-header">
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{
            width:8,height:8,borderRadius:'50%',
            background: executing ? 'var(--green)' : 'var(--t3)',
            boxShadow: executing ? '0 0 10px var(--green)' : 'none',
            animation: executing ? 'blink 1s infinite' : 'none',
          }}/>
          <span style={{fontFamily:'var(--mono)',fontSize:12,fontWeight:700,letterSpacing:2,color:'var(--accent)'}}>LIVE MONITOR</span>
          {executing && <span style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--amber)',animation:'blink 0.7s infinite'}}>● LIVE</span>}
        </div>
        <button className="btn btn-sm" onClick={onClose} style={{marginLeft:'auto'}}>✕</button>
      </div>

      {/* Node tabs */}
      <div className="live-tabs">
        {agentNodes.length === 0 ? (
          <div style={{padding:'8px 14px',fontSize:11,color:'var(--t3)',fontFamily:'var(--mono)'}}>
            Add model nodes to the canvas to monitor them here.
          </div>
        ) : agentNodes.map(n => {
          const s = liveStreams[n.id];
          const r = executionResults[n.id];
          const status = s?.status || r?.status;
          const isActive = n.id === currentId;
          return (
            <button key={n.id} className={`live-tab ${isActive?'active':''}`} onClick={() => setSelectedNodeId(n.id)}>
              <div style={{display:'flex',alignItems:'center',gap:5,minWidth:0}}>
                <div style={{
                  width:6,height:6,borderRadius:'50%',flexShrink:0,transition:'all .3s',
                  background: status==='streaming'||status==='running' ? 'var(--amber)' : status==='done' ? 'var(--green)' : status==='error' ? 'var(--red)' : 'var(--t3)',
                  boxShadow: (status==='streaming'||status==='running') ? '0 0 8px var(--amber)' : 'none',
                  animation: (status==='streaming'||status==='running') ? 'blink 0.5s infinite' : 'none',
                }}/>
                <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:10,maxWidth:100}}>
                  {n.model?.name?.replace(/^[^/]+\//,'') || '?'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Terminal */}
      <div className="live-terminal" ref={termRef}>
        {!currentId ? (
          <div style={{textAlign:'center',padding:30,color:'var(--t3)',fontSize:12,fontFamily:'var(--mono)'}}>
            Select a model tab above to monitor its output
          </div>
        ) : (
          <>
            <div style={{padding:'8px 0 10px',borderBottom:'1px solid var(--border)',marginBottom:10}}>
              <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t3)'}}>
                  MODEL<br/><span style={{color:'var(--accent)',fontSize:10}}>{nodeInfo?.model?.name || '?'}</span>
                </div>
                <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t3)'}}>
                  STATUS<br/><span style={{
                    color: isStreaming?'var(--amber)':stream?.status==='done'?'var(--green)':stream?.status==='error'?'var(--red)':'var(--t3)',
                    fontSize:10,
                  }}>{(stream?.status||res?.status||'IDLE').toUpperCase()}</span>
                </div>
                {(stream?.duration||res?.duration) && (
                  <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t3)'}}>
                    TIME<br/><span style={{color:'var(--green)',fontSize:10}}>{((stream?.duration||res?.duration)/1000).toFixed(2)}s</span>
                  </div>
                )}
                <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t3)'}}>
                  CHARS<br/><span style={{color:'var(--t2)',fontSize:10}}>{(stream?.text||'').length}</span>
                </div>
              </div>
            </div>

            {(!stream?.text) ? (
              <div style={{color:'var(--t3)',fontFamily:'var(--mono)',fontSize:11}}>
                {executing ? <><span style={{animation:'blink 1s infinite',display:'inline-block'}}>⟳</span> Waiting for model response...</> : 'Run the pipeline to see live output here.'}
              </div>
            ) : (
              <div style={{fontFamily:'var(--mono)',fontSize:12,lineHeight:1.8,whiteSpace:'pre-wrap',color:'var(--t1)'}}>
                {stream.text}
                {isStreaming && <span className="cursor-blink">▋</span>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════
// AI DEBUGGER PANEL
// ═══════════════════════════════════════════════════
function AIDebugger({ onClose }) {
  const { debugEvents, nodes, executionResults, executing, execLog } = useStore();
  const [tab, setTab] = useState('timeline');
  const [filter, setFilter] = useState('all');
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [debugEvents.length, execLog.length]);

  const agentNodes = nodes.filter(n => n.type === 'agent' && n.model);

  // Build per-node summary
  const nodeSummary = agentNodes.map(n => {
    const res = executionResults[n.id];
    const events = debugEvents.filter(e => e.nodeId === n.id);
    const startEv = events.find(e => e.event === 'start');
    const doneEv = events.find(e => e.event === 'done' || e.event === 'error');
    return {
      id: n.id,
      name: n.model?.name?.replace(/^[^/]+\//, '') || '?',
      provider: n.model?.provider || '?',
      isFree: n.model?.isFree,
      status: res?.status || 'idle',
      duration: res?.duration,
      outputLen: (res?.text || '').length,
      startTime: startEv?.t,
      doneTime: doneEv?.t,
      error: res?.status === 'error' ? res?.text : null,
      events,
    };
  });

  const filteredEvents = filter === 'all' ? debugEvents
    : debugEvents.filter(e => e.status === filter);

  const totalDuration = debugEvents.length > 1
    ? debugEvents[debugEvents.length-1].t - debugEvents[0].t : 0;

  const statusColor = (s) =>
    s === 'done' ? 'var(--green)' : s === 'error' ? 'var(--red)' :
    s === 'running' || s === 'streaming' ? 'var(--amber)' : 'var(--t3)';

  const statusIcon = (s) =>
    s === 'done' ? '✓' : s === 'error' ? '✗' : s === 'running' ? '⟳' : s === 'streaming' ? '▶' : '○';

  const fmtTime = (ms) => ms < 1000 ? ms + 'ms' : (ms/1000).toFixed(2) + 's';
  const fmtTs = (t) => t ? new Date(t).toISOString().slice(11,23) : '—';

  return (
    <div className="ai-debugger">
      {/* Header */}
      <div className="debugger-header">
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{
            width:8,height:8,borderRadius:'50%',
            background:executing?'var(--amber)':'var(--t3)',
            boxShadow:executing?'0 0 10px var(--amber)':'none',
            animation:executing?'blink 0.6s infinite':'none',
          }}/>
          <span style={{fontFamily:'var(--mono)',fontSize:12,fontWeight:700,letterSpacing:2,color:'var(--green)'}}>AI DEBUGGER</span>
          {executing && <span style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--amber)',animation:'blink 0.8s infinite'}}>● RUNNING</span>}
          {!executing && debugEvents.length > 0 && <span style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t3)'}}>
            {debugEvents.length} events · {fmtTime(totalDuration)}
          </span>}
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <button className="btn btn-sm" onClick={()=>useStore.getState().clearDebugEvents()} style={{fontSize:9}}>Clear</button>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',borderBottom:'1px solid var(--border)',padding:'0 10px',gap:2}}>
        {[['timeline','⏱ Timeline'],['nodes','🤖 Nodes'],['log','📋 Log']].map(([k,l])=>(
          <button key={k} className={`mode-btn ${tab===k?'active':''}`} style={{margin:'4px 2px',fontSize:10}} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      <div className="debugger-body" ref={logRef}>

        {/* TIMELINE TAB */}
        {tab === 'timeline' && (
          <div>
            {/* Filter */}
            <div style={{display:'flex',gap:4,marginBottom:8,flexWrap:'wrap'}}>
              {[['all','All'],['running','Running'],['done','Done'],['error','Error']].map(([k,l])=>(
                <button key={k} className={`filter-chip ${filter===k?'active':''}`} style={{fontSize:9}} onClick={()=>setFilter(k)}>{l}</button>
              ))}
            </div>

            {filteredEvents.length === 0 && (
              <div style={{textAlign:'center',padding:24,color:'var(--t3)',fontFamily:'var(--mono)',fontSize:11}}>
                {executing ? '⟳ Waiting for events...' : 'Run the pipeline to see debug timeline.'}
              </div>
            )}

            {filteredEvents.map((ev, i) => {
              const prevT = i > 0 ? filteredEvents[i-1].t : ev.t;
              const delta = ev.t - prevT;
              const name = ev.modelName?.replace(/^[^/]+\//,'') || ev.nodeId?.slice(0,8) || '?';
              return (
                <div key={i} style={{
                  display:'flex',gap:8,padding:'6px 4px',
                  borderBottom:'1px solid var(--border)',
                  borderLeft:`3px solid ${statusColor(ev.status)}`,
                  paddingLeft:8,marginBottom:2,borderRadius:'0 4px 4px 0',
                  background: ev.status==='error' ? 'rgba(239,68,68,.04)' : ev.status==='done' ? 'rgba(34,197,94,.03)' : 'transparent',
                  animation: ev.status==='running'||ev.status==='streaming' ? 'stream-pulse 2s infinite' : 'none',
                }}>
                  <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t3)',minWidth:72,flexShrink:0}}>
                    {fmtTs(ev.t)}
                  </div>
                  <div style={{color:statusColor(ev.status),fontSize:10,minWidth:12,flexShrink:0}}>{statusIcon(ev.status)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:'var(--mono)',fontSize:10,fontWeight:600,color:'var(--t1)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {name}
                      <span style={{color:'var(--t3)',fontWeight:400,marginLeft:6}}>{ev.event?.toUpperCase()}</span>
                    </div>
                    {ev.detail && <div style={{fontSize:9,color:'var(--t3)',marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ev.detail}</div>}
                  </div>
                  {delta > 0 && i > 0 && (
                    <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t3)',flexShrink:0}}>+{fmtTime(delta)}</div>
                  )}
                  {ev.duration && (
                    <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--green)',flexShrink:0}}>{fmtTime(ev.duration)}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* NODES TAB */}
        {tab === 'nodes' && (
          <div>
            {nodeSummary.length === 0 && (
              <div style={{textAlign:'center',padding:24,color:'var(--t3)',fontFamily:'var(--mono)',fontSize:11}}>
                No agents on canvas yet.
              </div>
            )}
            {nodeSummary.map((n, i) => (
              <div key={n.id} style={{
                marginBottom:8,padding:10,borderRadius:8,
                background:'var(--bg-3)',
                border:`1px solid ${n.status==='done'?'var(--green)':n.status==='error'?'var(--red)':n.status==='running'?'var(--amber)':'var(--border)'}`,
                transition:'border-color .3s',
              }}>
                {/* Node header */}
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                  <div style={{
                    width:8,height:8,borderRadius:'50%',flexShrink:0,
                    background:statusColor(n.status),
                    boxShadow:n.status==='running'?`0 0 10px ${statusColor(n.status)}`:'none',
                    animation:n.status==='running'?'blink 0.6s infinite':'none',
                  }}/>
                  <span style={{fontFamily:'var(--mono)',fontSize:11,fontWeight:700,color:'var(--t1)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{n.name}</span>
                  <span style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t3)'}}>{n.provider}</span>
                  <span className={n.isFree?'free-badge':'paid-badge'} style={{fontSize:8}}>{n.isFree?'FREE':'KEY'}</span>
                </div>

                {/* Stats grid */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
                  {[
                    ['STATUS', (n.status||'idle').toUpperCase(), statusColor(n.status)],
                    ['DURATION', n.duration ? fmtTime(n.duration) : '—', 'var(--cyan)'],
                    ['OUTPUT', n.outputLen ? n.outputLen + ' chars' : '—', 'var(--t2)'],
                    ['STARTED', n.startTime ? fmtTs(n.startTime) : '—', 'var(--t3)'],
                    ['FINISHED', n.doneTime ? fmtTs(n.doneTime) : '—', 'var(--t3)'],
                    ['EVENTS', n.events.length.toString(), 'var(--accent)'],
                  ].map(([label, val, color]) => (
                    <div key={label} style={{background:'var(--bg-2)',borderRadius:4,padding:'4px 6px'}}>
                      <div style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--t3)',marginBottom:2}}>{label}</div>
                      <div style={{fontFamily:'var(--mono)',fontSize:10,color:color,fontWeight:600}}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* Error display */}
                {n.error && (
                  <div style={{marginTop:6,padding:'6px 8px',background:'var(--red-g)',border:'1px solid var(--red)',borderRadius:4,fontSize:10,fontFamily:'var(--mono)',color:'var(--red)'}}>
                    ⚠ {n.error}
                  </div>
                )}

                {/* Mini event trail */}
                {n.events.length > 0 && (
                  <div style={{marginTop:6,display:'flex',gap:3,flexWrap:'wrap'}}>
                    {n.events.map((ev, ei) => (
                      <span key={ei} style={{fontFamily:'var(--mono)',fontSize:8,padding:'1px 5px',borderRadius:3,
                        background:ev.status==='done'?'var(--green-g)':ev.status==='error'?'var(--red-g)':'var(--amber-g)',
                        color:statusColor(ev.status),border:`1px solid ${statusColor(ev.status)}40`}}>
                        {ev.event}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Summary stats */}
            {nodeSummary.length > 0 && (
              <div style={{marginTop:8,padding:8,background:'var(--bg-3)',borderRadius:6,border:'1px solid var(--border)'}}>
                <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t3)',marginBottom:6,letterSpacing:1}}>PIPELINE SUMMARY</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
                  {[
                    ['TOTAL AGENTS', nodeSummary.length.toString(), 'var(--accent)'],
                    ['COMPLETED', nodeSummary.filter(n=>n.status==='done').length.toString(), 'var(--green)'],
                    ['ERRORS', nodeSummary.filter(n=>n.status==='error').length.toString(), 'var(--red)'],
                    ['TOTAL OUTPUT', nodeSummary.reduce((a,n)=>a+n.outputLen,0) + ' chars', 'var(--cyan)'],
                    ['TOTAL TIME', fmtTime(totalDuration), 'var(--amber)'],
                    ['EVENTS', debugEvents.length.toString(), 'var(--t2)'],
                  ].map(([label, val, color]) => (
                    <div key={label} style={{background:'var(--bg-2)',borderRadius:4,padding:'4px 6px'}}>
                      <div style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--t3)',marginBottom:2}}>{label}</div>
                      <div style={{fontFamily:'var(--mono)',fontSize:10,color:color,fontWeight:600}}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* LOG TAB */}
        {tab === 'log' && (
          <div>
            {execLog.length === 0 && (
              <div style={{textAlign:'center',padding:24,color:'var(--t3)',fontFamily:'var(--mono)',fontSize:11}}>
                No log entries yet. Run the pipeline.
              </div>
            )}
            {execLog.map((l, i) => (
              <div key={i} style={{
                display:'flex',gap:8,padding:'3px 0',
                borderBottom:'1px solid var(--border)',
                fontFamily:'var(--mono)',fontSize:10,
              }}>
                <span style={{color:'var(--t3)',flexShrink:0,fontSize:9}}>
                  {new Date(l.t).toISOString().slice(11,22)}
                </span>
                <span style={{
                  color: l.msg.includes('✓')||l.msg.includes('complete')?'var(--green)':
                         l.msg.includes('→')?'var(--cyan)':
                         l.msg.includes('error')||l.msg.includes('Error')?'var(--red)':'var(--t2)',
                  flex:1,
                }}>{l.msg}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// THEME PICKER
// ═══════════════════════════════════════════════════
function ThemePicker() {
  const { theme, setTheme } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = THEMES[theme] || THEMES.default;

  useEffect(() => {
    const onOut = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onOut);
    return () => document.removeEventListener('mousedown', onOut);
  }, []);

  return (
    <div ref={ref} style={{position:'relative'}}>
      <button className="btn" onClick={()=>setOpen(o=>!o)} style={{display:'flex',alignItems:'center',gap:6}}>
        {current.icon} {current.name} <span style={{fontSize:9,opacity:.6}}>▼</span>
      </button>
      {open && (
        <div style={{
          position:'absolute',top:'calc(100% + 6px)',right:0,
          background:'var(--bg-2)',border:'1px solid var(--border-b)',borderRadius:10,
          padding:6,zIndex:1000,display:'flex',flexDirection:'column',gap:2,minWidth:150,
          boxShadow:'0 12px 40px rgba(0,0,0,.6)',
        }}>
          {Object.entries(THEMES).map(([key, t]) => (
            <button key={key} onClick={()=>{setTheme(key);setOpen(false);}} style={{
              display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:6,border:'none',
              background:theme===key?'var(--accent-g)':'transparent',
              color:theme===key?'var(--accent)':'var(--t2)',
              cursor:'pointer',fontFamily:'var(--mono)',fontSize:11,textAlign:'left',transition:'all .15s',
            }}>
              <span style={{fontSize:14}}>{t.icon}</span>
              <span>{t.name}</span>
              {theme===key&&<span style={{marginLeft:'auto',color:'var(--accent)'}}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ThemeProvider({ theme, children }) {
  useEffect(() => {
    const vars = THEMES[theme]?.vars || THEMES.default.vars;
    Object.entries(vars).forEach(([k,v]) => document.documentElement.style.setProperty(k, v));
  }, [theme]);
  return children;
}

// ═══════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════
export default function App() {
  const store = useStore();
  const { models, modelsLoading, nodes, connections, prompt, promptTargets,
    executing, showResult, finalResults, selectedNode, settingsOpen, apiKeys,
    apiKeyModalFor, apiKeyStatus, executionResults, wiringMode, execLog,
    liveMonitorOpen, debugPanelOpen, debugEvents, theme } = store;

  const canvasRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [portWiring, setPortWiring] = useState(null);

  useEffect(() => {
    // Static fal.ai video models (not on OpenRouter)
    const FAL_VIDEO_MODELS = [
      { id:'fal-ai/kling-video',        name:'Kling Video 1.6',         desc:'Top quality, 5s/10s clips', isFree:false },
      { id:'fal-ai/wan-t2v',            name:'Wan T2V',                  desc:'Fast open-source T2V',      isFree:false },
      { id:'fal-ai/wan-i2v',            name:'Wan I2V',                  desc:'Image-to-video',            isFree:false },
      { id:'fal-ai/hunyuan-video',      name:'HunyuanVideo',             desc:'High quality, realistic',   isFree:false },
      { id:'fal-ai/minimax-video',      name:'MiniMax Video',            desc:'Smooth motion',             isFree:false },
      { id:'fal-ai/mochi-v1',           name:'Mochi v1',                 desc:'Expressive motion',         isFree:false },
      { id:'fal-ai/ltx-video',          name:'LTX Video',                desc:'Real-time speed',           isFree:false },
      { id:'fal-ai/cogvideox-5b',       name:'CogVideoX-5B',             desc:'Open source 5B model',      isFree:false },
      { id:'fal-ai/animatediff-v2v',    name:'AnimateDiff V2V',          desc:'Video-to-video',            isFree:false },
    ].map(m=>({
      ...m,
      provider:'fal-ai',
      contextLength:0,
      pricing:{prompt:'varies',completion:'varies'},
      inputMods: m.id.includes('i2v')||m.id.includes('v2v') ? ['text','image'] : ['text'],
      outputMods:['video'],
    }));

    // Static OpenRouter image gen models
    const IMAGE_GEN_MODELS = [
      { id:'openai/dall-e-3',                   name:'DALL-E 3',               desc:'Best quality',   isFree:false },
      { id:'openai/dall-e-2',                   name:'DALL-E 2',               desc:'Faster/cheaper', isFree:false },
      { id:'black-forest-labs/flux-1.1-pro',    name:'FLUX 1.1 Pro',           desc:'Best Flux',      isFree:false },
      { id:'black-forest-labs/flux-schnell',    name:'FLUX Schnell',           desc:'Fast Flux',      isFree:false },
      { id:'black-forest-labs/flux-pro',        name:'FLUX Pro',               desc:'High quality',   isFree:false },
      { id:'google/imagen-3',                   name:'Imagen 3',               desc:'Google premium', isFree:false },
      { id:'stability/stable-diffusion-3',      name:'Stable Diffusion 3',     desc:'Open model',     isFree:false },
    ].map(m=>({
      ...m,
      provider: m.id.split('/')[0],
      contextLength:0,
      pricing:{prompt:'varies',completion:'varies'},
      inputMods:['text'],
      outputMods:['image'],
    }));

    fetch('https://openrouter.ai/api/v1/models').then(r=>r.json()).then(j=>{
      const orModels = (j.data||[]).map(m=>{
        const isFree=m.pricing?.prompt==='0'&&m.pricing?.completion==='0';
        const modality=m.architecture?.modality||'text->text';
        const [inMod,outMod]=modality.split('->');
        const inputMods=(inMod||'text').split('+').map(s=>s.trim().toLowerCase());
        const outputMods=(outMod||'text').split('+').map(s=>s.trim().toLowerCase());
        return {id:m.id,name:m.name||m.id,contextLength:m.context_length||4096,pricing:m.pricing||{},isFree,inputMods,outputMods,provider:m.id.split('/')[0]||'?'};
      });
      store.setModels([...FAL_VIDEO_MODELS, ...IMAGE_GEN_MODELS, ...orModels]);
    }).catch(e=>{
      store.setModels([...FAL_VIDEO_MODELS, ...IMAGE_GEN_MODELS]);
      store.setModelsError(e.message);
    });
  }, []);

  useEffect(()=>{
    if (!portWiring&&wiringMode!=='prompt-connect') return;
    const f=(e)=>{if(!canvasRef.current)return;const r=canvasRef.current.getBoundingClientRect();setMousePos({x:e.clientX-r.left,y:e.clientY-r.top});};
    window.addEventListener('mousemove',f); return ()=>window.removeEventListener('mousemove',f);
  },[portWiring,wiringMode]);

  useEffect(()=>{
    const f=(e)=>{if(e.key==='Escape'){setPortWiring(null);store.setWiringMode(null);}};
    window.addEventListener('keydown',f); return ()=>window.removeEventListener('keydown',f);
  },[]);

  const onCanvasDrop = useCallback((e)=>{
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
    const rect=canvasRef.current.getBoundingClientRect();
    const x=e.clientX-rect.left, y=e.clientY-rect.top;
    const mj=e.dataTransfer.getData('text/model');
    const isW=e.dataTransfer.getData('text/wrapper');
    const isO=e.dataTransfer.getData('text/output');
    if (mj) {
      try {
        const model=JSON.parse(mj);
        const wrapper=nodes.find(n=>n.type==='wrapper'&&x>=n.x&&x<=n.x+260&&y>=n.y&&y<=n.y+300);
        store.addNode({type:'agent',model,x:x-90,y:y-40});
        if (wrapper) setTimeout(()=>{const ns=useStore.getState().nodes;const nn=ns[ns.length-1];if(nn)store.addAgentToWrapper(wrapper.id,nn.id);},30);
      } catch {}
    } else if (isW) {
      store.addNode({type:'wrapper',agents:[],mode:'sequential',synthesizerIdx:0,x:x-125,y:y-60});
    } else if (isO) {
      if (nodes.some(n=>n.type==='output')) { alert('Only one Output node.'); return; }
      store.addNode({type:'output',x:x-70,y:y-30});
    }
  },[nodes]);

  const startNodeDrag = useCallback((e,nodeId)=>{
    if (e.target.closest('.port')||e.target.closest('.mode-btn')||e.target.closest('button')) return;
    e.stopPropagation(); store.setSelectedNode(nodeId);
    const node=useStore.getState().nodes.find(n=>n.id===nodeId); if(!node) return;
    const ox=e.clientX-node.x, oy=e.clientY-node.y;
    const onMove=(ev)=>store.moveNode(nodeId,ev.clientX-ox,ev.clientY-oy);
    const onUp=()=>{window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp);};
    window.addEventListener('mousemove',onMove); window.addEventListener('mouseup',onUp);
  },[]);

  const handleNodeClick = useCallback((e,nodeId)=>{
    e.stopPropagation();
    if (wiringMode==='prompt-connect') { store.addPromptTarget(nodeId); store.setWiringMode(null); return; }
    if (portWiring) {
      if (portWiring.nodeId!==nodeId) {
        if (portWiring.port==='out') store.addConnection({from:portWiring.nodeId,to:nodeId});
        else store.addConnection({from:nodeId,to:portWiring.nodeId});
      }
      setPortWiring(null); return;
    }
    store.setSelectedNode(nodeId);
  },[wiringMode,portWiring]);

  const handlePortClick = useCallback((e,nodeId,port)=>{
    e.stopPropagation(); e.preventDefault();
    if (portWiring) {
      if (portWiring.nodeId!==nodeId) {
        if (portWiring.port==='out'&&port==='in') store.addConnection({from:portWiring.nodeId,to:nodeId});
        else if (portWiring.port==='in'&&port==='out') store.addConnection({from:nodeId,to:portWiring.nodeId});
      }
      setPortWiring(null);
    } else {
      const rect=canvasRef.current.getBoundingClientRect();
      setPortWiring({nodeId,port,startX:e.clientX-rect.left,startY:e.clientY-rect.top});
      setMousePos({x:e.clientX-rect.left,y:e.clientY-rect.top});
    }
  },[portWiring]);

  const handleCanvasClick = useCallback(()=>{
    if (wiringMode||portWiring) { store.setWiringMode(null); setPortWiring(null); return; }
    store.setSelectedNode(null);
  },[wiringMode,portWiring]);

  const portPos = useCallback((nid,port)=>{
    const n=nodes.find(x=>x.id===nid); if(!n) return {x:0,y:0};
    const w=n.type==='wrapper'?250:n.type==='output'?140:180;
    const h=n.type==='wrapper'?Math.max(140,90+(n.agents?.length||0)*28):n.type==='output'?60:95;
    return port==='out'?{x:n.x+w,y:n.y+h/2}:{x:n.x,y:n.y+h/2};
  },[nodes]);

  const wiringText = wiringMode==='prompt-connect' ? '🔗 Click a node to connect prompt'
    : portWiring ? `🔗 Click a ${portWiring.port==='out'?'input':'output'} port (ESC cancel)` : null;
  const hasOutput = nodes.some(n=>n.type==='output');

  return (
    <ThemeProvider theme={theme}>
      <div className={`app theme-${theme}`}>
        <ParticleBackground theme={theme} />

        {/* TOPBAR */}
        <div className="topbar">
          <div className="logo">
            <div className="logo-hex">⬡</div>
            HIVEMIND
          </div>
          <div className="topbar-sep"/>
          <div className="topbar-stat"><div className="dot-live"/>{models.length} models</div>
          <div className="topbar-sep"/>
          <div className="topbar-stat">{nodes.filter(n=>n.type==='agent').length} agents · {nodes.filter(n=>n.type==='wrapper').length} wrappers</div>
          {executing && <><div className="topbar-sep"/><div className="topbar-stat" style={{color:'var(--amber)'}}><div className="spinner" style={{width:10,height:10}}/> Running</div></>}
          {wiringText && <><div className="topbar-sep"/><div className="topbar-stat" style={{color:'var(--cyan)',fontWeight:600}}>{wiringText}</div></>}
          <div className="topbar-right">
            <button className={`btn monitor-btn ${liveMonitorOpen?'active':''}`}
              onClick={()=>store.setLiveMonitorOpen(!liveMonitorOpen)}
              style={{position:'relative'}}>
              {executing && <span style={{position:'absolute',top:-3,right:-3,width:8,height:8,borderRadius:'50%',background:'var(--amber)',boxShadow:'0 0 8px var(--amber)',animation:'blink 0.5s infinite'}}/>}
              📡 Live Monitor
            </button>
            <button className={`btn debug-btn ${debugPanelOpen?'active':''}`}
              onClick={()=>store.setDebugPanelOpen(!debugPanelOpen)}
              style={{position:'relative'}}>
              {executing && debugEvents.length>0 && <span style={{position:'absolute',top:-3,right:-3,width:8,height:8,borderRadius:'50%',background:'var(--green)',boxShadow:'0 0 8px var(--green)',animation:'blink 0.5s infinite'}}/>}
              🔬 Debug
            </button>
            <ThemePicker/>
            {apiKeys.openrouter&&<span style={{fontFamily:'var(--mono)',fontSize:10,color:apiKeyStatus.openrouter==='valid'?'var(--green)':apiKeyStatus.openrouter==='invalid'?'var(--red)':'var(--t3)'}}>
              {apiKeyStatus.openrouter==='valid'?'🔑 Valid':apiKeyStatus.openrouter==='invalid'?'🔑 Invalid':'🔑 Set'}
            </span>}
            <button className="btn" onClick={()=>store.setSettingsOpen(true)}>⚙ Settings</button>
          </div>
        </div>

        {/* LEFT PANEL */}
        <div className="left-panel">
          <div className="panel-head"><span>⚡</span> Prompt</div>
          <div className="prompt-box">
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
              <div className={`prompt-dot ${wiringMode==='prompt-connect'?'active':''}`}
                onClick={(e)=>{e.stopPropagation();store.setWiringMode(wiringMode==='prompt-connect'?null:'prompt-connect');setPortWiring(null);}}
                title="Click, then click node(s)"/>
              <span style={{fontFamily:'var(--mono)',fontSize:10,color:promptTargets.length?'var(--green)':wiringMode==='prompt-connect'?'var(--cyan)':'var(--t3)'}}>
                {promptTargets.length?`${promptTargets.length} connected`:wiringMode==='prompt-connect'?'Click node(s)...':'Click dot → click node(s)'}
              </span>
              {promptTargets.length>0&&<button className="btn btn-sm" style={{fontSize:9}} onClick={()=>store.clearPromptTargets()}>Clear all</button>}
            </div>
            {promptTargets.length>0&&<div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:4}}>
              {promptTargets.map(tid=>{
                const label=getNodeLabel(nodes,tid);
                return <span key={tid} style={{fontFamily:'var(--mono)',fontSize:9,padding:'2px 6px',borderRadius:4,background:'var(--cyan-g)',color:'var(--cyan)',display:'flex',alignItems:'center',gap:4}}>
                  {label}<span style={{cursor:'pointer',fontWeight:700}} onClick={()=>store.removePromptTarget(tid)}>×</span>
                </span>;
              })}
            </div>}
            <textarea className="prompt-input" placeholder={"Enter your prompt...\nCtrl+Enter to run"} value={prompt}
              onChange={e=>store.setPrompt(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey))executeGraph();}}/>
            {promptTargets.length>0&&(()=>{
              const connectedModels=promptTargets.map(tid=>nodes.find(n=>n.id===tid)).filter(Boolean).map(n=>n.model).filter(Boolean);
              const allInputs=new Set(); const allOutputs=new Set();
              connectedModels.forEach(m=>{m.inputMods?.forEach(x=>allInputs.add(x));m.outputMods?.forEach(x=>allOutputs.add(x));});
              promptTargets.forEach(tid=>{const n=nodes.find(x=>x.id===tid);if(n?.type==='wrapper')(n.agents||[]).forEach(a=>{const an=nodes.find(x=>x.id===a.nodeId);an?.model?.inputMods?.forEach(x=>allInputs.add(x));an?.model?.outputMods?.forEach(x=>allOutputs.add(x));});});
              return <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:4}}>
                <span style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t3)'}}>Accepts:</span>
                {[...allInputs].map(t=><span key={t} className={`cap-tag ${t}`} style={{fontSize:9}}>{t==='image'?'🖼 image':t==='audio'?'🔊 audio':`📝 ${t}`}</span>)}
                {allOutputs.has('image')&&<><span style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t3)',marginLeft:4}}>Out:</span><span className="cap-tag image" style={{fontSize:9}}>🎨 img</span></>}
              </div>;
            })()}
            <FileUploadZone/>
            <button className="btn btn-primary" onClick={executeGraph} disabled={executing||!prompt.trim()||!promptTargets.length}>
              {executing?<><div className="spinner" style={{marginRight:6}}/> Processing...</>:'⬡ Execute Pipeline'}
            </button>
            {!promptTargets.length&&prompt.trim()&&<div style={{fontSize:10,color:'var(--amber)',fontFamily:'var(--mono)'}}>⚠ Click cyan dot then click node(s)</div>}
            {execLog.length>0&&<div style={{marginTop:8,maxHeight:100,overflowY:'auto',borderTop:'1px solid var(--border)',paddingTop:6}}>
              <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t3)',marginBottom:3}}>LOG</div>
              {execLog.map((l,i)=><div key={i} style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t2)',lineHeight:1.5}}>{l.msg}</div>)}
            </div>}
          </div>
        </div>

        {/* CENTER CANVAS */}
        <div className="canvas-wrap">
          {/* Live Monitor Panel */}
          {liveMonitorOpen && <LiveMonitorPanel onClose={()=>store.setLiveMonitorOpen(false)}/>
          }
          {/* AI Debugger Panel */}
          {debugPanelOpen && <AIDebugger onClose={()=>store.setDebugPanelOpen(false)}/>}

          <div className={`canvas-area ${dragOver?'drag-over':''}`} ref={canvasRef}
            onDrop={onCanvasDrop}
            onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='move';setDragOver(true);}}
            onDragLeave={()=>setDragOver(false)}
            onClick={handleCanvasClick}>

            <div className={theme==='sketch'?'canvas-grid-sketch':'canvas-grid'}/>

            <svg className="canvas-svg" style={{width:'100%',height:'100%'}}>
              {promptTargets.map(tid=>{
                const tp=portPos(tid,'in');
                return <line key={`pt-${tid}`} x1={0} y1={tp.y} x2={tp.x} y2={tp.y} stroke="var(--cyan)" strokeWidth="2" strokeDasharray="6 3" opacity=".6">
                  <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="1s" repeatCount="indefinite"/></line>;
              })}
              {connections.map(c=>{
                const f=portPos(c.from,'out'), t=portPos(c.to,'in'), mx=(f.x+t.x)/2;
                return <g key={c.id}>
                  <path d={`M${f.x},${f.y} C${mx},${f.y} ${mx},${t.y} ${t.x},${t.y}`} stroke="var(--accent)" strokeWidth="2" fill="none" opacity=".6"/>
                  <circle r="3" fill="var(--accent)"><animateMotion path={`M${f.x},${f.y} C${mx},${f.y} ${mx},${t.y} ${t.x},${t.y}`} dur="2s" repeatCount="indefinite"/></circle>
                </g>;
              })}
              {portWiring&&<line x1={portWiring.startX} y1={portWiring.startY} x2={mousePos.x} y2={mousePos.y} stroke="var(--accent)" strokeWidth="2" strokeDasharray="6 3" opacity=".8"/>}
            </svg>

            <div className="nodes-layer">
              {nodes.map(node=>{
                const sel=selectedNode===node.id;
                const res=executionResults[node.id];
                const isPT=promptTargets.includes(node.id);
                const statusBorder=res?.status==='running'?'var(--amber)':res?.status==='done'?'var(--green)':res?.status==='error'?'var(--red)':isPT?'var(--cyan)':'transparent';
                const ls=useStore.getState().liveStreams[node.id];
                const isStreaming=ls?.status==='streaming'||ls?.status==='running';

                if (node.type==='agent') {
                  const m=node.model;
                  return <div key={node.id} className={`node agent-node ${sel?'selected':''} ${isStreaming?'streaming':''}`}
                    style={{left:node.x,top:node.y}} onMouseDown={e=>startNodeDrag(e,node.id)} onClick={e=>handleNodeClick(e,node.id)}>
                    <div className="port port-in" onClick={e=>handlePortClick(e,node.id,'in')}/>
                    <div className="port port-out" onClick={e=>handlePortClick(e,node.id,'out')}/>
                    {res?.status==='running'&&<div className="processing-overlay"><div className="spinner"/></div>}
                    <div className="agent-header" style={{borderLeft:`3px solid ${statusBorder}`}}>
                      <span style={{fontSize:13}}>{m?.isFree?'🟢':'🟡'}</span>
                      <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:11,fontWeight:600}}>
                        {m?.name?.replace(/^[^/]+\//,'')||'?'}
                      </span>
                      {m?.isFree?<span className="free-badge">FREE</span>:<span className="paid-badge">KEY</span>}
                    </div>
                    <div className="agent-body">
                      <div>{m?.provider}</div>
                      <div style={{fontSize:9}}>ctx: {m?.contextLength?(m.contextLength/1000).toFixed(0)+'k':'?'}</div>
                      <div className="agent-caps">
                        {m?.inputMods?.map(mod=><span key={`i-${mod}`} className={`cap-tag ${mod}`}>{mod}</span>)}
                        {m?.outputMods?.filter(o=>o!=='text').map(mod=><span key={`o-${mod}`} className={`cap-tag ${mod}`} style={{fontWeight:700}}>→{mod}</span>)}
                      </div>
                      {res?.duration&&<div style={{fontSize:8,color:'var(--green)',marginTop:3}}>{(res.duration/1000).toFixed(1)}s</div>}
                    </div>
                    {isStreaming&&ls?.text&&<div style={{padding:'4px 8px',borderTop:'1px solid var(--border)',fontSize:9,fontFamily:'var(--mono)',color:'var(--amber)',maxHeight:36,overflow:'hidden',lineHeight:1.4,opacity:.85}}>
                      {ls.text.slice(-100)}<span className="cursor-blink">▋</span>
                    </div>}
                    {sel&&<div style={{padding:'4px 8px',borderTop:'1px solid var(--border)',display:'flex',gap:4}}>
                      <button className="btn btn-sm" style={{flex:1,fontSize:9}} onClick={e=>{e.stopPropagation();store.setLiveMonitorOpen(true);}}>📡 Monitor</button>
                      <button className="btn btn-sm btn-danger" onClick={e=>{e.stopPropagation();store.removeNode(node.id);}}>✕</button>
                    </div>}
                  </div>;
                }

                if (node.type==='wrapper') {
                  const agents=node.agents||[];
                  const mode=node.mode||'sequential';
                  const synthIdx=node.synthesizerIdx??agents.length-1;
                  return <div key={node.id} className={`node wrapper-node ${sel?'selected':''}`}
                    style={{left:node.x,top:node.y}} onMouseDown={e=>startNodeDrag(e,node.id)} onClick={e=>handleNodeClick(e,node.id)}
                    onDrop={e=>{e.preventDefault();e.stopPropagation();const mj=e.dataTransfer.getData('text/model');if(!mj)return;try{const model=JSON.parse(mj);store.addNode({type:'agent',model,x:node.x+20,y:node.y+90+agents.length*28});setTimeout(()=>{const ns=useStore.getState().nodes;const nn=ns[ns.length-1];if(nn)store.addAgentToWrapper(node.id,nn.id);},30);}catch{}}}
                    onDragOver={e=>{e.preventDefault();e.stopPropagation();}}>
                    <div className="port port-in" onClick={e=>handlePortClick(e,node.id,'in')}/>
                    <div className="port port-out" onClick={e=>handlePortClick(e,node.id,'out')}/>
                    {res?.status==='running'&&<div className="processing-overlay"><div className="spinner"/></div>}
                    <div className="wrapper-header" style={{borderLeft:`3px solid ${statusBorder}`}}>
                      <span>📦</span><span>Wrapper ({mode})</span>
                      <span style={{marginLeft:'auto',fontSize:9,fontFamily:'var(--mono)',color:'var(--t3)'}}>{agents.length} agents</span>
                    </div>
                    <div className="wrapper-body">
                      <div className="wrapper-mode">
                        <button className={`mode-btn ${mode==='sequential'?'active':''}`} onClick={e=>{e.stopPropagation();store.setWrapperMode(node.id,'sequential');}}>Sequential</button>
                        <button className={`mode-btn ${mode==='parallel'?'active':''}`} onClick={e=>{e.stopPropagation();store.setWrapperMode(node.id,'parallel');}}>Parallel</button>
                      </div>
                      <div className="wrapper-agents">
                        {!agents.length&&<div style={{fontSize:10,color:'var(--t3)',textAlign:'center',padding:'10px 0',border:'1px dashed var(--border-b)',borderRadius:6}}>Drop models here</div>}
                        {agents.map((a,i)=>{
                          const an=nodes.find(n=>n.id===a.nodeId);
                          const ar=executionResults[a.nodeId];
                          const isSynth=mode==='parallel'&&i===synthIdx;
                          return <div key={a.nodeId} className="wrapper-agent-item">
                            <span className="priority-num">#{i+1}</span>
                            <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{an?.model?.name?.replace(/^[^/]+\//,'')||'?'}</span>
                            {isSynth&&<span className="synthesizer-tag">SYNTH</span>}
                            {ar?.status==='running'&&<div className="spinner" style={{width:10,height:10}}/>}
                            {ar?.status==='done'&&<span style={{color:'var(--green)',fontSize:10}}>✓</span>}
                            {ar?.status==='error'&&<span style={{color:'var(--red)',fontSize:10}}>✗</span>}
                            {ar?.duration&&<span style={{fontSize:8,color:'var(--t3)',fontFamily:'var(--mono)'}}>{(ar.duration/1000).toFixed(1)}s</span>}
                            <button style={{background:'none',border:'none',color:'var(--t3)',cursor:'pointer',fontSize:10}} onClick={e=>{e.stopPropagation();const arr=[...agents];if(i>0){[arr[i],arr[i-1]]=[arr[i-1],arr[i]];store.reorderWrapperAgents(node.id,arr);}}}>▲</button>
                            <button style={{background:'none',border:'none',color:'var(--t3)',cursor:'pointer',fontSize:10}} onClick={e=>{e.stopPropagation();const arr=[...agents];if(i<arr.length-1){[arr[i],arr[i+1]]=[arr[i+1],arr[i]];store.reorderWrapperAgents(node.id,arr);}}}>▼</button>
                            {mode==='parallel'&&!isSynth&&<button style={{background:'none',border:'none',color:'var(--cyan)',cursor:'pointer',fontSize:8,fontFamily:'var(--mono)'}} onClick={e=>{e.stopPropagation();store.setWrapperSynthesizer(node.id,i);}}>S</button>}
                            <button style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:12}} onClick={e=>{e.stopPropagation();store.removeAgentFromWrapper(node.id,a.nodeId);}}>×</button>
                          </div>;
                        })}
                      </div>
                    </div>
                    {sel&&<div style={{padding:'4px 10px 8px'}}><button className="btn btn-sm btn-danger" style={{width:'100%'}} onClick={e=>{e.stopPropagation();store.removeNode(node.id);}}>Delete Wrapper</button></div>}
                  </div>;
                }

                if (node.type==='output') {
                  return <div key={node.id} className={`node output-node ${sel?'selected':''}`}
                    style={{left:node.x,top:node.y}} onMouseDown={e=>startNodeDrag(e,node.id)} onClick={e=>handleNodeClick(e,node.id)}>
                    <div className="port port-in" onClick={e=>handlePortClick(e,node.id,'in')}/>
                    <div style={{fontSize:18}}>📤</div>
                    <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--green)'}}>OUTPUT</div>
                    {sel&&<button className="btn btn-sm btn-danger" style={{marginTop:6,width:'100%'}} onClick={e=>{e.stopPropagation();store.removeNode(node.id);}}>Remove</button>}
                  </div>;
                }
                return null;
              })}
            </div>

            {!nodes.length&&<div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center',zIndex:15,pointerEvents:'none'}}>
              <div style={{fontSize:40,opacity:.4,marginBottom:12}}>⬡</div>
              <div style={{fontSize:18,fontWeight:700,marginBottom:8,color:'var(--t2)'}}>Build Your AI Pipeline</div>
              <div style={{fontSize:12,color:'var(--t3)',maxWidth:420,lineHeight:1.8}}>
                1. Drag models from right panel onto canvas<br/>
                2. Drag Wrapper/Output from toolbox<br/>
                3. Connect ports to chain agents<br/>
                4. Click cyan dot → click node(s) to connect prompt<br/>
                5. Hit Execute — all paths run in parallel<br/>
                6. Click 📡 Live Monitor to watch AI think in real time
              </div>
            </div>}
          </div>

          {showResult&&finalResults.length>0&&<ResultPanel/>}
        </div>

        <ModelBrowser/>

        <div className="bottombar">
          <span>{nodes.filter(n=>n.type==='agent'&&n.model?.isFree).length} free</span>
          <span>·</span>
          <span>{nodes.filter(n=>n.type==='agent'&&!n.model?.isFree).length} paid</span>
          <span>·</span>
          <span>{hasOutput?'✓ Output set':'⚠ No output'}</span>
          <span style={{marginLeft:'auto',fontFamily:'var(--mono)',fontSize:10}}>
            HIVEMIND v2.0 · {THEMES[theme]?.icon} {THEMES[theme]?.name}
          </span>
        </div>

        {settingsOpen&&<SettingsModal/>}
        {apiKeyModalFor&&<ApiKeyPromptModal/>}
      </div>
    </ThemeProvider>
  );
}

// ═══════════════════════════════════════════════════
// FILE UPLOAD ZONE
// ═══════════════════════════════════════════════════
function FileUploadZone() {
  const store=useStore(); const {uploadedFiles}=store; const fileRef=useRef(null);
  const classifyFile=(f)=>f.type.startsWith('image/')?'image':f.type.startsWith('audio/')?'audio':f.type==='application/pdf'?'pdf':'text';
  const handleFiles=(list)=>{for(const f of list){if(uploadedFiles.length>=5)break;const r=new FileReader();r.onload=(ev)=>store.addUploadedFile({name:f.name,type:f.type,size:f.size,dataUrl:ev.target.result,fileType:classifyFile(f)});r.readAsDataURL(f);}};
  return <div>
    <div style={{border:'1px dashed var(--border-b)',borderRadius:6,padding:'6px 10px',textAlign:'center',fontSize:11,color:'var(--t3)',cursor:'pointer',transition:'all .15s',marginBottom:uploadedFiles.length?6:0}}
      onClick={()=>fileRef.current?.click()}
      onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor='var(--cyan)';}}
      onDragLeave={e=>{e.currentTarget.style.borderColor='var(--border-b)';}}
      onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor='var(--border-b)';handleFiles(e.dataTransfer.files);}}>
      📎 Drop files or click (max 5)
      <input ref={fileRef} type="file" hidden multiple accept="image/*,audio/*,.txt,.pdf,.csv,.json,.md,.py,.js,.html" onChange={e=>handleFiles(e.target.files)}/>
    </div>
    {uploadedFiles.length>0&&<div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
      {uploadedFiles.map((f,i)=>(
        <div key={i} style={{display:'flex',alignItems:'center',gap:4,padding:'3px 6px',background:'var(--bg-3)',border:'1px solid var(--border)',borderRadius:4,fontSize:9,fontFamily:'var(--mono)',color:'var(--t2)',maxWidth:180}}>
          {f.fileType==='image'&&<img src={f.dataUrl} alt="" style={{width:18,height:18,borderRadius:2,objectFit:'cover'}}/>}
          {f.fileType==='audio'&&<span>🔊</span>}
          {f.fileType==='pdf'&&<span>📄</span>}
          {f.fileType==='text'&&<span>📝</span>}
          <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{f.name}</span>
          <span style={{cursor:'pointer',color:'var(--red)',fontWeight:700}} onClick={()=>store.removeUploadedFile(i)}>×</span>
        </div>
      ))}
      <button className="btn btn-sm" style={{fontSize:8}} onClick={()=>store.clearUploadedFiles()}>Clear</button>
    </div>}
  </div>;
}

function RenderContent({text, images, videos}) {
  const [expandedImg, setExpandedImg] = useState(null);

  return <>
    {/* Lightbox */}
    {expandedImg && (
      <div onClick={()=>setExpandedImg(null)} style={{
        position:'fixed',inset:0,background:'rgba(0,0,0,.9)',zIndex:9999,
        display:'flex',alignItems:'center',justifyContent:'center',cursor:'zoom-out',
      }}>
        <img src={expandedImg} alt="Expanded" style={{maxWidth:'90vw',maxHeight:'90vh',borderRadius:8,boxShadow:'0 0 60px rgba(0,0,0,.8)'}}/>
        <div style={{position:'absolute',top:16,right:24,fontSize:28,color:'#fff',cursor:'pointer'}}>✕</div>
      </div>
    )}

    {/* Video outputs */}
    {videos && videos.length > 0 && (
      <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:12}}>
        {videos.map((url,i) => (
          <div key={i} style={{borderRadius:10,overflow:'hidden',border:'1px solid var(--border)',background:'#000',position:'relative'}}>
            <div style={{padding:'4px 10px',background:'var(--bg-3)',display:'flex',alignItems:'center',gap:8,borderBottom:'1px solid var(--border)'}}>
              <span style={{fontSize:9,fontFamily:'var(--mono)',color:'var(--pink)'}}>🎬 VIDEO OUTPUT #{i+1}</span>
              <a href={url} target="_blank" rel="noreferrer" style={{marginLeft:'auto',fontSize:9,fontFamily:'var(--mono)',color:'var(--cyan)',textDecoration:'none'}}>⬇ Download</a>
            </div>
            <video controls style={{width:'100%',maxHeight:360,display:'block'}} preload="metadata">
              <source src={url}/>
              Your browser doesn't support HTML5 video.
            </video>
          </div>
        ))}
      </div>
    )}

    {/* Image outputs */}
    {images && images.length > 0 && (
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
        {images.map((url,i) => (
          <div key={i} style={{position:'relative',display:'inline-block'}}>
            <img
              src={url} alt={`Generated ${i+1}`}
              onClick={()=>setExpandedImg(url)}
              style={{maxWidth:320,maxHeight:320,borderRadius:8,border:'1px solid var(--border)',cursor:'zoom-in',display:'block',transition:'transform .15s'}}
              onMouseEnter={e=>e.target.style.transform='scale(1.02)'}
              onMouseLeave={e=>e.target.style.transform='scale(1)'}
              onError={e=>{e.target.closest('div').style.display='none';}}
            />
            <div style={{position:'absolute',bottom:6,right:6,display:'flex',gap:4}}>
              <a href={url} download={`hivemind-img-${i+1}.png`} target="_blank" rel="noreferrer"
                onClick={e=>e.stopPropagation()}
                style={{padding:'3px 6px',borderRadius:4,background:'rgba(0,0,0,.7)',color:'var(--cyan)',fontSize:9,fontFamily:'var(--mono)',textDecoration:'none',backdropFilter:'blur(4px)'}}>
                ⬇
              </a>
              <button onClick={e=>{e.stopPropagation();setExpandedImg(url);}}
                style={{padding:'3px 6px',borderRadius:4,background:'rgba(0,0,0,.7)',color:'#fff',fontSize:9,fontFamily:'var(--mono)',border:'none',cursor:'pointer',backdropFilter:'blur(4px)'}}>
                ⛶
              </button>
            </div>
          </div>
        ))}
      </div>
    )}

    {text && <div style={{whiteSpace:'pre-wrap'}}>{text}</div>}
  </>;
}

// ═══════════════════════════════════════════════════
// RESULT PANEL
// ═══════════════════════════════════════════════════
function ResultPanel() {
  const store=useStore(); const {finalResults,executionResults,nodes}=store;
  const [activeTab,setActiveTab]=useState(0);
  const nodeEntries=Object.entries(executionResults).filter(([,r])=>r.text||r.images?.length||r.videos?.length).map(([nid,r])=>({nid,label:r.modelName?.replace(/^[^/]+\//,'')||getNodeLabel(nodes,nid),...r}));
  return <div className="result-panel" style={{maxHeight:'55vh'}}>
    <div className="result-head">
      <span>{finalResults.every(r=>r.result?.ok)?'✅':'❌'}</span>
      <span>Results ({finalResults.length} path{finalResults.length!==1?'s':''})</span>
      <button className="btn btn-sm" style={{marginLeft:'auto'}} onClick={()=>store.setShowResult(false)}>Close</button>
    </div>
    <div style={{display:'flex',borderBottom:'1px solid var(--border)',padding:'0 10px',flexWrap:'wrap'}}>
      {finalResults.map((r,i)=><button key={i} className={`mode-btn ${activeTab===i?'active':''}`} style={{margin:'4px 2px'}} onClick={()=>setActiveTab(i)}>
        {finalResults.length>1?`Path ${i+1}: ${r.startNodeName}`:'Final'}
      </button>)}
      <button className={`mode-btn ${activeTab==='all'?'active':''}`} style={{margin:'4px 2px'}} onClick={()=>setActiveTab('all')}>All Agents</button>
    </div>
    <div className="result-body">
      {activeTab==='all'?(
        nodeEntries.length>0?nodeEntries.map((e,i)=>(
          <div key={i} style={{marginBottom:12,padding:8,background:'var(--bg-3)',borderRadius:6,border:'1px solid var(--border)'}}>
            <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--accent)',marginBottom:4,display:'flex',alignItems:'center',gap:6}}>
              <span>{e.status==='done'?'🟢':e.status==='error'?'🔴':'⏳'}</span>
              <strong>{e.label}</strong>
              {e.duration&&<span style={{color:'var(--t3)'}}>{(e.duration/1000).toFixed(1)}s</span>}
            </div>
            <div style={{fontSize:12,lineHeight:1.6}}><RenderContent text={e.text} images={e.images} videos={e.videos}/></div>
          </div>
        )):<div style={{color:'var(--t3)'}}>No agent results yet.</div>
      ):(()=>{
        const r=finalResults[typeof activeTab==='number'?activeTab:0]; if(!r) return null;
        return <>
          <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)',marginBottom:6}}>Path: {r.path?.join(' → ')||r.startNodeName}</div>
          <RenderContent text={r.result?.text} images={r.result?.images} videos={r.result?.videos}/>
          {r.result?.agentResults&&<div style={{marginTop:12,borderTop:'1px solid var(--border)',paddingTop:8}}>
            <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)',marginBottom:4}}>Agent breakdown:</div>
            {r.result.agentResults.map((ar,i)=>(
              <div key={i} style={{marginBottom:8,padding:6,background:'var(--bg-3)',borderRadius:4,border:'1px solid var(--border)'}}>
                <div style={{fontFamily:'var(--mono)',fontSize:9,color:ar.isSynth?'var(--cyan)':'var(--accent)',marginBottom:2}}>
                  {ar.isSynth?'🔷 SYNTH: ':'🔹 '}{ar.name?.replace(/^[^/]+\//,'')||`Agent ${i+1}`}
                  {ar.duration&&<span style={{color:'var(--t3)',marginLeft:6}}>{(ar.duration/1000).toFixed(1)}s</span>}
                </div>
                <div style={{fontSize:11,lineHeight:1.5,maxHeight:200,overflowY:'auto'}}><RenderContent text={ar.text} images={ar.images} videos={ar.videos}/></div>
              </div>
            ))}
          </div>}
        </>;
      })()}
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════
// MODEL BROWSER
// ═══════════════════════════════════════════════════
function ModelBrowser() {
  const models=useStore(s=>s.models); const modelsLoading=useStore(s=>s.modelsLoading); const nodes=useStore(s=>s.nodes);
  const [search,setSearch]=useState(''); const [filter,setFilter]=useState('all');
  const hasOutput=nodes.some(n=>n.type==='output');
  const filtered=useMemo(()=>{
    let list=models;
    if(search){const q=search.toLowerCase();list=list.filter(m=>m.name.toLowerCase().includes(q)||m.id.toLowerCase().includes(q));}
    if(filter==='free')list=list.filter(m=>m.isFree);
    else if(filter==='paid')list=list.filter(m=>!m.isFree);
    else if(filter==='image')list=list.filter(m=>m.inputMods?.includes('image'));
    else if(filter==='imggen')list=list.filter(m=>m.outputMods?.includes('image'));
    else if(filter==='video')list=list.filter(m=>m.outputMods?.includes('video'));
    else if(filter==='code')list=list.filter(m=>m.id.includes('code')||m.id.includes('coder'));
    return list.slice(0,200);
  },[models,search,filter]);
  return <div className="right-panel">
    <div className="panel-head"><span>📡</span> Models ({models.length})</div>
    <div className="search-box"><input className="search-input" placeholder="Search models..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
    <div className="filter-row">
      {[
        ['all','All'],
        ['free','🟢 Free'],
        ['paid','🟡 Paid'],
        ['image','🖼 Vision'],
        ['imggen','🎨 Img Gen'],
        ['video','🎬 Video'],
        ['code','💻 Code'],
      ].map(([k,l])=>
        <button key={k} className={`filter-chip ${filter===k?'active':''}`} onClick={()=>setFilter(k)}>{l}</button>
      )}
    </div>
    <div className="toolbox">
      <div className="model-card tool-item" style={{borderColor:'var(--accent)'}} draggable="true" onDragStart={e=>{e.dataTransfer.setData('text/wrapper','1');e.dataTransfer.effectAllowed='move';}}>
        <span style={{fontSize:14}}>📦</span><div style={{fontSize:10,fontFamily:'var(--mono)',color:'var(--accent)'}}>Wrapper</div>
      </div>
      <div className="model-card tool-item" style={{borderColor:hasOutput?'var(--t3)':'var(--green)',opacity:hasOutput?0.4:1,cursor:hasOutput?'not-allowed':'grab'}}
        draggable={!hasOutput} onDragStart={e=>{if(hasOutput){e.preventDefault();return;}e.dataTransfer.setData('text/output','1');e.dataTransfer.effectAllowed='move';}}>
        <span style={{fontSize:14}}>📤</span><div style={{fontSize:10,fontFamily:'var(--mono)',color:hasOutput?'var(--t3)':'var(--green)'}}>{hasOutput?'Output ✓':'Output'}</div>
      </div>
    </div>
    <div className="model-list">
      {modelsLoading&&<div style={{textAlign:'center',padding:20,color:'var(--t3)'}}><div className="spinner" style={{margin:'0 auto 8px'}}/><div style={{fontSize:11}}>Loading from OpenRouter...</div></div>}
      {filtered.map(m=>{
        const isVid=m.outputMods?.includes('video');
        const isImg=m.outputMods?.includes('image')&&!isVid;
        const isVision=m.inputMods?.includes('image');
        return <div key={m.id} className="model-card" draggable="true"
          style={{
            borderColor: isVid?'rgba(232,121,249,.35)':isImg?'rgba(251,146,60,.35)':'',
          }}
          onDragStart={e=>{e.dataTransfer.setData('text/model',JSON.stringify(m));e.dataTransfer.effectAllowed='move';}}>
          <div className="model-card-head">
            <span className="model-card-name">
              {isVid && <span style={{fontSize:11,marginRight:4}}>🎬</span>}
              {isImg && <span style={{fontSize:11,marginRight:4}}>🎨</span>}
              {m.name}
            </span>
          </div>
          <div className="model-card-provider">{m.provider}</div>
          {m.desc && <div style={{fontSize:9,color:'var(--t3)',fontFamily:'var(--mono)',marginTop:2,marginBottom:2}}>{m.desc}</div>}
          <div className="model-card-meta">
            <span className={`meta-tag ${m.isFree?'free':'paid'}`}>{m.isFree?'FREE':'PAID'}</span>
            {m.contextLength>0 && <span className="meta-tag">{(m.contextLength/1000).toFixed(0)}k</span>}
            {isVision && <span className="meta-tag" style={{color:'var(--pink)'}}>👁 vision</span>}
            {m.inputMods?.filter(mod=>mod!=='text').map(mod=><span key={`i-${mod}`} className="meta-tag" style={{color:mod==='image'?'var(--pink)':mod==='audio'?'var(--amber)':'var(--t3)'}}>{mod}</span>)}
            {isVid && <span className="meta-tag" style={{color:'var(--fuchsia,#e879f9)',fontWeight:700,background:'rgba(232,121,249,.1)',border:'1px solid rgba(232,121,249,.3)'}}>🎬 video out</span>}
            {isImg && <span className="meta-tag" style={{color:'var(--amber)',fontWeight:700,background:'rgba(251,146,60,.1)',border:'1px solid rgba(251,146,60,.3)'}}>🎨 image out</span>}
          </div>
        </div>;
      })}
      {!modelsLoading&&!filtered.length&&<div style={{textAlign:'center',padding:20,fontSize:11,color:'var(--t3)'}}>No models found.</div>}
    </div>
  </div>;
}

function SettingsModal() {
  const store=useStore(); const {apiKeys,apiKeyStatus}=store;
  const [orKey,setOrKey]=useState(apiKeys.openrouter||'');
  const [falKey,setFalKey]=useState(apiKeys.fal||'');
  const [checking,setChecking]=useState(false);
  const [activeSection,setActiveSection]=useState('openrouter');

  const handleSaveOR=async()=>{
    if(!orKey.trim()){store.setApiKey('openrouter','');store.setApiKeyStatus('openrouter',null);store.setSettingsOpen(false);return;}
    setChecking(true);store.setApiKeyStatus('openrouter','checking');
    const s=await validateOpenRouterKey(orKey.trim());store.setApiKeyStatus('openrouter',s);
    if(s==='valid')store.setApiKey('openrouter',orKey.trim());
    setChecking(false);
  };
  const handleSaveFal=()=>{
    store.setApiKey('fal', falKey.trim());
    store.setApiKeyStatus('fal', falKey.trim() ? 'valid' : null);
    store.setSettingsOpen(false);
  };
  const orStatus=checking?'checking':apiKeyStatus.openrouter;
  const falStatus=apiKeys.fal?'valid':null;

  return <div className="modal-overlay" onClick={()=>store.setSettingsOpen(false)}>
    <div className="modal" style={{minWidth:440}} onClick={e=>e.stopPropagation()}>
      <h3>⚙️ Settings</h3>

      {/* Section tabs */}
      <div style={{display:'flex',gap:4,marginBottom:16,borderBottom:'1px solid var(--border)',paddingBottom:8}}>
        {[['openrouter','🔑 OpenRouter'],['fal','🎬 fal.ai (Video)']].map(([k,l])=>(
          <button key={k} className={`mode-btn ${activeSection===k?'active':''}`} onClick={()=>setActiveSection(k)}>{l}</button>
        ))}
      </div>

      {/* OpenRouter section */}
      {activeSection==='openrouter' && <>
        <label className="modal-label">OpenRouter API Key</label>
        <div style={{fontSize:10,color:'var(--t3)',marginBottom:6,lineHeight:1.5}}>
          Powers all <strong style={{color:'var(--t2)'}}>text chat</strong> and <strong style={{color:'var(--pink)'}}>image generation</strong> (DALL-E, Flux, Stable Diffusion).
          Get a key at <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" style={{color:'var(--cyan)'}}>openrouter.ai/keys</a>
        </div>
        <input className="modal-input" type="password" placeholder="sk-or-..." value={orKey} onChange={e=>setOrKey(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSaveOR()}/>
        {orStatus&&<div className={`key-status ${orStatus}`}>
          {orStatus==='valid'&&'✅ Key is valid — text + image gen ready'}
          {orStatus==='invalid'&&'❌ Key is invalid'}
          {orStatus==='checking'&&<><div className="spinner" style={{width:12,height:12}}/> Validating...</>}
        </div>}
        {!orStatus&&<div className="key-status none">No key — free models only via Puter.js</div>}
        <div className="modal-actions">
          <button className="btn" onClick={()=>store.setSettingsOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveOR} disabled={checking}>{checking?'Checking...':'Save & Validate'}</button>
        </div>
      </>}

      {/* fal.ai section */}
      {activeSection==='fal' && <>
        <label className="modal-label">fal.ai API Key</label>
        <div style={{fontSize:10,color:'var(--t3)',marginBottom:6,lineHeight:1.5}}>
          Powers <strong style={{color:'var(--pink)'}}>AI video generation</strong> — Kling, Wan, HunyuanVideo, MiniMax, Mochi, LTX-Video and more.
          Get a free key at <a href="https://fal.ai/dashboard/keys" target="_blank" rel="noreferrer" style={{color:'var(--cyan)'}}>fal.ai/dashboard/keys</a>
        </div>
        <input className="modal-input" type="password" placeholder="fal_keyid:secret..." value={falKey} onChange={e=>setFalKey(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSaveFal()}/>
        {falStatus==='valid'&&<div className="key-status valid">✅ fal.ai key saved — video models ready</div>}
        {!apiKeys.fal&&<div className="key-status none">No key — add one to unlock video generation</div>}

        {/* Video model showcase */}
        <div style={{marginBottom:12}}>
          <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t3)',marginBottom:6,letterSpacing:1}}>AVAILABLE VIDEO MODELS</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
            {[
              ['Kling 1.6','fal-ai/kling-video','Best quality'],
              ['Wan T2V','fal-ai/wan-t2v','Fast, open'],
              ['HunyuanVideo','fal-ai/hunyuan-video','High quality'],
              ['MiniMax','fal-ai/minimax-video','Smooth motion'],
              ['Mochi v1','fal-ai/mochi-v1','Realistic'],
              ['LTX Video','fal-ai/ltx-video','Real-time speed'],
            ].map(([name,id,desc])=>(
              <div key={id} style={{padding:'4px 8px',borderRadius:6,background:'var(--bg-3)',border:'1px solid var(--border)',fontSize:9,fontFamily:'var(--mono)'}}>
                <div style={{color:'var(--pink)',fontWeight:600}}>{name}</div>
                <div style={{color:'var(--t3)',fontSize:8}}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={()=>store.setSettingsOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveFal}>Save Key</button>
        </div>
      </>}
    </div>
  </div>;
}

function ApiKeyPromptModal() {
  const store=useStore(); const [key,setKey]=useState(''); const [checking,setChecking]=useState(false); const [status,setStatus]=useState(null);
  const handleSave=async()=>{
    if(!key.trim())return;setChecking(true);
    const s=await validateOpenRouterKey(key.trim());setStatus(s);setChecking(false);
    if(s==='valid'){store.setApiKey('openrouter',key.trim());store.setApiKeyStatus('openrouter','valid');store.setApiKeyModalFor(null);}
  };
  return <div className="modal-overlay" onClick={()=>store.setApiKeyModalFor(null)}>
    <div className="modal" onClick={e=>e.stopPropagation()}>
      <h3 style={{color:'var(--amber)'}}>🔑 API Key Required</h3>
      <p style={{fontSize:12,color:'var(--t2)',marginBottom:12,lineHeight:1.6}}>Get a key at <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" style={{color:'var(--cyan)'}}>openrouter.ai/keys</a></p>
      <input className="modal-input" type="password" placeholder="sk-or-..." value={key} onChange={e=>setKey(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSave()} autoFocus/>
      {status==='invalid'&&<div className="key-status invalid">❌ Invalid key</div>}
      {status==='valid'&&<div className="key-status valid">✅ Valid!</div>}
      <div className="modal-actions">
        <button className="btn" onClick={()=>store.setApiKeyModalFor(null)}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={checking}>{checking?'Checking...':'Save & Validate'}</button>
      </div>
    </div>
  </div>;
}
