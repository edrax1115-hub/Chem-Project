/* data.js — Chemicraft data core
   Exposes global arrays: items, recipes, and functions saveUnlocks/loadUnlocks, resetUnlocks
*/

// Starter unlocks
const STARTER_UNLOCKS = ["H","O","C","N","Fire","Air"];

// Elements & base items (visible but locked unless unlocked)
window.items = [
  // Elements (common subset)
  { sym:"H", name:"Hydrogen", emoji:"🧪", category:"Elements", unlocked: STARTER_UNLOCKS.includes("H") },
  { sym:"He", name:"Helium", emoji:"🟦", category:"Elements", unlocked:false },
  { sym:"Li", name:"Lithium", emoji:"🔋", category:"Elements", unlocked:false },
  { sym:"Be", name:"Beryllium", emoji:"⚙️", category:"Elements", unlocked:false },
  { sym:"B",  name:"Boron", emoji:"🔶", category:"Elements", unlocked:false },
  { sym:"C",  name:"Carbon", emoji:"🪨", category:"Elements", unlocked: STARTER_UNLOCKS.includes("C") },
  { sym:"N",  name:"Nitrogen", emoji:"🌫️", category:"Elements", unlocked: STARTER_UNLOCKS.includes("N") },
  { sym:"O",  name:"Oxygen", emoji:"🌬️", category:"Elements", unlocked: STARTER_UNLOCKS.includes("O") },
  { sym:"F",  name:"Fluorine", emoji:"🟢", category:"Elements", unlocked:false },
  { sym:"Na", name:"Sodium", emoji:"🧂", category:"Elements", unlocked:false },
  { sym:"Mg", name:"Magnesium", emoji:"✨", category:"Elements", unlocked:false },
  { sym:"Al", name:"Aluminum", emoji:"⚪", category:"Elements", unlocked:false },
  { sym:"Si", name:"Silicon", emoji:"💎", category:"Elements", unlocked:false },
  { sym:"P",  name:"Phosphorus", emoji:"🟠", category:"Elements", unlocked:false },
  { sym:"S",  name:"Sulfur", emoji:"🌋", category:"Elements", unlocked:false },
  { sym:"Cl", name:"Chlorine", emoji:"☣️", category:"Elements", unlocked:false },
  { sym:"K",  name:"Potassium", emoji:"🧨", category:"Elements", unlocked:false },
  { sym:"Ca", name:"Calcium", emoji:"⚙️", category:"Elements", unlocked:false },
  { sym:"Fe", name:"Iron", emoji:"🛠️", category:"Elements", unlocked:false },
  { sym:"Cu", name:"Copper", emoji:"🟤", category:"Elements", unlocked:false },
  { sym:"Zn", name:"Zinc", emoji:"⚙️", category:"Elements", unlocked:false },
  { sym:"Ag", name:"Silver", emoji:"🥈", category:"Elements", unlocked:false },
  { sym:"Au", name:"Gold", emoji:"🪙", category:"Elements", unlocked:false },

  // Environmental / game items
  { sym:"Air", name:"Air", emoji:"💨", category:"Environmental", unlocked: STARTER_UNLOCKS.includes("Air") },
  { sym:"Fire", name:"Fire", emoji:"🔥", category:"Environmental", unlocked: STARTER_UNLOCKS.includes("Fire") },
  { sym:"Earth", name:"Earth", emoji:"🌍", category:"Environmental", unlocked:false },
  { sym:"Water", name:"Water (env)", emoji:"💧", category:"Environmental", unlocked:false },

  // Compounds (locked by default)
  { sym:"H2", name:"Hydrogen Gas", emoji:"💨", category:"Compounds", unlocked:false },
  { sym:"O2", name:"Oxygen Gas", emoji:"🫧", category:"Compounds", unlocked:false },
  { sym:"H2O", name:"Water (compound)", emoji:"💧", category:"Compounds", unlocked:false },
  { sym:"CO2", name:"Carbon Dioxide", emoji:"🌫️", category:"Compounds", unlocked:false },
  { sym:"NaCl", name:"Salt", emoji:"🧂", category:"Compounds", unlocked:false },
  { sym:"NH3", name:"Ammonia", emoji:"🧪", category:"Compounds", unlocked:false },
  { sym:"CH4", name:"Methane", emoji:"🔥", category:"Compounds", unlocked:false },
  { sym:"Rust", name:"Rust (Iron Oxide)", emoji:"🟫", category:"Compounds", unlocked:false },
  { sym:"Steam", name:"Steam", emoji:"☁️", category:"Compounds", unlocked:false },
  { sym:"SaltWater", name:"Salt Water", emoji:"🌊", category:"Compounds", unlocked:false },
  { sym:"Glass", name:"Glass", emoji:"🔹", category:"Compounds", unlocked:false },
  { sym:"Stone", name:"Stone", emoji:"🪨", category:"Compounds", unlocked:false },
  { sym:"Clay", name:"Clay", emoji:"🟤", category:"Compounds", unlocked:false },
  { sym:"Plant", name:"Plant", emoji:"🌱", category:"Compounds", unlocked:false },
  { sym:"Life", name:"Life", emoji:"🧬", category:"Compounds", unlocked:false }
];

// Recipes (order-insensitive inputs -> output)
window.recipes = [
  { inputs:["H","H"], output:"H2" },
  { inputs:["O","O"], output:"O2" },
  { inputs:["H","O"], output:"H2O" },
  { inputs:["C","O2"], output:"CO2" },
  { inputs:["Na","Cl"], output:"NaCl" },
  { inputs:["N","H"], output:"NH3" },
  { inputs:["C","H"], output:"CH4" },
  { inputs:["Fe","O"], output:"Rust" },

  // environmental / gamey
  { inputs:["H2O","Fire"], output:"Steam" },
  { inputs:["NaCl","H2O"], output:"SaltWater" },
  { inputs:["Sand","Fire"], output:"Glass" }, // Sand could be created later
  { inputs:["Earth","Water"], output:"Clay" },
  { inputs:["Clay","Fire"], output:"Stone" },
  { inputs:["Water","Earth"], output:"Plant" },
  { inputs:["Plant","Energy"], output:"Life" }, // Energy is game item maybe created from Fire+Air
  { inputs:["Fire","Air"], output:"Energy" }
];

// Save/load unlocks
const STORAGE_KEY_UNLOCKS = "chemicraft_unlocks_v1";
window.saveUnlocks = function(){
  try{
    const arr = window.items.filter(i=>i.unlocked).map(i=>i.sym);
    localStorage.setItem(STORAGE_KEY_UNLOCKS, JSON.stringify(arr));
  }catch(e){ console.warn("saveUnlocks failed", e); }
};
window.loadUnlocks = function(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY_UNLOCKS);
    if (!raw) return;
    const arr = JSON.parse(raw);
    window.items.forEach(it => { it.unlocked = arr.includes(it.sym) || STARTER_UNLOCKS.includes(it.sym); });
  }catch(e){ console.warn("loadUnlocks failed", e); }
};
window.resetUnlocks = function(){
  try{
    window.items.forEach(it => { it.unlocked = STARTER_UNLOCKS.includes(it.sym); });
    localStorage.removeItem(STORAGE_KEY_UNLOCKS);
  }catch(e){ console.warn("resetUnlocks failed", e); }
};

// load on script run
window.loadUnlocks();
