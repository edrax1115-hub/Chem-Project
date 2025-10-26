// data.js — Chemicraft database

const items = [
  // --- Elements ---
  { sym:"H", emoji:"🟦", name:"Hydrogen", category:"Elements", unlocked:false },
  { sym:"O", emoji:"🌬️", name:"Oxygen", category:"Elements", unlocked:false },
  { sym:"C", emoji:"🪨", name:"Carbon", category:"Elements", unlocked:false },
  { sym:"N", emoji:"🌫️", name:"Nitrogen", category:"Elements", unlocked:false },
  { sym:"Na", emoji:"⚡", name:"Sodium", category:"Elements", unlocked:false },
  { sym:"Cl", emoji:"☣️", name:"Chlorine", category:"Elements", unlocked:false },
  { sym:"Fe", emoji:"🧲", name:"Iron", category:"Elements", unlocked:false },
  { sym:"S", emoji:"🟨", name:"Sulfur", category:"Elements", unlocked:false },
  { sym:"Ca", emoji:"🤍", name:"Calcium", category:"Elements", unlocked:false },
  { sym:"K", emoji:"💜", name:"Potassium", category:"Elements", unlocked:false },

  // --- Environmental ---
  { sym:"Air", emoji:"💨", name:"Air", category:"Environmental", unlocked:true },
  { sym:"Fire", emoji:"🔥", name:"Fire", category:"Environmental", unlocked:true },
  { sym:"Earth", emoji:"🌍", name:"Earth", category:"Environmental", unlocked:true },
  { sym:"Water", emoji:"💧", name:"Water", category:"Environmental", unlocked:true },

  // --- Compounds ---
  { sym:"H2O", emoji:"💧", name:"Water", category:"Compounds", unlocked:false },
  { sym:"CO2", emoji:"🌫️", name:"Carbon Dioxide", category:"Compounds", unlocked:false },
  { sym:"NaCl", emoji:"🧂", name:"Salt", category:"Compounds", unlocked:false },
  { sym:"NH3", emoji:"💨", name:"Ammonia", category:"Compounds", unlocked:false },
  { sym:"CH4", emoji:"🔥", name:"Methane", category:"Compounds", unlocked:false },
  { sym:"Fe2O3", emoji:"🟤", name:"Rust", category:"Compounds", unlocked:false },
  { sym:"H2SO4", emoji:"🧪", name:"Sulfuric Acid", category:"Compounds", unlocked:false },
  { sym:"CaCO3", emoji:"🏔️", name:"Limestone", category:"Compounds", unlocked:false },
  { sym:"NaOH", emoji:"🧴", name:"Sodium Hydroxide", category:"Compounds", unlocked:false },
  { sym:"KCl", emoji:"🧂", name:"Potassium Chloride", category:"Compounds", unlocked:false },
];

const recipes = [
  // Basic chemistry
  { inputs:["H","O"], output:"H2O" },
  { inputs:["C","O"], output:"CO2" },
  { inputs:["Na","Cl"], output:"NaCl" },
  { inputs:["Fe","O"], output:"Fe2O3" },
  { inputs:["N","H"], output:"NH3" },
  { inputs:["C","H"], output:"CH4" },
  { inputs:["S","O"], output:"H2SO4" },
  { inputs:["Ca","C"], output:"CaCO3" },
  { inputs:["Na","H2O"], output:"NaOH" },
  { inputs:["K","Cl"], output:"KCl" },

  // Environmental fun
  { inputs:["Fire","Water"], output:"Steam" },
  { inputs:["Water","Earth"], output:"Mud" },
  { inputs:["Air","Fire"], output:"Smoke" },
];

const STORAGE_KEY = "chemicraft_unlocks_v2";
function loadUnlocks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const unlocked = JSON.parse(raw);
    items.forEach(i => { if (unlocked.includes(i.sym)) i.unlocked = true; });
  } catch (e) { console.warn("loadUnlocks failed", e); }
}
function saveUnlocks() {
  try {
    const unlocked = items.filter(i => i.unlocked).map(i => i.sym);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked));
  } catch (e) { console.warn("saveUnlocks failed", e); }
}
loadUnlocks();
