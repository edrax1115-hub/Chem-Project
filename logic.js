/* logic.js — Chemicraft v3 (mobile-friendly)
   • Fixed emoji + name rendering
   • Louder, smoother ambience
   • Combined Achievements + Sound Settings
*/

(() => {
  // === DOM refs ===
  const refs = {
    openToolbarBtn: document.getElementById('openToolbar'),
    toolbar: document.getElementById('toolbar'),
    elementGrid: document.getElementById('elementGrid'),
    search: document.getElementById('search'),
    category: document.getElementById('category'),
    board: document.getElementById('board'),
    notif: document.getElementById('notif'),
    openSettingsBtn: document.getElementById('openAchievements'),
    settingsPanel: document.getElementById('achievements'),
    discoveredList: document.getElementById('discoveredList'),
    suggestionsDiv: document.getElementById('suggestions'),
    clearBoardBtn: document.getElementById('clearBoard'),
  };

  if (!refs.board) return console.error('Missing #board element');

  // === State ===
  let spawned = [];
  let nodeId = 0;
  let isDragging = false;
  let audioCtx, ambientGain, ambientPlaying = false;

  // === Utility ===
  const notify = (msg, ms = 1000) => {
    const el = refs.notif;
    el.textContent = msg;
    el.style.display = 'block';
    el.style.opacity = 1;
    clearTimeout(notify._t);
    notify._t = setTimeout(() => {
      el.style.opacity = 0;
      setTimeout(() => el.style.display = 'none', 250);
    }, ms);
  };

  const findItem = s => items.find(i => i.sym === s);
  const findRecipe = (a,b) => {
    for (const r of recipes) {
      const ins = r.inputs.map(String);
      if (ins.includes(a) && ins.includes(b)) return r.output;
    }
    return null;
  };

  // === Audio ===
  function initAudio() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const o1 = audioCtx.createOscillator();
      const o2 = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      const lp = audioCtx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 600;
      o1.type = 'sine';  o1.frequency.value = 170;
      o2.type = 'triangle'; o2.frequency.value = 176;
      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfo.frequency.value = 0.18; lfoGain.gain.value = 0.35;
      lfo.connect(lfoGain); lfoGain.connect(g.gain);
      g.gain.value = 0.12; // louder for mobile
      o1.connect(g); o2.connect(g); g.connect(lp); lp.connect(audioCtx.destination);
      o1.start(); o2.start(); lfo.start();
      ambientGain = g; ambientPlaying = true;
    } catch(e){ console.warn('Audio init failed', e); }
  }

  function toggleAmbient() {
    if (!audioCtx) { initAudio(); return; }
    if (!ambientGain) return;
    ambientGain.gain.value = ambientPlaying ? 0 : 0.12;
    ambientPlaying = !ambientPlaying;
    notify(ambientPlaying ? 'Ambient On' : 'Ambient Off');
  }

  function clickSound() {
    if (!audioCtx) return;
    const s = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    s.type='triangle'; s.frequency.value=880;
    g.gain.value=0.0025;
    s.connect(g); g.connect(audioCtx.destination);
    s.start(); g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+0.25);
    setTimeout(()=>s.stop(),300);
  }

  // === Toolbar render ===
  function renderToolbar() {
    refs.elementGrid.innerHTML='';
    const q=(refs.search.value||'').toLowerCase();
    const cat=refs.category.value||'All';
    const sorted=items.slice().sort((a,b)=>(a.unlocked===b.unlocked)?0:(a.unlocked?-1:1));
    sorted.forEach(it=>{
      if(cat!=='All'&&it.category!==cat)return;
      if(q&&!((it.sym+it.name).toLowerCase().includes(q)))return;
      const el=document.createElement('div');
      el.className='elem'+(it.unlocked?'':' locked');
      el.innerHTML=`
        <div style="text-align:center;display:flex;flex-direction:column;align-items:center;">
          <div style="font-size:22px;">${it.emoji||it.sym}</div>
          <div style="font-size:12px;margin-top:2px;color:var(--muted)">${it.name||it.sym}</div>
        </div>`;
      el.title=it.name;
      el.addEventListener('click',e=>{
        e.stopPropagation();
        if(!it.unlocked){notify('Locked — discover via reactions');return;}
        spawnNode(it);
      });
      refs.elementGrid.appendChild(el);
    });
  }

  // === Spawn ===
  function spawnNode(item){
    if(!item)return;
    const node=document.createElement('div');
    node.className='node'+(item.category==='Compounds'?' compound':'');
    node.dataset.sym=item.sym;
    node.textContent=item.emoji||item.sym;
    node.dataset.id=++nodeId;
    const br=refs.board.getBoundingClientRect();
    node.style.left=(br.width/2-36)+'px';
    node.style.top=(br.height/2-36)+'px';
    refs.board.appendChild(node);
    enableDrag(node);
    spawned.push(node);
    clickSound();
  }

  // === Dragging ===
  function enableDrag(node){
    let active=false,pid=null,ox=0,oy=0;
    node.addEventListener('pointerdown',ev=>{
      ev.preventDefault();
      node.setPointerCapture(ev.pointerId);
      active=true;pid=ev.pointerId;
      const r=node.getBoundingClientRect();const br=refs.board.getBoundingClientRect();
      ox=ev.clientX-r.left;oy=ev.clientY-r.top;
      node.style.zIndex=9999;
    });
    node.addEventListener('pointermove',ev=>{
      if(!active||ev.pointerId!==pid)return;
      isDragging=true;
      const br=refs.board.getBoundingClientRect();
      let x=ev.clientX-br.left-ox;
      let y=ev.clientY-br.top-oy;
      x=Math.max(0,Math.min(br.width-node.offsetWidth,x));
      y=Math.max(0,Math.min(br.height-node.offsetHeight,y));
      node.style.left=x+'px';node.style.top=y+'px';
    });
    node.addEventListener('pointerup',ev=>{
      if(ev.pointerId!==pid)return;
      active=false;pid=null;node.style.zIndex='';
      setTimeout(()=>isDragging=false,60);
      checkCombine(node);
    });
  }

  // === Combining ===
  function checkCombine(node){
    const r1=node.getBoundingClientRect();
    for(const other of spawned.slice()){
      if(other===node)continue;
      const r2=other.getBoundingClientRect();
      const dx=(r1.left+r1.width/2)-(r2.left+r2.width/2);
      const dy=(r1.top+r1.height/2)-(r2.top+r2.height/2);
      if(Math.sqrt(dx*dx+dy*dy)<50){
        const res=findRecipe(node.dataset.sym,other.dataset.sym)||findRecipe(other.dataset.sym,node.dataset.sym);
        if(res){ node.remove();other.remove();spawned=spawned.filter(n=>n!==node&&n!==other);applyRecipe(res);return; }
        else notify('No reaction',700);
      }
    }
  }

  function applyRecipe(sym){
    let prod=findItem(sym);
    if(!prod){ prod={sym,emoji:'✨',name:sym,category:'Compounds',unlocked:true}; items.push(prod); }
    else if(!prod.unlocked){ prod.unlocked=true; saveUnlocks(); notify('Unlocked: '+prod.name,1200); }
    else notify('Created: '+prod.name,900);
    spawnNode(prod); renderToolbar(); renderAchievements();
  }

  // === Achievements / Settings ===
  function renderAchievements(){
    refs.discoveredList.innerHTML='';
    const d=items.filter(i=>i.unlocked&&i.category==='Compounds');
    if(!d.length){refs.discoveredList.innerHTML='<div style="color:var(--muted)">No compounds discovered yet.</div>';return;}
    d.forEach(x=>{
      const c=document.createElement('div');c.className='chip';c.textContent=`${x.emoji||x.sym} ${x.name}`;
      refs.discoveredList.appendChild(c);
    });
  }

  // === Events ===
  refs.openToolbarBtn.addEventListener('click',e=>{
    e.stopPropagation();refs.toolbar.classList.toggle('open');renderToolbar();
  });
  refs.clearBoardBtn.addEventListener('click',()=>{
    spawned.forEach(n=>n.remove());spawned=[];notify('Board cleared',700);
  });
  refs.openSettingsBtn.addEventListener('click',()=>{
    const show=refs.settingsPanel.style.display!=='block';
    refs.settingsPanel.style.display=show?'block':'none';
    if(show) renderAchievements();
  });
  refs.settingsPanel.addEventListener('click',e=>{
    if(e.target.id==='toggleSound'){toggleAmbient();}
  });
  document.addEventListener('click',e=>{
    if(isDragging)return;
    if(!refs.toolbar.contains(e.target)&&e.target!==refs.openToolbarBtn)
      refs.toolbar.classList.remove('open');
  });
  refs.search.addEventListener('input',renderToolbar);
  refs.category.addEventListener('change',renderToolbar);

  document.addEventListener('pointerdown',()=>initAudio(),{once:true});
  renderToolbar(); renderAchievements();

  window.chemicraft={spawnNode,renderToolbar,renderAchievements,applyRecipe};
})();
