/* logic.js — Chemicraft Refined Core
   Phase 2 Rebuild: stable drag, visible names, settings panel, & tips
*/

(() => {
  // ===== DOM Refs =====
  const refs = {
    board: document.getElementById("board"),
    toolbar: document.getElementById("toolbar"),
    elementGrid: document.getElementById("elementGrid"),
    search: document.getElementById("search"),
    category: document.getElementById("category"),
    notif: document.getElementById("notif"),
    openToolbarBtn: document.getElementById("openToolbar"),
    clearBoardBtn: document.getElementById("clearBoard"),
    settingsBtn: document.getElementById("openSettings"),
    settingsPanel: document.getElementById("settingsPanel"),
    soundToggle: document.getElementById("soundToggle"),
    tipsToggle: document.getElementById("tipsToggle"),
    achievementsPanel: document.getElementById("achievements"),
    discoveredList: document.getElementById("discoveredList"),
  };

  if (!refs.board || !refs.elementGrid) {
    console.error("Chemicraft: missing essential DOM elements");
    return;
  }

  // ===== State =====
  let spawned = [];
  let nodeId = 0;
  let isDragging = false;
  let audioCtx = null;
  let soundEnabled = localStorage.getItem("soundEnabled") !== "false";
  let showTips = localStorage.getItem("showTips") !== "false";

  // ===== Utilities =====
  const notify = (msg, ms = 1200) => {
    refs.notif.textContent = msg;
    refs.notif.style.display = "block";
    refs.notif.style.opacity = 1;
    clearTimeout(notify._t);
    notify._t = setTimeout(() => {
      refs.notif.style.opacity = 0;
      setTimeout(() => (refs.notif.style.display = "none"), 200);
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

  // ===== Audio =====
  function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  function playSound(type) {
    if (!soundEnabled) return;
    if (!audioCtx)
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    if (type === "click") {
      const s = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      s.type = "triangle";
      s.frequency.value = 700;
      g.gain.value = 0.002;
      s.connect(g);
      g.connect(audioCtx.destination);
      s.start();
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
      setTimeout(() => s.stop(), 300);
    }

    if (type === "fizz") {
      const buffer = audioCtx.createBuffer(
        1,
        audioCtx.sampleRate * 0.15,
        audioCtx.sampleRate
      );
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = audioCtx.createBufferSource();
      src.buffer = buffer;
      const g = audioCtx.createGain();
      g.gain.value = 0.05;
      src.connect(g);
      g.connect(audioCtx.destination);
      src.start();
      setTimeout(() => src.stop(), 150);
    }
  }

  // ===== Toolbar =====
  function renderToolbar() {
    refs.elementGrid.innerHTML = "";
    const q = (refs.search.value || "").toLowerCase();
    const cat = refs.category.value || "All";

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
          <div style="font-size:11px;margin-top:2px;color:var(--muted)">${
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

  // ===== Spawning =====
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
    enableDrag(node);
    spawned.push(node);
    playSound("click");
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
      node.style.transition = "none";
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
      node.style.transition = "transform 0.1s ease";
      node.style.zIndex = "";
      setTimeout(() => (isDragging = false), 60);
      checkCombine(node);
    });

    node.addEventListener("pointercancel", () => {
      active = false;
      pid = null;
      isDragging = false;
      node.style.zIndex = "";
    });
  }

  // ===== Combination =====
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
          playSound("fizz");
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
            { duration: 200 }
          );
          return;
        }
      }
    }
  }

  // ===== Reaction Output =====
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

  // ===== Spark Effect =====
  function spawnSpark(x, y) {
    const s = document.createElement("div");
    s.className = "spark";
    s.style.left = x + "px";
    s.style.top = y + "px";
    document.body.appendChild(s);
    s.animate(
      [
        { transform: "scale(0.5)", opacity: 1 },
        { transform: "scale(2.4)", opacity: 0 },
      ],
      { duration: 400, easing: "ease-out" }
    );
    setTimeout(() => s.remove(), 420);
  }

  // ===== Achievements =====
  function renderAchievements() {
    refs.discoveredList.innerHTML = "";
    const discovered = items.filter(
      i => i.unlocked && i.category === "Compounds"
    );
    if (!discovered.length) {
      refs.discoveredList.innerHTML =
        '<div style="color:var(--muted)">No compounds discovered yet.</div>';
      return;
    }
    discovered.forEach(d => {
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.textContent = `${d.emoji || d.sym} ${d.sym}`;
      refs.discoveredList.appendChild(chip);
    });
  }

  // ===== Settings =====
  function renderSettings() {
    refs.soundToggle.checked = soundEnabled;
    refs.tipsToggle.checked = showTips;

    refs.soundToggle.addEventListener("change", e => {
      soundEnabled = e.target.checked;
      localStorage.setItem("soundEnabled", soundEnabled);
      notify(soundEnabled ? "Sound enabled" : "Sound muted", 800);
    });

    refs.tipsToggle.addEventListener("change", e => {
      showTips = e.target.checked;
      localStorage.setItem("showTips", showTips);
      notify(showTips ? "Tips on" : "Tips hidden", 800);
    });
  }

  // ===== Events =====
  refs.openToolbarBtn.addEventListener("click", () => {
    refs.toolbar.classList.toggle("open");
    renderToolbar();
  });

  refs.clearBoardBtn.addEventListener("click", () => {
    spawned.forEach(n => n.remove());
    spawned = [];
    notify("Board cleared", 800);
  });

  refs.settingsBtn.addEventListener("click", () => {
    refs.settingsPanel.classList.toggle("open");
    renderSettings();
  });

  document.addEventListener("click", e => {
    if (isDragging) return;
    if (!refs.toolbar.contains(e.target) && e.target !== refs.openToolbarBtn)
      refs.toolbar.classList.remove("open");
  });

  refs.search.addEventListener("input", renderToolbar);
  refs.category.addEventListener("change", renderToolbar);

  // ===== Init =====
  document.addEventListener("pointerdown", () => initAudio(), { once: true });
  renderToolbar();
  renderAchievements();
  renderSettings();

  // expose
  window.chemicraft = { spawnNode, renderToolbar, renderAchievements };
})();
