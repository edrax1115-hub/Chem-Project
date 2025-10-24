/* logic.js — Fixed: reliable dragging, tap-vs-drag, settings/achievements toggles
   Paste/replace this entire file in your repo
*/

(() => {
  // ===== DOM refs =====
  const refs = {
    board: document.getElementById('board'),
    toolbar: document.getElementById('toolbar'),
    elementGrid: document.getElementById('elementGrid'),
    search: document.getElementById('search'),
    category: document.getElementById('category'),
    openToolbarBtn: document.getElementById('openToolbar'),
    openAchievementsBtn: document.getElementById('openAchievements'),
    achievementsPanel: document.getElementById('achievements'),
    openSettingsBtn: document.getElementById('openSettings'),
    settingsPanel: document.getElementById('settings'),
    discoveredList: document.getElementById('discoveredList'),
    notif: document.getElementById('notif'),
    clearBoardBtn: document.getElementById('clearBoard'),
  };

  if (!refs.board || !refs.elementGrid) {
    console.error('Chemicraft: missing #board or #elementGrid in DOM');
    return;
  }

  // ===== state =====
  let spawned = [];
  let nodeId = 0;
  let audioCtx = null;

  // Global dragging state (more reliable than per-node pointermove)
  let currentDrag = null;
  // structure: { node, pointerId, ox, oy, startX, startY, moved }

  // ===== utilities =====
  const notify = (msg, ms = 1200) => {
    const el = refs.notif;
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    el.style.opacity = '1';
    clearTimeout(notify._t);
    notify._t = setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => (el.style.display = 'none'), 220);
    }, ms);
  };

  const findItem = (sym) => items.find(i => i.sym === sym);
  const findRecipe = (a, b) => {
    for (const r of recipes) {
      const ins = r.inputs.map(x => String(x));
      if (ins.includes(a) && ins.includes(b)) return r.output;
    }
    return null;
  };

  // ===== toolbar rendering =====
  function renderToolbar() {
    refs.elementGrid.innerHTML = '';
    const q = (refs.search && refs.search.value || '').toLowerCase();
    const cat = (refs.category && refs.category.value) || 'All';

    const list = items.slice().sort((a, b) => (a.unlocked === b.unlocked ? 0 : (a.unlocked ? -1 : 1)));
    list.forEach(it => {
      if (cat !== 'All' && it.category !== cat) return;
      if (q && !((it.sym + it.name).toLowerCase().includes(q))) return;
      const el = document.createElement('div');
      el.className = 'elem' + (it.unlocked ? '' : ' locked');
      el.innerHTML = `
        <div style="text-align:center;">
          <div style="font-size:22px;">${it.emoji || it.sym}</div>
          <div style="font-size:12px;margin-top:4px;color:var(--muted)">${it.name || it.sym}</div>
        </div>`;
      el.title = it.name || it.sym;
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (!it.unlocked) { notify('Locked — discover via reactions'); return; }
        // spawn on click
        spawnNode(it);
      });
      refs.elementGrid.appendChild(el);
    });
  }

  // ===== spawn node =====
  function spawnNode(item) {
    if (!item) return;
    const node = document.createElement('div');
    node.className = 'node';
    node.dataset.sym = item.sym;
    node.dataset.name = item.name || item.sym;
    node.dataset.id = ++nodeId;
    node.innerHTML = `
      <div class="node-emoji">${item.emoji || item.sym}</div>
      <div class="node-label">${item.name || item.sym}</div>
    `;

    // center spawn with small random offset
    const br = refs.board.getBoundingClientRect();
    const ox = (Math.random() - 0.5) * 40;
    const oy = (Math.random() - 0.5) * 40;
    node.style.left = `${Math.max(6, br.width / 2 - 36 + ox)}px`;
    node.style.top = `${Math.max(6, br.height / 2 - 36 + oy)}px`;

    // label visibility depends on saved setting
    const alwaysShow = localStorage.getItem('alwaysShowNames') === 'true';
    if (alwaysShow) node.classList.add('show-name');

    // attach pointerdown handler
    node.addEventListener('pointerdown', onNodePointerDown);
    // note: we don't attach pointermove/pointerup on node — we use global listeners

    // append & track
    refs.board.appendChild(node);
    spawned.push(node);
    clickSound();
    return node;
  }

  // ===== global pointer handlers for dragging (robust) =====
  function onNodePointerDown(ev) {
    // left button or touch only
    ev.preventDefault();
    const node = ev.currentTarget;
    // capture pointer if supported
    try { node.setPointerCapture(ev.pointerId); } catch (e) {}
    const rect = node.getBoundingClientRect();
    currentDrag = {
      node,
      pointerId: ev.pointerId,
      ox: ev.clientX - rect.left,
      oy: ev.clientY - rect.top,
      startX: ev.clientX,
      startY: ev.clientY,
      moved: false
    };
    node.style.zIndex = 9999;
  }

  window.addEventListener('pointermove', (ev) => {
    if (!currentDrag) return;
    if (ev.pointerId !== currentDrag.pointerId) return;
    const node = currentDrag.node;
    const br = refs.board.getBoundingClientRect();
    let x = ev.clientX - br.left - currentDrag.ox;
    let y = ev.clientY - br.top - currentDrag.oy;
    x = Math.max(0, Math.min(br.width - node.offsetWidth, x));
    y = Math.max(0, Math.min(br.height - node.offsetHeight, y));
    node.style.left = x + 'px';
    node.style.top = y + 'px';
    const dx = ev.clientX - currentDrag.startX;
    const dy = ev.clientY - currentDrag.startY;
    if (!currentDrag.moved && Math.sqrt(dx*dx + dy*dy) > 6) currentDrag.moved = true;
  }, { passive: false });

  window.addEventListener('pointerup', (ev) => {
    if (!currentDrag) return;
    if (ev.pointerId !== currentDrag.pointerId) return;
    const node = currentDrag.node;
    // release pointer capture if possible
    try { node.releasePointerCapture(ev.pointerId); } catch (e) {}
    node.style.zIndex = '';
    // if not moved (tap), toggle name; if moved, run combine check
    if (!currentDrag.moved) {
      node.classList.toggle('show-name');
    } else {
      // after a drag end, check for combine
      checkCombine(node);
    }
    // small delay before resetting to avoid flicker
    setTimeout(() => currentDrag = null, 20);
  });

  window.addEventListener('pointercancel', (ev) => {
    if (!currentDrag) return;
    if (ev.pointerId !== currentDrag.pointerId) return;
    try { currentDrag.node.releasePointerCapture(ev.pointerId); } catch (e) {}
    currentDrag.node.style.zIndex = '';
    currentDrag = null;
  });

  // ===== combine detection =====
  function checkCombine(node) {
    const r1 = node.getBoundingClientRect();
    for (const other of spawned.slice()) {
      if (other === node) continue;
      const r2 = other.getBoundingClientRect();
      const dx = (r1.left + r1.width/2) - (r2.left + r2.width/2);
      const dy = (r1.top + r1.height/2) - (r2.top + r2.height/2);
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 50) {
        const a = node.dataset.sym;
        const b = other.dataset.sym;
        const res = findRecipe(a, b) || findRecipe(b, a);
        if (res) {
          // spawn spark midpoint
          spawnSpark((r1.left + r2.left)/2 + (r1.width/2), (r1.top + r2.top)/2 + (r1.height/2));
          // remove nodes
          node.remove(); other.remove();
          spawned = spawned.filter(n => n !== node && n !== other);
          applyRecipe(res);
          return;
        } else {
          // no reaction visual feedback
          try { node.animate([{ transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 200 }); } catch (e) {}
          try { other.animate([{ transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 200 }); } catch (e) {}
          notify('No reaction', 700);
          return;
        }
      }
    }
  }

  // ===== apply recipe =====
  function applyRecipe(outputSym) {
    let prod = findItem(outputSym);
    if (!prod) {
      prod = { sym: outputSym, emoji: '✨', name: outputSym, category: 'Compounds', unlocked: true };
      items.push(prod);
    } else if (!prod.unlocked) {
      prod.unlocked = true; saveUnlocks(); notify('Unlocked: ' + prod.name, 1200);
    } else {
      notify('Created: ' + prod.name, 900);
    }
    // spawn product and update UI
    spawnNode(prod);
    renderToolbar();
    renderAchievements();
    fizzSound();
  }

  // ===== simple audio helpers =====
  function ensureAudioCtx() {
    if (audioCtx) return;
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { audioCtx = null; }
  }
  function clickSound() {
    ensureAudioCtx();
    if (!audioCtx) return;
    const s = audioCtx.createOscillator(); const g = audioCtx.createGain();
    s.type='triangle'; s.frequency.value = 900; g.gain.value = 0.0025;
    s.connect(g); g.connect(audioCtx.destination);
    s.start(); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.22);
    setTimeout(()=> s.stop(), 240);
  }
  function fizzSound() {
    ensureAudioCtx();
    if (!audioCtx) return;
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.12, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i=0;i<data.length;i++) data[i] = (Math.random()*2 - 1) * (1 - i/data.length);
    const src = audioCtx.createBufferSource(); src.buffer = buf;
    const g = audioCtx.createGain(); g.gain.value = 0.06;
    src.connect(g); g.connect(audioCtx.destination);
    src.start();
  }

  // ===== spark =====
  function spawnSpark(x, y) {
    const s = document.createElement('div'); s.className = 'spark';
    s.style.left = x + 'px'; s.style.top = y + 'px';
    document.body.appendChild(s);
    try {
      s.animate([{ transform: 'scale(0.4)', opacity: 1 }, { transform: 'scale(2.4)', opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
    } catch(e) {}
    setTimeout(()=> s.remove(), 450);
  }

  // ===== achievements UI =====
  function renderAchievements() {
    if (!refs.discoveredList) return;
    refs.discoveredList.innerHTML = '';
    const discovered = items.filter(i => i.unlocked && (i.category === 'Compounds'));
    if (!discovered.length) {
      refs.discoveredList.innerHTML = '<div style="color:#999">No compounds discovered yet.</div>'; return;
    }
    discovered.forEach(d => {
      const el = document.createElement('div'); el.className = 'chip'; el.textContent = `${d.emoji || d.sym} ${d.name || d.sym}`;
      refs.discoveredList.appendChild(el);
    });
  }

  // ===== toolbar & panels events =====
  refs.openToolbarBtn && refs.openToolbarBtn.addEventListener('click', (e) => {
    e.stopPropagation(); refs.toolbar.classList.toggle('open'); renderToolbar();
  });

  refs.openAchievementsBtn && refs.openAchievementsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const vis = refs.achievementsPanel ? refs.achievementsPanel.style.display : null;
    if (!refs.achievementsPanel) return;
    refs.achievementsPanel.style.display = (vis === 'block') ? 'none' : 'block';
    if (refs.achievementsPanel.style.display === 'block') renderAchievements();
  });

  refs.openSettingsBtn && refs.openSettingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!refs.settingsPanel) return;
    refs.settingsPanel.style.display = (refs.settingsPanel.style.display === 'block') ? 'none' : 'block';
  });

  // close panels when clicking outside
  document.addEventListener('click', (ev) => {
    // if user is dragging, don't close anything
    if (currentDrag) return;
    if (refs.toolbar && !refs.toolbar.contains(ev.target) && ev.target !== refs.openToolbarBtn) refs.toolbar.classList.remove('open');
    if (refs.achievementsPanel && !refs.achievementsPanel.contains(ev.target) && ev.target !== refs.openAchievementsBtn) refs.achievementsPanel.style.display = 'none';
    if (refs.settingsPanel && !refs.settingsPanel.contains(ev.target) && ev.target !== refs.openSettingsBtn) refs.settingsPanel.style.display = 'none';
  });

  // search & category handlers
  refs.search && refs.search.addEventListener('input', renderToolbar);
  refs.category && refs.category.addEventListener('change', renderToolbar);

  // clear board
  refs.clearBoardBtn && refs.clearBoardBtn.addEventListener('click', () => {
    spawned.forEach(n => n.remove()); spawned = []; notify('Board cleared');
  });

  // ===== init =====
  renderToolbar();
  renderAchievements();

  // expose for debugging
  window.chemicraft = { spawnNode, renderToolbar, renderAchievements, applyRecipe };
})();
