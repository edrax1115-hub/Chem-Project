/* logic.js — core game logic
   - spawn, drag, combine
   - achievements list rendering
   - exposes window.chemicraft helpers
*/

(() => {
  // DOM refs
  const refs = {
    board: document.getElementById('board'),
    toolbar: document.getElementById('toolbar'),
    elementGrid: document.getElementById('elementGrid'),
    search: document.getElementById('search'),
    category: document.getElementById('category'),
    openToolbar: document.getElementById('openToolbar'),
    openAchievements: document.getElementById('openAchievements'),
    achievementsPanel: document.getElementById('achievements'),
    discoveredList: document.getElementById('discoveredList'),
    notif: document.getElementById('notif'),
    openSettings: document.getElementById('openSettings'),
    settingsPanel: document.getElementById('settings'),
    clearBoard: document.getElementById('clearBoard')
  };

  if (!refs.board || !window.items) { console.error("Missing required DOM or data"); return; }

  let spawned = [];
  let idCounter = 0;
  let audioCtx = null;
  // global drag state
  let dragState = null; // { node, pointerId, ox, oy, startX, startY, moved }

  // helper notify
  function notify(msg, ms=1100){
    if(!refs.notif) return;
    refs.notif.textContent = msg;
    refs.notif.style.display = 'block';
    refs.notif.style.opacity = '1';
    clearTimeout(notify._t);
    notify._t = setTimeout(()=>{ refs.notif.style.opacity='0'; setTimeout(()=>refs.notif.style.display='none',200); }, ms);
  }

  function findItem(sym){ return window.items.find(i=>i.sym===sym); }
  function findRecipe(a,b){
    for(const r of window.recipes){
      const ins = r.inputs.map(x=>String(x));
      if(ins.includes(a) && ins.includes(b)) return r.output;
    }
    return null;
  }

  // render toolbar
  function renderToolbar(){
    refs.elementGrid.innerHTML = '';
    const q = (refs.search?.value||'').toLowerCase();
    const cat = (refs.category?.value) || 'All';
    const list = window.items.slice().sort((a,b)=>(a.unlocked===b.unlocked)?0:(a.unlocked?-1:1));
    for(const it of list){
      if(cat!=='All' && it.category !== cat) continue;
      if(q && !((it.sym+it.name).toLowerCase().includes(q))) continue;
      const el = document.createElement('div');
      el.className = 'elem' + (it.unlocked ? '' : ' locked');
      el.innerHTML = `<div style="text-align:center"><div style="font-size:22px">${it.emoji||it.sym}</div><div style="font-size:12px;margin-top:4px;color:var(--muted)">${it.name}</div></div>`;
      el.title = it.name;
      el.addEventListener('click', (ev)=>{
        ev.stopPropagation();
        if(!it.unlocked){ notify('Locked — discover via reactions'); return; }
        spawnNode(it);
      });
      refs.elementGrid.appendChild(el);
    }
  }

  // achievements
  function renderAchievements(){
    if(!refs.discoveredList) return;
    refs.discoveredList.innerHTML = '';
    const discovered = window.items.filter(i=>i.unlocked && i.category === 'Compounds');
    if(!discovered.length){ refs.discoveredList.innerHTML = '<div style="color:var(--muted)">No compounds discovered yet.</div>'; return; }
    discovered.forEach(d=>{
      const c = document.createElement('div'); c.className='chip'; c.textContent = `${d.emoji||d.sym} ${d.name}`;
      refs.discoveredList.appendChild(c);
    });
  }

  // spawn node (center)
  function spawnNode(item){
    if(!item) return;
    const node = document.createElement('div');
    node.className = 'node' + (item.category==='Compounds' ? ' compound' : '');
    node.dataset.sym = item.sym;
    node.dataset.name = item.name;
    node.dataset.id = ++idCounter;
    node.innerHTML = `<div class="node-emoji">${item.emoji||item.sym}</div><div class="node-label">${item.name}</div>`;
    // center spawn with small jitter
    const br = refs.board.getBoundingClientRect();
    const jitterX = (Math.random()-0.5)*40;
    const jitterY = (Math.random()-0.5)*40;
    node.style.left = Math.max(6, br.width/2 - 36 + jitterX) + 'px';
    node.style.top  = Math.max(6, br.height/2 - 36 + jitterY) + 'px';
    // apply "always show names" if set
    if(localStorage.getItem('alwaysShowNames') === 'true') node.classList.add('show-name');

    // attach pointerdown for drag
    node.addEventListener('pointerdown', nodePointerDown);
    refs.board.appendChild(node);
    spawned.push(node);
    clickSound();
    return node;
  }

  // pointer handlers for robust dragging
  function nodePointerDown(ev){
    ev.preventDefault();
    const node = ev.currentTarget;
    try{ node.setPointerCapture(ev.pointerId); }catch(e){}
    const rect = node.getBoundingClientRect();
    dragState = { node, pointerId:ev.pointerId, ox: ev.clientX - rect.left, oy: ev.clientY - rect.top, startX:ev.clientX, startY:ev.clientY, moved:false };
    node.style.zIndex = 9999;
  }

  window.addEventListener('pointermove', (ev)=>{
    if(!dragState || ev.pointerId !== dragState.pointerId) return;
    const node = dragState.node;
    const br = refs.board.getBoundingClientRect();
    let x = ev.clientX - br.left - dragState.ox;
    let y = ev.clientY - br.top - dragState.oy;
    x = Math.max(0, Math.min(br.width - node.offsetWidth, x));
    y = Math.max(0, Math.min(br.height - node.offsetHeight, y));
    node.style.left = x + 'px';
    node.style.top = y + 'px';
    const dx = ev.clientX - dragState.startX;
    const dy = ev.clientY - dragState.startY;
    if(!dragState.moved && Math.sqrt(dx*dx + dy*dy) > 6) dragState.moved = true;
  }, { passive:false });

  window.addEventListener('pointerup', (ev)=>{
    if(!dragState || ev.pointerId !== dragState.pointerId) return;
    const node = dragState.node;
    try{ node.releasePointerCapture(ev.pointerId); }catch(e){}
    node.style.zIndex = '';
    if(!dragState.moved){
      // tap (toggle label)
      node.classList.toggle('show-name');
    } else {
      // drag ended — check combine
      checkCombine(node);
    }
    setTimeout(()=> dragState = null, 20);
  });

  window.addEventListener('pointercancel', (ev)=>{
    if(!dragState || ev.pointerId !== dragState.pointerId) return;
    try{ dragState.node.releasePointerCapture(ev.pointerId); }catch(e){}
    dragState.node.style.zIndex = '';
    dragState = null;
  });

  // combine detection (distance threshold)
  function checkCombine(node){
    const r1 = node.getBoundingClientRect();
    for(const other of spawned.slice()){
      if(other === node) continue;
      const r2 = other.getBoundingClientRect();
      const dx = (r1.left + r1.width/2) - (r2.left + r2.width/2);
      const dy = (r1.top + r1.height/2) - (r2.top + r2.height/2);
      const dist = Math.sqrt(dx*dx + dy*dy);
      if(dist < 60){
        const a = node.dataset.sym;
        const b = other.dataset.sym;
        const res = findRecipe(a,b) || findRecipe(b,a);
        if(res){
          spawnSpark((r1.left + r2.left)/2 + r1.width/2, (r1.top + r2.top)/2 + r1.height/2);
          node.remove(); other.remove();
          spawned = spawned.filter(n => n !== node && n !== other);
          applyRecipe(res);
          return;
        } else {
          // small feedback
          node.animate([{ transform:'scale(1.06)' }, { transform:'scale(1)' }], { duration:180 });
          other.animate([{ transform:'scale(1.06)' }, { transform:'scale(1)' }], { duration:180 });
          notify('No reaction',700);
          return;
        }
      }
    }
  }

  function applyRecipe(outputSym){
    let prod = findItem(outputSym);
    if(!prod){
      prod = { sym: outputSym, name: outputSym, emoji:'✨', category:'Compounds', unlocked:true };
      window.items.push(prod);
    } else if(!prod.unlocked){
      prod.unlocked = true;
      if(window.saveUnlocks) window.saveUnlocks();
      notify('Unlocked: ' + prod.name, 1200);
    } else {
      notify('Created: ' + prod.name, 800);
    }
    // spawn product
    spawnNode(prod);
    renderToolbar();
    renderAchievements();
    fizzSound();
  }

  // small audio helpers
  function ensureAudio(){
    if(audioCtx) return;
    try{ audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ audioCtx = null; }
  }
  function clickSound(){
    ensureAudio();
    if(!audioCtx) return;
    const s = audioCtx.createOscillator(); const g = audioCtx.createGain();
    s.type='triangle'; s.frequency.value=900; g.gain.value = 0.0025;
    s.connect(g); g.connect(audioCtx.destination);
    s.start(); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.22);
    setTimeout(()=> s.stop(), 240);
  }
  function fizzSound(){
    ensureAudio();
    if(!audioCtx) return;
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.12, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i] = (Math.random()*2-1) * (1 - i/d.length);
    const src = audioCtx.createBufferSource(); src.buffer = buf;
    const g = audioCtx.createGain(); g.gain.value = 0.06;
    src.connect(g); g.connect(audioCtx.destination); src.start();
  }

  // spark visual
  function spawnSpark(x,y){
    const s = document.createElement('div'); s.className = 'spark'; s.style.left = x + 'px'; s.style.top = y + 'px';
    document.body.appendChild(s);
    try{ s.animate([{ transform:'scale(0.4)', opacity:1 }, { transform:'scale(2.4)', opacity:0 }], { duration:420, easing:'ease-out' }); }catch(e){}
    setTimeout(()=> s.remove(), 460);
  }

  // UI events
  refs.openToolbar?.addEventListener('click', e => { e.stopPropagation(); refs.toolbar.classList.toggle('open'); renderToolbar(); });
  refs.openAchievements?.addEventListener('click', e => { e.stopPropagation(); if(!refs.achievementsPanel) return; refs.achievementsPanel.style.display = (refs.achievementsPanel.style.display==='block')?'none':'block'; if(refs.achievementsPanel.style.display==='block') renderAchievements(); });
  refs.openSettings?.addEventListener('click', e => { e.stopPropagation(); if(!refs.settingsPanel) return; refs.settingsPanel.style.display = (refs.settingsPanel.style.display==='block')?'none':'block'; });
  document.addEventListener('click', e => {
    if(dragState) return; // avoid auto-close while dragging
    if(refs.toolbar && !refs.toolbar.contains(e.target) && e.target !== refs.openToolbar) refs.toolbar.classList.remove('open');
    if(refs.achievementsPanel && !refs.achievementsPanel.contains(e.target) && e.target !== refs.openAchievements) refs.achievementsPanel.style.display='none';
    if(refs.settingsPanel && !refs.settingsPanel.contains(e.target) && e.target !== refs.openSettings) refs.settingsPanel.style.display='none';
  });

  refs.search?.addEventListener('input', renderToolbar);
  refs.category?.addEventListener('change', renderToolbar);
  refs.clearBoard?.addEventListener('click', ()=>{ spawned.forEach(n=>n.remove()); spawned = []; notify('Board cleared'); });

  // init
  renderToolbar();
  renderAchievements();

  // expose helper for settings.js
  window.chemicraft = {
    spawnNode, renderToolbar, renderAchievements,
    showAllNames: (on) => { document.querySelectorAll('.node').forEach(n=>{ if(on) n.classList.add('show-name'); else n.classList.remove('show-name'); }); }
  };
})();
