/* data.js — items, recipes, persistence */

// items: symbol, emoji, name, category, unlocked (boolean)
const baseItems = [
  { sym: "H", emoji: "🟦", name: "Hydrogen", category: "Elements" },
  { sym: "O", emoji: "🌬️", name: "Oxygen", category: "Elements" },
  { sym: "N", emoji: "🌫️", name: "Nitrogen", category: "Elements" },
  { sym: "C", emoji: "🪨", name: "Carbon", category: "Elements" },
  { sym: "Na", emoji: "⚡", name: "Sodium", category: "Elements" },
  { sym: "Cl", emoji: "☣️", name: "Chlorine", category: "Elements" },
  { sym: "Fe", emoji: "🛠️", name: "Iron", category: "Elements" },
  { sym: "S", emoji: "🟨", name: "Sulfur", category: "Elements" },

  // environmental
  { sym: "Air", emoji: "💨", name: "Air", category: "Environmental", unlocked: true },
  { sym: "Fire", emoji: "🔥", name: "Fire", category: "Environmental", unlocked: true },

  // compounds initially locked
  { sym: "H2O", emoji: "💧", name: "Water", category: "Compounds", unlocked: false },
  { sym: "CO2", emoji: "🌫️", name: "Carbon Dioxide", category: "Compounds", unlocked: false },
  { sym: "NaCl", emoji: "🧂", name: "Salt", category: "Compounds", unlocked: false },
  { sym: "NH3", emoji: "💨", name: "Ammonia", category: "Compounds", unlocked: false },
  { sym: "CH4", emoji: "🔥", name: "Methane", category: "Compounds", unlocked: false },
  { sym: "Saltwater", emoji: "🌊", name: "Saltwater", category: "Compounds", unlocked: false },
  { sym: "Steam", emoji: "☁️", name: "Steam", category: "Compounds", unlocked: false },
  { sym: "Rust", emoji: "🟫", name: "Rust", category: "Compounds", unlocked: false }
];

// starter unlocked
const starterUnlocked = ["H","O","N","C","Na","Cl","Air","Fire","Fe","S"];

// items used by logic
const items = baseItems.map(it => ({ ...it, unlocked: !!it.unlocked || starterUnlocked.includes(it.sym) }));

// recipes (inputs array, output symbol)
const recipes = [
  { inputs: ["H","O"], output: "H2O" },
  { inputs: ["C","O"], output: "CO2" },
  { inputs: ["Na","Cl"], output: "NaCl" },
  { inputs: ["N","H"], output: "NH3" },
  { inputs: ["C","H"], output: "CH4" },
  { inputs: ["NaCl","H2O"], output: "Saltwater" },
  { inputs: ["H2O","Fire"], output: "Steam" },
  { inputs: ["Fe","O"], output: "Rust" }
];

// local storage key
const STORAGE_KEY = "chemicraft_unlocks_v2";

function loadUnlocks(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    items.forEach(it => { it.unlocked = arr.includes(it.sym) || !!it.unlocked; });
  }catch(e){ console.warn("loadUnlocks failed", e); }
}
function saveUnlocks(){
  try{
    const arr = items.filter(i => i.unlocked).map(i => i.sym);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }catch(e){ console.warn("saveUnlocks failed", e); }
}

// load on script import
loadUnlocks();