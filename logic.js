/* logic.js — Chemicraft Phase 2 Core Polish
   Requires: data.js already loaded (items, recipes, loadUnlocks, saveUnlocks)
*/

(() => {
  // ========== DOM references ==========
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

  if (!refs.board) {
    console.error('Chemicraft: Missing #board element.');
    return;
  }

  // ========== State ==========
  let spawned = [];
  let nodeId = 0;
  let isDragging = false;
  let audioCtx, ambientGain, ambientPlaying = false;

  // ========== Utility ==========
  const notify = (msg, ms = 1000) => {
    const el = refs.notif;
    if (!el) return;
    el.textContent = msg;
    el.style.opacity = 1;
    el.style.display = 'block';
    clearTimeout(notify._t);
    notify._t = setTimeout(() => {
      el.style.opacity = 0;
      setTimeout(() => el.style.display = 'none', 200);
    }, ms);
  };

  const findItem = sym => items.find(i => i.sym === sym);
  const findRecipe = (a,b) => {
    for (const r of recipes) {
      const ins = r.inputs.map(x=>String(x));
      if (ins.includes(a) && ins.includes(b)) return r.output;
    }
    return null;
  };

  // ========== Audio ==========
  function initAudio() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const o1 = audioCtx.createOscillator();
      const o2 = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      const lp = audioCtx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 800;
      o1.frequency.value = 110;
      o2.frequency.value = 113;
      o1.type = 'sine'; o2.type = 'sine';
      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfo.frequency.value = 0.2; lfoGain.gain.value = 0.25;
      lfo.connect(lfoGain); lfoGain.connect(g.gain);
      g.gain.value = 0.05;
      o1.connect(g); o2.connect(g); g.connect(lp); lp.connect(audioCtx.destination);
      o1.start(); o2.start(); lfo.start();
      ambientGain = g; ambientPlaying = true;
    } catch(e) { console.warn('Audio init failed', e); }
  }

  function clickSound() {
    if (!audioCtx) return;
    const s = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    s.frequency.value = 880; s.type = 'triangle';
    g.gain.value = 0.002; s.connect(g); g.connect(audioCtx.destination);
    s.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
    setTimeout(()=>s.stop(), 300);
  }

  function fizzSound() {
    if (!audioCtx) return;
    const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate*0.2, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i=0;i<data.length;i++) data[i] = Math.random()*2-1;
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    const g = audioCtx.createGain();
    g.gain.value = 0.05;
    src.connect(g); g.connect(audioCtx.destination);
    src.start();
    setTimeout(()=>src.stop(), 200);
  }

  // ========== Toolbar ==========
  function renderToolbar() {
    refs.elementGrid.innerHTML = '';
    const q = (refs.search.value || '').toLowerCase();
    const cat = refs.category.value || 'All';
    const sorted = items.slice().sort((a,b)=>(a.unlocked===b.unlocked)?0:(a.unlocked?-1:1));
    sorted.forEach(it=>{
      if (cat!=='All' && it.category!==cat) return;
      if (q && !(it.sym.toLowerCase().includes(q)||it.name.toLowerCase().includes(q))) return;
      const el = document.createElement('div');
      el.className = 'elem'+(it.unlocked?'':' locked');
      el.innerHTML = `<div style="text-align:center">${it.emoji||it.sym}<div style="font-size:11px;margin-top:4px;color:var(--muted)">${it.sym}</div></div>`;
      el.title = it.name;
      el.addEventListener('click', e=>{
        e.stopPropagation();
        if(!it.unlocked){notify('Locked — discover via reactions');return;}
        chemicraft.spawnNode(it);
      });
      refs.elementGrid.appendChild(el);
    });
  }

  // ========== Spawn ==========
  function spawnNode(item) {
    if (!item) return;
    const node = document.createElement('div');
    node.className = 'node'+(item.category==='Compounds'?' compound':'');
    node.dataset.sym = item.sym;
    node.textContent = item.emoji || item.sym;
    node.dataset.id = ++nodeId;

    const br = refs.board.getBoundingClientRect();
    const offset = (Math.random()-0.5)*80;
    node.style.left = `${br.width/2 - 36 + offset}px`;
    node.style.top = `${br.height/2 - 36 + offset}px`;
    node.style.opacity = 0;
    node.style.transform = 'scale(0.5)';
    refs.board.appendChild(node);

    // spawn animation
    node.animate([
      {opacity:0, transform:'scale(0.5)'},
      {opacity:1, transform:'scale(1)'}
    ], {duration:200, easing:'ease-out', fill:'forwards'});

    enableDrag(node);
    spawned.push(node);
    clickSound();
  }

  // ========== Drag ==========
  function enableDrag(node) {
    let active=false, pid=null, ox=0, oy=0;
    node.addEventListener('pointerdown', ev=>{
      ev.preventDefault();
      node.setPointerCapture(ev.pointerId);
      active=true; pid=ev.pointerId;
      const r=node.getBoundingClientRect(); const br=refs.board.getBoundingClientRect();
      ox=ev.clientX - r.left; oy=ev.clientY - r.top;
      node.style.zIndex=9999;
    });
    node.addEventListener('pointermove', ev=>{
      if(!active||ev.pointerId!==pid)return;
      isDragging=true;
      const br=refs.board.getBoundingClientRect();
      let x=ev.clientX-br.left-ox;
      let y=ev.clientY-br.top-oy;
      x=Math.max(0,Math.min(br.width-node.offsetWidth,x));
      y=Math.max(0,Math.min(br.height-node.offsetHeight,y));
      node.style.left=x+'px'; node.style.top=y+'px';
    });
    node.addEventListener('pointerup', ev=>{
      if(ev.pointerId!==pid)return;
      active=false;pid=null;node.style.zIndex='';
      setTimeout(()=>isDragging=false,80);
      checkCombine(node);
    });
    node.addEventListener('pointercancel',()=>{active=false;pid=null;node.style.zIndex='';isDragging=false;});
  }

  // ========== Combine ==========
  function checkCombine(node){
    const r1=node.getBoundingClientRect();
    for(const other of spawned.slice()){
      if(other===node)continue;
      const r2=other.getBoundingClientRect();
      const dx=(r1.left+r1.width/2)-(r2.left+r2.width/2);
      const dy=(r1.top+r1.height/2)-(r2.top+r2.height/2);
      const dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<50){ // magnet zone
        const res=findRecipe(node.dataset.sym,other.dataset.sym)||findRecipe(other.dataset.sym,node.dataset.sym);
        if(res){
          fizzSound();
          spawnSpark((r1.left+r2.left)/2+36,(r1.top+r2.top)/2+36);
          node.remove();other.remove();
          spawned=spawned.filter(n=>n!==node&&n!==other);
          applyRecipe(res);
          return;
        }else{
          notify('No reaction',700);
          node.animate([{transform:'scale(1.1)'},{transform:'scale(1)'}],{duration:180});
          other.animate([{transform:'scale(1.1)'},{transform:'scale(1)'}],{duration:180});
          return;
        }
      }
    }
  }

  // ========== Reaction Result ==========
  function applyRecipe(sym){
    let prod=findItem(sym);
    if(!prod){
      prod={sym,emoji:'✨',name:sym,category:'Compounds',unlocked:true};
      items.push(prod);
    }else if(!prod.unlocked){
      prod.unlocked=true; saveUnlocks(); notify('Unlocked: '+prod.sym,1200);
    }else notify('Created: '+prod.sym,900);
    spawnNode(prod); renderToolbar(); renderAchievements();
  }

  // ========== Spark ==========
  function spawnSpark(x,y){
    const s=document.createElement('div');
    s.className='spark';
    s.style.left=x+'px'; s.style.top=y+'px';
    document.body.appendChild(s);
    s.animate([{transform:'scale(0.4)',opacity:1},{transform:'scale(2.4)',opacity:0}],{duration:400,easing:'ease-out'});
    setTimeout(()=>s.remove(),420);
  }

  // ========== Achievements ==========
  function renderAchievements(){
    refs.discoveredList.innerHTML='';
    const discovered=items.filter(i=>i.unlocked&&i.category==='Compounds');
    if(!discovered.length){refs.discoveredList.innerHTML='<div style="color:var(--muted)">No compounds discovered yet.</div>';return;}
    discovered.forEach(d=>{
      const c=document.createElement('div');
      c.className='chip'; c.textContent=`${d.emoji||d.sym} ${d.sym}`;
      refs.discoveredList.appendChild(c);
    });
  }

  // ========== Events ==========
  refs.openToolbarBtn.addEventListener('click',e=>{
    e.stopPropagation();
    refs.toolbar.classList.toggle('open');
    renderToolbar();
  });
  refs.clearBoardBtn.addEventListener('click',()=>{
    spawned.forEach(n=>n.remove()); spawned=[]; notify('Board cleared',700);
  });
  refs.openAchievementsBtn.addEventListener('click',()=>{
    refs.achievementsPanel.style.display=refs.achievementsPanel.style.display==='block'?'none':'block';
    renderAchievements();
  });
  document.addEventListener('click',e=>{
    if(isDragging)return;
    if(!refs.toolbar.contains(e.target)&&e.target!==refs.openToolbarBtn)
      refs.toolbar.classList.remove('open');
  });
  refs.search.addEventListener('input',renderToolbar);
  refs.category.addEventListener('change',renderToolbar);

  // ========== Init ==========
  document.addEventListener('pointerdown',()=>initAudio(),{once:true});
  renderToolbar(); renderAchievements();

  // expose
  window.chemicraft = { spawnNode, renderToolbar, renderAchievements, applyRecipe };
})();

/* ---------- Phase 2 Part 2 : Info Panel + Reaction History ---------- */

const infoPanel = document.createElement('div');
infoPanel.id = 'infoPanel';
Object.assign(infoPanel.style, {
  position: 'fixed',
  bottom: '100px',
  right: '12px',
  background: 'rgba(4,25,36,0.92)',
  color: '#dff7ff',
  borderRadius: '12px',
  padding: '10px 14px',
  maxWidth: '240px',
  boxShadow: '0 4px 24px rgba(0,0,0,.6)',
  fontSize: '14px',
  zIndex: 200,
  display: 'none',
  transition: 'opacity .25s ease, transform .25s ease'
});
document.body.appendChild(infoPanel);

const historyBox = document.createElement('div');
historyBox.id = 'reactionHistory';
Object.assign(historyBox.style, {
  position: 'fixed',
  left: '12px',
  bottom: '90px',
  background: 'rgba(0,0,0,0.4)',
  borderRadius: '8px',
  color: '#dff7ff',
  padding: '6px 10px',
  fontSize: '13px',
  lineHeight: '1.4em',
  maxHeight: '120px',
  overflowY: 'auto',
  width: '220px',
  boxShadow: '0 0 12px rgba(0,0,0,.4)',
  zIndex: 90
});
document.body.appendChild(historyBox);

let historyEntries = [];

function showInfo(item){
  if(!item)return;
  infoPanel.innerHTML = `<strong>${item.emoji||''} ${item.name}</strong>
  <div style="opacity:.8;margin-top:4px">${item.sym} • ${item.category}</div>
  <div style="margin-top:6px;color:#9cc">${item.funFact||'— No data yet —'}</div>`;
  infoPanel.style.display='block';
  infoPanel.style.opacity='1';
  infoPanel.style.transform='translateY(0)';
  clearTimeout(showInfo._t);
  showInfo._t = setTimeout(()=>{ hideInfo(); }, 4000);
}

function hideInfo(){
  infoPanel.style.opacity='0';
  infoPanel.style.transform='translateY(8px)';
  setTimeout(()=>{ infoPanel.style.display='none'; },250);
}

function addHistory(a,b,res){
  const line = `${a} + ${b} → ${res}`;
  historyEntries.unshift(line);
  if(historyEntries.length>6) historyEntries.pop();
  historyBox.innerHTML = historyEntries.map(e=>`<div>${e}</div>`).join('');
}

/* Hook into spawn + combine */

const oldSpawnNode = chemicraft.spawnNode;
chemicraft.spawnNode = function(item){
  const node = oldSpawnNode(item);
  node.addEventListener('click', ev=>{
    ev.stopPropagation();
    showInfo(item);
  });
  return node;
};

const oldApplyRecipe = chemicraft.applyRecipe;
chemicraft.applyRecipe = function(sym){
  // find inputs for log
  const r = recipes.find(r=>r.output===sym);
  if(r) addHistory(r.inputs[0], r.inputs[1], sym);
  oldApplyRecipe(sym);
};

/* Optional fun-fact dictionary (add more later) */
const funFacts = {
  'H': 'Lightest element and primary fuel of stars.',
  'O': 'Essential for respiration and combustion.',
  'NaCl': 'Common salt used in food and chemistry.',
  'H2O': 'Universal solvent — makes life possible.',
  'CO2': 'Greenhouse gas exhaled by humans.',
  'Fe': 'Core element of Earth’s center and steel.',
  'NH3': 'Ammonia, used in fertilizers and cleaning.'
};
items.forEach(it=>{ if(funFacts[it.sym]) it.funFact = funFacts[it.sym]; });