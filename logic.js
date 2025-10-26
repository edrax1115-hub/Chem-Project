/* logic.js — Chemicraft Main Gameplay
   Requires: data.js (items + recipes)
*/

(() => {
  // ======= DOM References =======
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
  let showLabels = true;

  // ======= Audio =======
  function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 1.5, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.02;
    }

    ambientSource = audioCtx.createBufferSource();
    ambientSource.buffer = buffer;
    ambientSource.loop = true;

    const gain = audioCtx.createGain();
    gain.gain.value = 0.1; // gentle low hum

    ambientSource.connect(gain).connect(audioCtx.destination);
    ambientSource.start();
  }

  function stopAudio() {
    if (ambientSource) {
      ambientSource.stop();
      ambientSource.disconnect();
      ambientSource = null;
    }
  }

  // ======= Notify =======
  function notify(msg, ms = 1000) {
    notif.textContent = msg;
    notif.style.display = "block";
    clearTimeout(notify._t);
    notify._t = setTimeout(() => (notif.style.display = "none"), ms);
  }

  // ======= Toolbar =======
  function renderToolbar() {
    elementGrid.innerHTML = "";
    const q = (search.value || "").toLowerCase();
    const cat = category.value || "All";

    const sorted = items.slice().sort((a, b) => (a.unlocked === b.unlocked ? 0 : a.unlocked ? -1 : 1));
    sorted.forEach((it) => {
      if (cat !== "All" && it.category !== cat) return;
      if (q && !(it.sym.toLowerCase().includes(q) || it.name.toLowerCase().includes(q))) return;

      const el = document.createElement("div");
      el.className = "elem" + (it.unlocked ? "" : " locked");
      el.innerHTML = `<div style="text-align:center">${it.emoji || it.sym}<div style="font-size:11px;margin-top:4px;color:var(--muted)">${it.sym}</div></div>`;
      el.title = it.name;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!it.unlocked) {
          notify("Locked — discover via reactions");
          return;
        }
        spawnNode(it);
      });
      elementGrid.appendChild(el);
    });
  }

  // ======= Achievements =======
  function renderAchievements() {
    discoveredList.innerHTML = "";
    const discovered = items.filter((i) => i.unlocked && i.category === "Compounds");
    if (!discovered.length) {
      discoveredList.innerHTML = `<div style="color:var(--muted)">No compounds discovered yet.</div>`;
      return;
    }
    discovered.forEach((d) => {
      const c = document.createElement("div");
      c.className = "chip";
      c.textContent = `${d.emoji || d.sym} ${d.sym}`;
      discoveredList.appendChild(c);
    });
  }

  // ======= Spawn Node =======
  function spawnNode(item) {
    const node = document.createElement("div");
    node.className = "node" + (item.category === "Compounds" ? " compound" : "");
    node.dataset.sym = item.sym;
    node.dataset.id = ++nodeId;
    node.innerHTML = `
      <div>${item.emoji || item.sym}</div>
      ${showLabels ? `<div class="node-label">${item.name || item.sym}</div>` : ""}
    `;

    const br = board.getBoundingClientRect();
    node.style.left = br.width / 2 - 36 + "px";
    node.style.top = br.height / 2 - 36 + "px";

    board.appendChild(node);
    spawned.push(node);
    enableDrag(node);
  }

  // ======= Dragging =======
  function enableDrag(node) {
    let offsetX = 0, offsetY = 0;

    node.addEventListener("pointerdown", (e) => {
      node.setPointerCapture(e.pointerId);
      offsetX = e.clientX - node.offsetLeft;
      offsetY = e.clientY - node.offsetTop;
      node.style.zIndex = 9999;
    });

    node.addEventListener("pointermove", (e) => {
      if (!e.pressure) return;
      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;
      node.style.left = x + "px";
      node.style.top = y + "px";
      isDragging = true;
    });

    node.addEventListener("pointerup", (e) => {
      node.releasePointerCapture(e.pointerId);
      node.style.zIndex = "";
      isDragging = false;
      checkCombine(node);
    });
  }

  // ======= Combine =======
  function checkCombine(node) {
    const r1 = node.getBoundingClientRect();
    for (const other of spawned.slice()) {
      if (other === node) continue;
      const r2 = other.getBoundingClientRect();
      const dx = r1.left - r2.left;
      const dy = r1.top - r2.top;
      if (Math.abs(dx) < 50 && Math.abs(dy) < 50) {
        const result = findRecipe(node.dataset.sym, other.dataset.sym);
        if (result) {
          spawnSpark((r1.left + r2.left) / 2, (r1.top + r2.top) / 2);
          node.remove();
          other.remove();
          spawned = spawned.filter((n) => n !== node && n !== other);
          applyRecipe(result);
          return;
        } else notify("No reaction", 600);
      }
    }
  }

  function findRecipe(a, b) {
    for (const r of recipes) {
      if (r.inputs.includes(a) && r.inputs.includes(b)) return r.output;
    }
    return null;
  }

  // ======= Reaction Result =======
  function applyRecipe(sym) {
    let prod = items.find((i) => i.sym === sym);
    if (!prod) {
      prod = { sym, emoji: "✨", name: sym, category: "Compounds", unlocked: true };
      items.push(prod);
    } else {
      prod.unlocked = true;
    }
    notify("Discovered: " + prod.name);
    spawnNode(prod);
    renderToolbar();
    renderAchievements();
  }

  // ======= Spark =======
  function spawnSpark(x, y) {
    const s =
