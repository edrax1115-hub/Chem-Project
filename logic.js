/* logic.js — Chemicraft (AI-integrated combine)
   Replaces previous logic.js — uses chemicraft.getReaction(a,b) when available
   - Handles async AI results
   - Unlocks + spawns products
   - Supports multiple outputs split by '+'
*/

(() => {
  // ======= DOM refs =======
  const board = document.getElementById("board");
  const notif = document.getElementById("notif");
  const toolbar = document.getElementById("toolbar");
  const elementGrid = document.getElementById("elementGrid");
  const search = document.getElementById("search");
  const category = document.getElementById("category");

  const openToolbarBtn = document.getElementById("openToolbar");
  const clearBoardBtn = document.getElementById("clearBoard");
  const openAchievementsBtn = document.getElementById("openAchievements");
  const openSettingsBtn = document.getElementById("openSettings");

  const achievementsPanel = document.getElementById("achievements");
  const discoveredList = document.getElementById("discoveredList");
  const settingsPanel = document.getElementById("settingsPanel");

  const toggleSound = document.getElementById("toggleSound");
  const toggleLabels = document.getElementById("toggleLabels");

  // ======= State =======
  let spawned = [];
  let nodeId = 0;
  let audioCtx = null;
  let ambientSource = null;
  let isDragging = false;
  let showLabels = (localStorage.getItem("chemicraft_showLabels") !== "false");

  // small helpers
  function notify(msg, ms = 1000) {
    if (!notif) return;
    notif.textContent = msg;
    notif.style.display = "block";
    clearTimeout(notify._t);
    notify._t = setTimeout(() => (notif.style.display = "none"), ms);
  }

  function ensureAudio() {
    if (audioCtx) return;
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ audioCtx = null; }
  }
  function playClick() {
    ensureAudio();
    if (!audioCtx) return;
    const s = audioCtx.createOscillator(), g = audioCtx.createGain();
    s.type = 'triangle'; s.frequency.value = 900; g.gain.value = 0.0025;
    s.connect(g); g.connect(audioCtx.destination);
    s.start(); g.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.22);
    setTimeout(()=> s.stop(), 240);
  }
  function playFizz() {
    ensureAudio(); if (!audioCtx) return;
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.12, audioCtx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i=0;i<ch.length;i++) ch[i] = (Math.random()*2 - 1) * (1 - i/ch.length);
    const src = audioCtx.createBufferSource(); src.buffer = buf;
    const g = audioCtx.createGain(); g.gain.value = 0.06;
    src.connect(g); g.connect(audioCtx.destination); src.start();
  }

  // ======= Render toolbar =======
  function renderToolbar() {
    if (!elementGrid) return;
    elementGrid.innerHTML = "";
    const q = (search && search.value || "").toLowerCase();
    const cat = (category && category.value) || "All";

    const sorted = (window.items || []).slice().sort((a,b) => (a.unlocked === b.unlocked ? 0 : a.unlocked ? -1 : 1));
    sorted.forEach(it => {
      if (cat !== "All" && it.category !== cat) return;
      if (q && !(it.sym.toLowerCase().includes(q) || (it.name||"").toLowerCase().includes(q))) return;
      const el = document.createElement("div");
      el.className = "elem" + (it.unlocked ? "" : " locked");
      el.innerHTML = `<div style="text-align:center">${it.emoji || it.sym}<div style="font-size:11px;margin-top:4px;color:var(--muted)">${it.sym}</div></div>`;
      el.title = it.name || it.sym;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!it.unlocked) { notify("Locked — discover via reactions"); return; }
        spawnNode(it);
      });
      elementGrid.appendChild(el);
    });
  }

  // ======= Achievements =======
  function renderAchievements() {
    if (!discoveredList) return;
    discoveredList.innerHTML = "";
    const discovered = (window.items || []).filter(i => i.unlocked && i.category === "Compounds");
    if (!discovered.length) { discoveredList.innerHTML = `<div style="color:var(--muted)">No compounds discovered yet.</div>`; return; }
    discovered.forEach(d => {
      const c = document.createElement("div");
      c.className = "chip";
      c.textContent = `${d.emoji || d.sym} ${d.sym}`;
      discoveredList.appendChild(c);
    });
  }

  // ======= Spawn node =======
  function spawnNode(item) {
    if (!board) return;
    const node = document.createElement("div");
    node.className = "node" + (item.category === "Compounds" ? " compound" : "");
    node.dataset.sym = item.sym;
    node.dataset.id = ++nodeId;
    node.innerHTML = `
      <div class="node-emoji">${item.emoji || item.sym}</div>
      <div class="node-label" style="display:${showLabels ? 'block' : 'none'}">${item.name || item.sym}</div>
    `;
    const br = board.getBoundingClientRect();
    // spawn at center area (slight jitter)
    const jitter = Math.floor(Math.random()*40)-20;
    node.style.left = (br.width/2 - 36 + jitter) + "px";
    node.style.top  = (br.height/2 - 36 + jitter) + "px";

    // attach drag handlers and append
    enableDrag(node);
    board.appendChild(node);
    spawned.push(node);
    playClick();
    return node;
  }

  // ======= Dragging (robust) =======
  // We'll use global pointermove/pointerup state to be reliable on mobile.
  let dragState = null; // { node, pid, ox, oy, startX, startY, moved }

  function enableDrag(node) {
    node.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      try { node.setPointerCapture(ev.pointerId); } catch(e) {}
      const rect = node.getBoundingClientRect();
      const br = board.getBoundingClientRect();
      dragState = {
        node,
        pid: ev.pointerId,
        ox: ev.clientX - rect.left,
        oy: ev.clientY - rect.top,
        startX: ev.clientX,
        startY: ev.clientY,
        moved: false
      };
      node.style.zIndex = 9999;
    });
  }

  window.addEventListener('pointermove', ev => {
    if (!dragState || ev.pointerId !== dragState.pid) return;
    const node = dragState.node;
    const br = board.getBoundingClientRect();
    let x = ev.clientX - br.left - dragState.ox;
    let y = ev.clientY - br.top - dragState.oy;
    x = Math.max(0, Math.min(br.width - node.offsetWidth, x));
    y = Math.max(0, Math.min(br.height - node.offsetHeight, y));
    node.style.left = x + 'px';
    node.style.top = y + 'px';
    const dx = ev.clientX - dragState.startX, dy = ev.clientY - dragState.startY;
    if (!dragState.moved && Math.sqrt(dx*dx+dy*dy) > 6) dragState.moved = true;
    isDragging = true;
  }, { passive:false });

  window.addEventListener('pointerup', ev => {
    if (!dragState || ev.pointerId !== dragState.pid) return;
    const node = dragState.node;
    try { node.releasePointerCapture(ev.pointerId); } catch(e){}
    node.style.zIndex = '';
    if (!dragState.moved) {
      // treat as tap: toggle label visibility
      const lbl = node.querySelector('.node-label');
      if (lbl) lbl.style.display = (lbl.style.display === 'none') ? 'block' : 'none';
    } else {
      // drag ended: check combine (async-safe)
      checkCombineAsync(node).catch(err => console.error('combine error', err));
    }
    setTimeout(()=> { dragState = null; isDragging = false; }, 40);
  });

  // ======= AI-assisted combine (ASYNC) =======
  // This function asks chemicraft.getReaction(a,b) if present; else falls back to local recipes array.
  async function checkCombineAsync(node) {
    if (!node) return;
    const r1 = node.getBoundingClientRect();
    for (const other of spawned.slice()) {
      if (other === node) continue;
      const r2 = other.getBoundingClientRect();
      const overlap = !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
      if (!overlap) continue;

      const a = node.dataset.sym;
      const b = other.dataset.sym;

      // visual/UX: small loading state
      notify('Analysing reaction...', 900);
      // Make sure audio context exists on user gesture
      ensureAudio();
      // remove nodes visually
      node.remove(); other.remove();
      spawned = spawned.filter(n => n !== node && n !== other);

      // Obtain reaction result using hybrid AI if available
      let aiResult = null;
      try {
        if (window.chemicraft && typeof window.chemicraft.getReaction === 'function') {
          // call AI (could be offline simple generator or online)
          aiResult = await window.chemicraft.getReaction(a, b);
        } else {
          // fallback: try local recipes array (non-AI)
          const local = findLocalRecipe(a, b) || findLocalRecipe(b, a);
          if (local) aiResult = { inputs: [a,b], output: local, name: local };
          else aiResult = { inputs:[a,b], output: `${a}${b}`, name: `${a}${b}` };
        }
      } catch (err) {
        console.warn('AI combine failed, falling back', err);
        // fallback if AI fails
        const local = findLocalRecipe(a, b) || findLocalRecipe(b, a);
        aiResult = local ? { inputs:[a,b], output: local, name: local } : { inputs:[a,b], output: `${a}${b}`, name: `${a}${b}` };
      }

      // Normalize outputs: AI may return "A+B" or "A + B" or a single string
      const outputs = parseOutputs(aiResult.output || aiResult.name || aiResult);

      // For each output, ensure it's in items[] and unlocked (or create it)
      for (const outSym of outputs) {
        let prod = (window.items || []).find(it => it.sym === outSym);
        if (!prod) {
          // create new compound entry
          prod = { sym: outSym, emoji: '✨', name: aiResult.name || outSym, category:'Compounds', unlocked:true };
          window.items.push(prod);
        } else {
          // unlock if locked
          if (!prod.unlocked) {
            prod.unlocked = true;
          }
        }
        // persist unlocks if function exists
        if (typeof saveUnlocks === 'function') saveUnlocks();
        // spawn product node(s)
        spawnNode(prod);
      }

      // feedback
      playFizz();
      notify('Reaction complete!', 900);
      renderToolbar();
      renderAchievements();
      return;
    }
  }

  // Parse result string into array of product symbols
  function parseOutputs(outputStr) {
    if (!outputStr) return [];
    // split by '+' and comma, trim
    const parts = String(outputStr).split(/[\+,\/;]/).map(s=>s.trim()).filter(Boolean);
    // if part contains spaces and looks like a name (like "Sodium Hydroxide"), try to find symbol in items by name
    const resolved = parts.map(p => {
      // try exact symbol match first
      const bySym = (window.items || []).find(it => it.sym.toLowerCase() === p.toLowerCase());
      if (bySym) return bySym.sym;
      // try find by name
      const byName = (window.items || []).find(it => (it.name||'').toLowerCase() === p.toLowerCase());
      if (byName) return byName.sym;
      // last fallback: remove non-alphanum and use that as symbol
      return p.replace(/[^A-Za-z0-9]/g,'') || p;
    });
    return resolved;
  }

  // local recipes fallback (simple lookup in window.recipes if present)
  function findLocalRecipe(a,b) {
    if (!window.recipes) return null;
    for (const r of window.recipes) {
      // support r.inputs being array of length >=2; check set inclusion
      const ins = r.inputs.map(x=>String(x));
      if (ins.includes(a) && ins.includes(b)) return r.output;
    }
    return null;
  }

  // ======= Events & UI hooks =======
  openToolbarBtn?.addEventListener('click', () => { toolbar.classList.toggle('open'); renderToolbar(); });
  openAchievementsBtn?.addEventListener('click', () => {
    achievementsPanel.style.display = achievementsPanel.style.display === 'block' ? 'none' : 'block';
    renderAchievements();
  });
  openSettingsBtn?.addEventListener('click', () => {
    settingsPanel.style.display = settingsPanel.style.display === 'block' ? 'none' : 'block';
  });

  clearBoardBtn?.addEventListener('click', () => {
    spawned.forEach(n => n.remove());
    spawned = [];
    notify('Board cleared', 700);
  });

  // sound/labels toggles
  toggleSound?.addEventListener('change', (e) => {
    if (e.target.checked) ensureAudio();
    else { if (audioCtx) { /* don't forcibly close; user can toggle ambient separately */ } }
  });

  toggleLabels?.addEventListener('change', (e) => {
    showLabels = !!e.target.checked;
    localStorage.setItem('chemicraft_showLabels', showLabels ? 'true':'false');
    document.querySelectorAll('.node .node-label').forEach(lbl => { lbl.style.display = showLabels ? 'block' : 'none'; });
  });

  document.addEventListener('click', (e) => {
    if (isDragging) return;
    if (toolbar && !toolbar.contains(e.target) && e.target !== openToolbarBtn) toolbar.classList.remove('open');
    if (settingsPanel && !settingsPanel.contains(e.target) && e.target !== openSettingsBtn) settingsPanel.style.display = 'none';
    if (achievementsPanel && !achievementsPanel.contains(e.target) && e.target !== openAchievementsBtn) achievementsPanel.style.display = 'none';
  });

  (search)?.addEventListener('input', renderToolbar);
  (category)?.addEventListener('change', renderToolbar);

  // ======= init =======
  // ensure label toggle matches saved state
  if (toggleLabels) { toggleLabels.checked = showLabels; }
  renderToolbar();
  renderAchievements();

  // expose helper
  window.chemicraft = window.chemicraft || {};
  window.chemicraft.spawnNode = spawnNode;
  window.chemicraft.renderToolbar = renderToolbar;
  window.chemicraft.renderAchievements = renderAchievements;

})(); // end logic.js
