/* logic.js — Chemicraft v1.2
   - Shows element names under emojis
   - Mobile-optimized drag/tap
   - Clean unlock & notification system
*/

(() => {
  // ==== DOM Refs ====
  const refs = {
    openToolbarBtn: document.getElementById('openToolbar'),
    toolbar: document.getElementById('toolbar'),
    elementGrid: document.getElementById('elementGrid'),
    search: document.getElementById('search'),
    category: document.getElementById('category'),
    board: document.getElementById('board'),
    notif: document.getElementById('notif'),
    toggleSoundBtn: document.getElementById('toggleSound'),
    openAchievementsBtn: document.getElementById('openAchievements'),
    achievementsPanel: document.getElementById('achievements'),
    discoveredList: document.getElementById('discoveredList'),
    suggestionsDiv: document.getElementById('suggestions'),
    clearBoardBtn: document.getElementById('clearBoard'),
  };

  // ==== State ====
  let spawned = [];
  let nodeId = 0;
  let isDragging = false;

  // ==== Helpers ====
  const notify = (msg, ms = 1000) => {
    if (!refs.notif) return;
    refs.notif.textContent = msg;
    refs.notif.style.opacity = 1;
    refs.notif.style.display = 'block';
    clearTimeout(notify._t);
    notify._t = setTimeout(() => {
      refs.notif.style.opacity = 0;
      setTimeout(() => (refs.notif.style.display = 'none'), 250);
    }, ms);
  };

  const findItem = (sym) => items.find((i) => i.sym === sym);
  const findRecipe = (a, b) => {
    for (const r of recipes) {
      const ins = r.inputs.map((x) => String(x));
      if (ins.includes(a) && ins.includes(b)) return r.output;
    }
    return null;
  };

  // ==== Toolbar Render ====
  function renderToolbar() {
    refs.elementGrid.innerHTML = '';
    const q = (refs.search.value || '').toLowerCase();
    const cat = refs.category.value || 'All';
    const sorted = items
      .slice()
      .sort((a, b) => (a.unlocked === b.unlocked ? 0 : a.unlocked ? -1 : 1));

    sorted.forEach((it) => {
      if (cat !== 'All' && it.category !== cat) return;
      if (
        q &&
        !(
          it.sym.toLowerCase().includes(q) ||
          it.name.toLowerCase().includes(q)
        )
      )
        return;

      const el = document.createElement('div');
      el.className = 'elem' + (it.unlocked ? '' : ' locked');
      el.innerHTML = `
        <div style="text-align:center;display:flex;flex-direction:column;align-items:center;">
          <div style="font-size:22px;">${it.emoji || it.sym}</div>
          <div style="font-size:12px;margin-top:2px;color:var(--muted)">${
            it.name || it.sym
          }</div>
        </div>`;
      el.title = it.name;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!it.unlocked) {
          notify('Locked — discover via reactions');
          return;
        }
        spawnNode(it);
      });

      refs.elementGrid.appendChild(el);
    });
  }

  // ==== Spawn Node ====
  function spawnNode(item) {
    if (!item) return;
    const node = document.createElement('div');
    node.className =
      'node' + (item.category === 'Compounds' ? ' compound' : '');
    node.dataset.sym = item.sym;
    node.textContent = item.emoji || item.sym;
    node.dataset.id = ++nodeId;

    const br = refs.board.getBoundingClientRect();
    node.style.left = br.width / 2 - 36 + 'px';
    node.style.top = br.height / 2 - 36 + 'px';
    node.style.opacity = 0;
    refs.board.appendChild(node);

    // Spawn animation
    node.animate(
      [
        { transform: 'scale(0.4)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      { duration: 180, easing: 'ease-out', fill: 'forwards' }
    );

    enableDrag(node);
    spawned.push(node);
  }

  // ==== Drag ====
  function enableDrag(node) {
    let active = false,
      pid = null,
      ox = 0,
      oy = 0;
    node.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      node.setPointerCapture(ev.pointerId);
      active = true;
      pid = ev.pointerId;
      const r = node.getBoundingClientRect();
      const br = refs.board.getBoundingClientRect();
      ox = ev.clientX - r.left;
      oy = ev.clientY - r.top;
      node.style.zIndex = 9999;
    });
    node.addEventListener('pointermove', (ev) => {
      if (!active || ev.pointerId !== pid) return;
      isDragging = true;
      const br = refs.board.getBoundingClientRect();
      let x = ev.clientX - br.left - ox;
      let y = ev.clientY - br.top - oy;
      x = Math.max(0, Math.min(br.width - node.offsetWidth, x));
      y = Math.max(0, Math.min(br.height - node.offsetHeight, y));
      node.style.left = x + 'px';
      node.style.top = y + 'px';
    });
    node.addEventListener('pointerup', (ev) => {
      if (ev.pointerId !== pid) return;
      active = false;
      pid = null;
      node.style.zIndex = '';
      setTimeout(() => (isDragging = false), 80);
      checkCombine(node);
    });
  }

  // ==== Combine ====
  function checkCombine(node) {
    const r1 = node.getBoundingClientRect();
    for (const other of spawned.slice()) {
      if (other === node) continue;
      const r2 = other.getBoundingClientRect();
      const dx = (r1.left + r1.width / 2) - (r2.left + r2.width / 2);
      const dy = (r1.top + r1.height / 2) - (r2.top + r2.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 50) {
        const result = findRecipe(node.dataset.sym, other.dataset.sym)
          || findRecipe(other.dataset.sym, node.dataset.sym);
        if (result) {
          spawnSpark((r1.left + r2.left) / 2 + 36, (r1.top + r2.top) / 2 + 36);
          node.remove();
          other.remove();
          spawned = spawned.filter((n) => n !== node && n !== other);
          applyRecipe(result);
          return;
        } else {
          notify('No reaction', 700);
          return;
        }
      }
    }
  }

  // ==== Recipe Result ====
  function applyRecipe(sym) {
    let prod = findItem(sym);
    if (!prod) {
      prod = { sym, emoji: '✨', name: sym, category: 'Compounds', unlocked: true };
      items.push(prod);
    } else if (!prod.unlocked) {
      prod.unlocked = true;
      saveUnlocks();
      notify('Unlocked: ' + prod.name);
    } else {
      notify('Created: ' + prod.name);
    }
    spawnNode(prod);
    renderToolbar();
  }

  // ==== Spark ====
  function spawnSpark(x, y) {
    const s = document.createElement('div');
    s.className = 'spark';
    s.style.left = x + 'px';
    s.style.top = y + 'px';
    document.body.appendChild(s);
    s.animate(
      [
        { transform: 'scale(0.5)', opacity: 1 },
        { transform: 'scale(2.2)', opacity: 0 },
      ],
      { duration: 400, easing: 'ease-out' }
    );
    setTimeout(() => s.remove(), 420);
  }

  // ==== Achievements ====
  function renderAchievements() {
    refs.discoveredList.innerHTML = '';
    const discovered = items.filter((i) => i.unlocked && i.category === 'Compounds');
    if (!discovered.length) {
      refs.discoveredList.innerHTML = `<div style="color:var(--muted)">No compounds yet.</div>`;
      return;
    }
    discovered.forEach((d) => {
      const c = document.createElement('div');
      c.className = 'chip';
      c.textContent = `${d.emoji || d.sym} ${d.sym}`;
      refs.discoveredList.appendChild(c);
    });
  }

  // ==== Events ====
  refs.openToolbarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    refs.toolbar.classList.toggle('open');
    renderToolbar();
  });
  refs.clearBoardBtn.addEventListener('click', () => {
    spawned.forEach((n) => n.remove());
    spawned = [];
    notify('Board cleared', 700);
  });
  refs.openAchievementsBtn.addEventListener('click', () => {
    refs.achievementsPanel.style.display =
      refs.achievementsPanel.style.display === 'block' ? 'none' : 'block';
    renderAchievements();
  });
  document.addEventListener('click', (e) => {
    if (isDragging) return;
    if (!refs.toolbar.contains(e.target) && e.target !== refs.openToolbarBtn)
      refs.toolbar.classList.remove('open');
  });
  refs.search.addEventListener('input', renderToolbar);
  refs.category.addEventListener('change', renderToolbar);

  // ==== Init ====
  renderToolbar();
  renderAchievements();

  window.chemicraft = { spawnNode, renderToolbar, renderAchievements, applyRecipe };
})();
