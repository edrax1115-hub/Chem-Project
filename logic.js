/* logic.js — Chemicraft Interactive Logic
   Phase 3: Spawn label toggle + scrollable toolbar + cleaner mobile UX
*/

(() => {
  // ===== DOM Refs =====
  const refs = {
    board: document.getElementById('board'),
    toolbar: document.getElementById('toolbar'),
    elementGrid: document.getElementById('elementGrid'),
    search: document.getElementById('search'),
    category: document.getElementById('category'),
    openToolbarBtn: document.getElementById('openToolbar'),
    openAchievementsBtn: document.getElementById('openAchievements'),
    achievementsPanel: document.getElementById('achievements'),
    discoveredList: document.getElementById('discoveredList'),
    notif: document.getElementById('notif'),
  };

  if (!refs.board || !refs.elementGrid) {
    console.error("Chemicraft: Missing essential HTML elements.");
    return;
  }

  // ===== State =====
  let spawned = [];
  let nodeId = 0;
  let isDragging = false;
  let audioCtx;

  // ===== Helpers =====
  const notify = (msg, ms = 1200) => {
    const el = refs.notif;
    if (!el) return;
    el.textContent = msg;
    el.style.display = "block";
    el.style.opacity = 1;
    clearTimeout(notify._t);
    notify._t = setTimeout(() => {
      el.style.opacity = 0;
      setTimeout(() => (el.style.display = "none"), 250);
    }, ms);
  };

  const findItem = sym => items.find(i => i.sym === sym);
  const findRecipe = (a, b) => {
    for (const r of recipes) {
      const ins = r.inputs.map(x => String(x));
      if (ins.includes(a) && ins.includes(b)) return r.output;
    }
    return null;
  };

  // ===== Toolbar Rendering =====
  function renderToolbar() {
    const q = (refs.search.value || "").toLowerCase();
    const cat = refs.category.value || "All";
    refs.elementGrid.innerHTML = "";

    const list = items.slice().sort((a, b) =>
      a.unlocked === b.unlocked ? 0 : a.unlocked ? -1 : 1
    );

    list.forEach(it => {
      if (cat !== "All" && it.category !== cat) return;
      if (
        q &&
        !(
          it.sym.toLowerCase().includes(q) ||
          it.name.toLowerCase().includes(q)
        )
      )
        return;

      const el = document.createElement("div");
      el.className = "elem" + (it.unlocked ? "" : " locked");
      el.innerHTML = `
        <div style="text-align:center;">
          <div style="font-size:22px;">${it.emoji || it.sym}</div>
          <div style="font-size:12px;margin-top:2px;color:var(--muted)">${
            it.sym
          }</div>
        </div>`;
      el.title = it.name;

      el.addEventListener("click", e => {
        e.stopPropagation();
        if (!it.unlocked) {
          notify("Locked — discover via reactions");
          return;
        }
        spawnNode(it);
      });
      refs.elementGrid.appendChild(el);
    });
  }

  // ===== Achievements =====
  function renderAchievements() {
    refs.discoveredList.innerHTML = "";
    const discovered = items.filter(
      i => i.unlocked && i.category === "Compounds"
    );
    if (!discovered.length) {
      refs.discoveredList.innerHTML =
        '<div style="color:#999">No compounds discovered yet.</div>';
      return;
    }
    discovered.forEach(d => {
      const div = document.createElement("div");
      div.className = "chip";
      div.textContent = `${d.emoji || d.sym} ${d.sym}`;
      refs.discoveredList.appendChild(div);
    });
  }

  // ===== Spawn Node =====
  function spawnNode(item) {
    if (!item) return;
    const node = document.createElement("div");
    node.className = "node";
    node.dataset.sym = item.sym;
    node.dataset.id = ++nodeId;
    node.innerHTML = `
      <div class="node-emoji">${item.emoji || "🧪"}</div>
      <div class="node-label">${item.name || item.sym}</div>
    `;
    const br = refs.board.getBoundingClientRect();
    node.style.left = `${br.width / 2 - 36}px`;
    node.style.top = `${br.height / 2 - 36}px`;
    refs.board.appendChild(node);

    const alwaysShow = localStorage.getItem("alwaysShowNames") === "true";
    if (alwaysShow) node.classList.add("show-name");

    enableDrag(node);
    node.addEventListener("click", e => {
      if (!isDragging) node.classList.toggle("show-name");
    });
    spawned.push(node);
    clickSound();
  }

  // ===== Dragging =====
  function enableDrag(node) {
    let active = false,
      pid = null,
      ox = 0,
      oy = 0;

    node.addEventListener("pointerdown", ev => {
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

    node.addEventListener("pointermove", ev => {
      if (!active || ev.pointerId !== pid) return;
      isDragging = true;
      const br = refs.board.getBoundingClientRect();
      let x = ev.clientX - br.left - ox;
      let y = ev.clientY - br.top - oy;
      x = Math.max(0, Math.min(br.width - node.offsetWidth, x));
      y = Math.max(0, Math.min(br.height - node.offsetHeight, y));
      node.style.left = x + "px";
      node.style.top = y + "px";
    });

    node.addEventListener("pointerup", ev => {
      if (ev.pointerId !== pid) return;
      active = false;
      pid = null;
      node.style.zIndex = "";
      setTimeout(() => (isDragging = false), 80);
      checkCombine(node);
    });

    node.addEventListener("pointercancel", () => {
      active = false;
      pid = null;
      node.style.zIndex = "";
      isDragging = false;
    });
  }

  // ===== Combination Check =====
  function checkCombine(node) {
    const r1 = node.getBoundingClientRect();
    for (const other of spawned.slice()) {
      if (other === node) continue;
      const r2 = other.getBoundingClientRect();
      const dx = r1.left + r1.width / 2 - (r2.left + r2.width / 2);
      const dy = r1.top + r1.height / 2 - (r2.top + r2.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 50) {
        const res =
          findRecipe(node.dataset.sym, other.dataset.sym) ||
          findRecipe(other.dataset.sym, node.dataset.sym);
        if (res) {
          fizzSound();
          spawnSpark((r1.left + r2.left) / 2 + 36, (r1.top + r2.top) / 2 + 36);
          node.remove();
          other.remove();
          spawned = spawned.filter(n => n !== node && n !== other);
          applyRecipe(res);
          return;
        } else {
          notify("No reaction", 700);
          node.animate(
            [{ transform: "scale(1.1)" }, { transform: "scale(1)" }],
            { duration: 180 }
          );
          other.animate(
            [{ transform: "scale(1.1)" }, { transform: "scale(1)" }],
            { duration: 180 }
          );
          return;
        }
      }
    }
  }

  // ===== Apply Reaction Result =====
  function applyRecipe(sym) {
    let prod = findItem(sym);
    if (!prod) {
      prod = {
        sym,
        emoji: "✨",
        name: sym,
        category: "Compounds",
        unlocked: true,
      };
      items.push(prod);
    } else if (!prod.unlocked) {
      prod.unlocked = true;
      saveUnlocks();
      notify("Unlocked: " + prod.sym, 1200);
    } else notify("Created: " + prod.sym, 900);
    spawnNode(prod);
    renderToolbar();
    renderAchievements();
  }

  // ===== Audio =====
  function clickSound() {
    if (!audioCtx)
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const s = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    s.type = "triangle";
    s.frequency.value = 900;
    g.gain.value = 0.003;
    s.connect(g);
    g.connect(audioCtx.destination);
    s.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
    setTimeout(() => s.stop(), 300);
  }

  function fizzSound() {
    if (!audioCtx)
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const buffer = audioCtx.createBuffer(
      1,
      audioCtx.sampleRate * 0.2,
      audioCtx.sampleRate
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    const g = audioCtx.createGain();
    g.gain.value = 0.08;
    src.connect(g);
    g.connect(audioCtx.destination);
    src.start();
  }

  // ===== Spark Effect =====
  function spawnSpark(x, y) {
    const s = document.createElement("div");
    s.className = "spark";
    s.style.left = x + "px";
    s.style.top = y + "px";
    document.body.appendChild(s);
    s.animate(
      [
        { transform: "scale(0.4)", opacity: 1 },
        { transform: "scale(2.4)", opacity: 0 },
      ],
      { duration: 400, easing: "ease-out" }
    );
    setTimeout(() => s.remove(), 420);
  }

  // ===== Events =====
  refs.openToolbarBtn.addEventListener("click", e => {
    e.stopPropagation();
    refs.toolbar.classList.toggle("open");
    renderToolbar();
  });

  refs.openAchievementsBtn.addEventListener("click", () => {
    refs.achievementsPanel.style.display =
      refs.achievementsPanel.style.display === "block" ? "none" : "block";
    renderAchievements();
  });

  document.addEventListener("click", e => {
    if (isDragging) return;
    if (
      !refs.toolbar.contains(e.target) &&
      e.target !== refs.openToolbarBtn
    )
      refs.toolbar.classList.remove("open");
  });

  refs.search.addEventListener("input", renderToolbar);
  refs.category.addEventListener("change", renderToolbar);

  // ===== Init =====
  renderToolbar();
  renderAchievements();

  // Expose for debug
  window.chemicraft = { spawnNode, renderToolbar, renderAchievements };
})();
