/* logic.js — Chemicraft v2 Core Engine
   Requires: data.js loaded first
*/

(() => {
  // ===== DOM References =====
  const $ = id => document.getElementById(id);
  const refs = {
    toolbar: $('toolbar'),
    openToolbar: $('openToolbar'),
    elementGrid: $('elementGrid'),
    search: $('search'),
    category: $('category'),
    board: $('board'),
    notif: $('notif'),
    achievements: $('achievements'),
    openAchievements: $('openAchievements'),
    discoveredList: $('discoveredList'),
    clearBoard: $('clearBoard'),
  };

  // ===== State =====
  let spawned = [];
  let nodeId = 0;
  let isDragging = false;

  // ===== Notify =====
  function notify(msg, ms = 1000) {
    const n = refs.notif;
    if (!n) return;
    n.textContent = msg;
    n.style.display = "block";
    clearTimeout(notify._t);
    notify._t = setTimeout(() => (n.style.display = "none"), ms);
  }

  // ===== Toolbar =====
  function renderToolbar() {
    refs.elementGrid.innerHTML = '';
    const q = (refs.search.value || '').toLowerCase();
    const cat = refs.category.value || 'All';

    items.forEach(it => {
      if (cat !== 'All' && it.category !== cat) return;
      if (q && !(it.sym.toLowerCase().includes(q) || it.name.toLowerCase().includes(q))) return;

      const el = document.createElement('div');
      el.className = 'elem' + (it.unlocked ? '' : ' locked');
      el.innerHTML = `
        <div style="text-align:center">
          ${it.emoji || it.sym}
          <div style="font-size:11px;margin-top:4px;color:var(--muted)">${it.sym}</div>
        </div>`;
      el.title = it.name;
      el.addEventListener('click', e => {
        e.stopPropagation();
        if (!it.unlocked) { notify('Locked — discover via reactions'); return; }
        spawnNode(it);
      });
      refs.elementGrid.appendChild(el);
    });
  }

  // ===== Spawn Node =====
  function spawnNode(item) {
    const node = document.createElement('div');
    node.className = 'node';
    node.textContent = item.emoji || item.sym;
    node.dataset.sym = item.sym;
    node.dataset.id = ++nodeId;

    const br = refs.board.getBoundingClientRect();
    node.style.left = `${br.width/2 - 36}px`;
    node.style.top = `${br.height/2 - 36}px`;
    refs.board.appendChild(node);
    enableDrag(node);
    spawned.push(node);
  }

  // ===== Dragging =====
  function enableDrag(node) {
    let active = false, pid = null, ox = 0, oy = 0;
    node.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      node.setPointerCapture(ev.pointerId);
      active = true; pid = ev.pointerId;
      const r = node.getBoundingClientRect();
      const br = refs.board.getBoundingClientRect();
      ox = ev.clientX - r.left;
      oy = ev.clientY - r.top;
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
      node.style.left = x + 'px';
      node.style.top = y + 'px';
    });

    node.addEventListener('pointerup', ev => {
      if (ev.pointerId !== pid) return;
      active = false; pid = null; node.style.zIndex = '';
      setTimeout(() => isDragging = false, 60);
      checkCombine(node);
    });
  }

  // ===== Combine Check =====
  function checkCombine(node) {
    const r1 = node.getBoundingClientRect();
    for (const other of spawned.slice()) {
      if (other === node) continue;
      const r2 = other.getBoundingClientRect();
      const overlap = !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
      if (overlap) {
        const a = node.dataset.sym, b = other.dataset.sym;
        const result = findRecipe(a, b) || findRecipe(b, a);
        if (result) {
          node.remove(); other.remove();
          spawned = spawned.filter(n => n !== node && n !== other);
          applyRecipe(result);
          return;
        } else {
          notify("No reaction", 600);
          return;
        }
      }
    }
  }

  // ===== Recipe & Unlock =====
  function findRecipe(a, b) {
    for (const r of recipes) {
      if (r.inputs.includes(a) && r.inputs.includes(b)) return r.output;
    }
    return null;
  }

  function applyRecipe(sym) {
    let prod = items.find(i => i.sym === sym);
    if (!prod) {
      prod = { sym, name: sym, emoji: '✨', category: 'Compounds', unlocked: true };
      items.push(prod);
    } else if (!prod.unlocked) {
      prod.unlocked = true;
      saveUnlocks();
      notify('Unlocked: ' + prod.sym, 1200);
    } else notify('Created: ' + prod.sym, 800);
    spawnNode(prod);
    renderToolbar();
    renderAchievements();
  }

  // ===== Achievements =====
  function renderAchievements() {
    refs.discoveredList.innerHTML = '';
    const discovered = items.filter(i => i.unlocked && i.category === 'Compounds');
    if (!discovered.length) {
      refs.discoveredList.innerHTML = '<div style="color:var(--muted)">No compounds discovered yet.</div>';
      return;
    }
    discovered.forEach(d => {
      const c = document.createElement('div');
      c.className = 'chip';
      c.textContent = `${d.emoji || d.sym} ${d.sym}`;
      refs.discoveredList.appendChild(c);
    });
  }

  // ===== Events =====
  refs.openToolbar.addEventListener('click', e => {
    e.stopPropagation();
    refs.toolbar.classList.toggle('open');
    renderToolbar();
  });

  refs.clearBoard.addEventListener('click', () => {
    spawned.forEach(n => n.remove());
    spawned = [];
    notify('Board cleared', 700);
  });

  refs.openAchievements.addEventListener('click', () => {
    refs.achievements.style.display = refs.achievements.style.display === 'block' ? 'none' : 'block';
    renderAchievements();
  });

  document.addEventListener('click', e => {
    if (isDragging) return;
    if (!refs.toolbar.contains(e.target) && e.target !== refs.openToolbar)
      refs.toolbar.classList.remove('open');
  });

  refs.search.addEventListener('input', renderToolbar);
  refs.category.addEventListener('change', renderToolbar);

  // ===== Init =====
  renderToolbar();
  renderAchievements();
  window.chemicraft = { spawnNode, renderToolbar };
})();
