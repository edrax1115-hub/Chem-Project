/* logic.js — Chemicraft v2 (toolbar pointer fix + combined settings + ambient) */

(() => {
  // DOM refs
  const $ = id => document.getElementById(id);
  const refs = {
    board: $('board'),
    toolbar: $('toolbar'),
    openToolbar: $('openToolbar'),
    elementGrid: $('elementGrid'),
    search: $('search'),
    category: $('category'),
    hint: $('hint'),
    notif: $('notif'),
    openSettings: $('openSettings'),
    settingsPanel: $('settingsPanel'),
    ambientToggle: $('ambientToggle'),
    settingsAchievements: $('settingsAchievements'),
    closeSettings: $('closeSettings'),
    clearBoard: $('clearBoard')
  };

  // state
  let spawned = [];
  let nodeId = 0;
  let isDragging = false;

  // audio state
  let audioCtx = null;
  let ambientGain = null;
  let ambientOn = true;

  // -------- audio (soft lab pad) --------
  function initAudio() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      // two detuned oscillators with lowpass + gentle LFO for amplitude
      const o1 = audioCtx.createOscillator();
      const o2 = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      const lp = audioCtx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 900;

      o1.type = 'sine'; o2.type = 'sine';
      o1.frequency.value = 110; o2.frequency.value = 113;

      // slow LFO
      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfo.frequency.value = 0.12; lfoGain.gain.value = 0.12;
      lfo.connect(lfoGain);
      lfoGain.connect(g.gain);

      g.gain.value = 0.0; // start silent; we'll fade in
      o1.connect(g); o2.connect(g); g.connect(lp); lp.connect(audioCtx.destination);
      o1.start(); o2.start(); lfo.start();

      ambientGain = g;
      // gently fade in if ambientOn
      if (ambientOn) {
        // small fade
        g.gain.linearRampToValueAtTime(0.02, audioCtx.currentTime + 0.3);
      } else {
        g.gain.value = 0.0;
      }
    } catch (e) {
      console.warn('Audio init failed', e);
    }
  }

  function toggleAmbient() {
    if (!audioCtx) initAudio();
    if (!ambientGain) return;
    ambientOn = !ambientOn;
    if (ambientOn) {
      ambientGain.gain.linearRampToValueAtTime(0.02, audioCtx.currentTime + 0.12);
      refs.ambientToggle.textContent = 'Ambient: On';
    } else {
      ambientGain.gain.linearRampToValueAtTime(0.0, audioCtx.currentTime + 0.12);
      refs.ambientToggle.textContent = 'Ambient: Off';
    }
  }

  // small click sound
  function clickSound() {
    if (!audioCtx) return;
    try {
      const s = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      s.type = 'triangle'; s.frequency.value = 880;
      g.gain.value = 0.003;
      s.connect(g); g.connect(audioCtx.destination);
      s.start();
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.2);
      setTimeout(() => s.stop(), 300);
    } catch (e) {}
  }

  // -------- utilities --------
  function notify(msg, ms = 1000) {
    const n = refs.notif; if (!n) return;
    n.textContent = msg; n.style.display = 'block';
    clearTimeout(notify._t); notify._t = setTimeout(() => n.style.display = 'none', ms);
  }

  function findItem(sym) { return items.find(i => i.sym === sym); }

  // -------- toolbar rendering --------
  function renderToolbar() {
    refs.elementGrid.innerHTML = '';
    const q = (refs.search.value || '').toLowerCase();
    const cat = (refs.category.value || 'All');

    items.slice().sort((a, b) => (a.unlocked === b.unlocked ? 0 : a.unlocked ? -1 : 1))
      .forEach(it => {
        if (cat !== 'All' && it.category !== cat) return;
        if (q && !(it.sym.toLowerCase().includes(q) || (it.name || '').toLowerCase().includes(q))) return;
        const el = document.createElement('div');
        el.className = 'elem' + (it.unlocked ? '' : ' locked');
        el.innerHTML = `<div style="text-align:center">${it.emoji || it.sym}<div style="font-size:11px;margin-top:6px;color:var(--muted)">${it.sym}</div></div>`;
        el.title = it.name || it.sym;
        el.addEventListener('click', e => {
          e.stopPropagation();
          if (!it.unlocked) { notify('Locked — discover via reactions'); return; }
          // ensure audio starts on first user gesture (autoplay policy)
          if (!audioCtx) initAudio();
          clickSound();
          spawnNode(it);
        });
        refs.elementGrid.appendChild(el);
      });
  }

  // -------- spawn & drag --------
  function spawnNode(item) {
    const node = document.createElement('div');
    node.className = 'node' + (item.category === 'Compounds' ? ' compound' : '');
    node.textContent = item.emoji || item.sym;
    node.dataset.sym = item.sym;
    node.dataset.id = ++nodeId;

    // center spawn with slight random offset
    const br = refs.board.getBoundingClientRect();
    const offsetX = (Math.random() - 0.5) * 40;
    const offsetY = (Math.random() - 0.5) * 40;
    node.style.left = (br.width / 2 - 36 + offsetX) + 'px';
    node.style.top = (br.height / 2 - 36 + offsetY) + 'px';

    refs.board.appendChild(node);
    enableDrag(node);
    spawned.push(node);
    return node;
  }

  function enableDrag(node) {
    let active = false, pid = null, ox = 0, oy = 0;
    node.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      node.setPointerCapture(ev.pointerId);
      active = true; pid = ev.pointerId;
      const r = node.getBoundingClientRect();
      const br = refs.board.getBoundingClientRect();
      ox = ev.clientX - r.left; oy = ev.clientY - r.top;
      node.style.zIndex = 9999;
    });
    node.addEventListener('pointermove', ev => {
      if (!active || ev.pointerId !== pid) return;
      isDragging = true;
      const br = refs.board.getBoundingClientRect();
      let x = ev.clientX - br.left - ox;
      let y = ev.clientY - br.top - oy;
      x = Math.max(0, Math.min(br.width - node.offsetWidth, x));
      y = Math.max(0, Math.min(br.height - node.offsetHeight, y));
      node.style.left = x + 'px'; node.style.top = y + 'px';
    });
    node.addEventListener('pointerup', ev => {
      if (ev.pointerId !== pid) return;
      active = false; pid = null; node.style.zIndex = '';
      setTimeout(() => isDragging = false, 60);
      checkCombine(node);
    });
    node.addEventListener('pointercancel', () => {
      active = false; pid = null; node.style.zIndex = ''; isDragging = false;
    });
  }

  // -------- combine detection & effects --------
  function findRecipe(a, b) {
    for (const r of recipes) {
      if (r.inputs.includes(a) && r.inputs.includes(b)) return r.output;
    }
    return null;
  }

  function spawnSpark(x, y) {
    const s = document.createElement('div');
    s.className = 'spark';
    s.style.left = x + 'px'; s.style.top = y + 'px';
    document.body.appendChild(s);
    s.animate([{ transform: 'translate(-50%,-50%) scale(0.6)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(2.4)', opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
    setTimeout(() => s.remove(), 440);
  }

  function checkCombine(node) {
    const r1 = node.getBoundingClientRect();
    for (const other of spawned.slice()) {
      if (other === node) continue;
      const r2 = other.getBoundingClientRect();
      const overlap = !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
      if (overlap) {
        const a = node.dataset.sym, b = other.dataset.sym;
        const res = findRecipe(a, b) || findRecipe(b, a);
        if (res) {
          // midpoint
          const mx = (r1.left + r2.left) / 2 + (r1.width / 2);
          const my = (r1.top + r2.top) / 2 + (r1.height / 2);
          spawnSpark(mx, my);
          node.remove(); other.remove();
          spawned = spawned.filter(n => n !== node && n !== other);
          applyRecipe(res);
          return;
        } else {
          notify('No reaction', 700);
          try { node.animate([{ transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 180 }); } catch (e) {}
          return;
        }
      }
    }
  }

  function applyRecipe(outputSym) {
    let prod = items.find(i => i.sym === outputSym);
    if (!prod) {
      prod = { sym: outputSym, emoji: '✨', name: outputSym, category: 'Compounds', unlocked: true };
      items.push(prod);
    } else if (!prod.unlocked) {
      prod.unlocked = true; saveUnlocks(); notify('Unlocked: ' + prod.sym, 1200);
    } else notify('Created: ' + prod.sym, 900);
    // spawn product
    if (!audioCtx) initAudio();
    clickSound();
    renderToolbar();
    renderSettingsAchievements();
    spawnNode(prod);
  }

  // -------- achievements/settings UI --------
  function renderSettingsAchievements() {
    if (!refs.settingsAchievements) return;
    refs.settingsAchievements.innerHTML = '';
    const discovered = items.filter(i => i.unlocked && i.category === 'Compounds');
    if (!discovered.length) {
      refs.settingsAchievements.innerHTML = '<div style="color:var(--muted)">No compounds discovered yet.</div>';
      return;
    }
    discovered.forEach(d => {
      const c = document.createElement('div'); c.className = 'chip'; c.textContent = `${d.emoji || d.sym} ${d.sym}`;
      refs.settingsAchievements.appendChild(c);
    });
  }

  // -------- UI events & helpers --------
  refs.openToolbar.addEventListener('click', e => {
    e.stopPropagation();
    refs.toolbar.classList.toggle('open');
    renderToolbar();
  });

  refs.openSettings.addEventListener('click', e => {
    e.stopPropagation();
    const show = refs.settingsPanel.style.display !== 'block';
    refs.settingsPanel.style.display = show ? 'block' : 'none';
    renderSettingsAchievements();
  });

  refs.closeSettings.addEventListener('click', () => refs.settingsPanel.style.display = 'none');

  refs.ambientToggle.addEventListener('click', () => toggleAmbient());

  refs.clearBoard.addEventListener('click', () => {
    spawned.forEach(n => n.remove());
    spawned = [];
    notify('Board cleared', 700);
  });

  // close toolbar when clicking outside (but not during drag)
  document.addEventListener('click', e => {
    if (isDragging) return;
    if (!refs.toolbar.contains(e.target) && e.target !== refs.openToolbar) {
      refs.toolbar.classList.remove('open');
    }
    if (!refs.settingsPanel.contains(e.target) && e.target !== refs.openSettings) {
      // don't auto-close settings while interacting with it; only close when clicking outside
      if (refs.settingsPanel.style.display === 'block' && e.target !== refs.openSettings) refs.settingsPanel.style.display = 'none';
    }
  });

  // hint show/hide logic (fade out after 5s, reappear after 30s of inactivity)
  function showHint() {
    if (!refs.hint) return;
    refs.hint.style.opacity = '1';
    clearTimeout(showHint._t);
    showHint._t = setTimeout(() => { refs.hint.style.opacity = '0'; }, 5000);
  }
  // re-show hint after 30s inactivity
  let lastActivity = Date.now();
  function activityDetected() { lastActivity = Date.now(); }
  setInterval(() => { if (Date.now() - lastActivity > 30000) showHint(); }, 4000);
  ['pointerdown','pointermove','keydown','touchstart'].forEach(ev => document.addEventListener(ev, activityDetected));

  // auto-start audio on first user gesture (to satisfy autoplay)
  document.addEventListener('pointerdown', function onceStartAudio() {
    document.removeEventListener('pointerdown', onceStartAudio);
    initAudio();
  });

  // initial render
  renderToolbar();
  renderSettingsAchievements();
  showHint();

  // expose some debugging utilities
  window.chemicraft = { spawnNode, renderToolbar, renderSettingsAchievements, toggleAmbient };

})();
