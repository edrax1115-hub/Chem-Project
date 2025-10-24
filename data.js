/* data.js — Chemicraft v4
   Full periodic table (visible but locked), expanded combinations
*/

// ---------- ELEMENTS ----------
const elements = [
  // Grouped by category
  ["H", "Hydrogen"], ["He", "Helium"], ["Li", "Lithium"], ["Be", "Beryllium"], ["B", "Boron"],
  ["C", "Carbon"], ["N", "Nitrogen"], ["O", "Oxygen"], ["F", "Fluorine"], ["Ne", "Neon"],
  ["Na", "Sodium"], ["Mg", "Magnesium"], ["Al", "Aluminum"], ["Si", "Silicon"], ["P", "Phosphorus"],
  ["S", "Sulfur"], ["Cl", "Chlorine"], ["Ar", "Argon"], ["K", "Potassium"], ["Ca", "Calcium"],
  ["Fe", "Iron"], ["Cu", "Copper"], ["Zn", "Zinc"], ["Ag", "Silver"], ["Au", "Gold"],
  ["Pb", "Lead"], ["Hg", "Mercury"], ["U", "Uranium"], ["Pt", "Platinum"], ["Ni", "Nickel"],
  ["Sn", "Tin"], ["I", "Iodine"], ["Br", "Bromine"], ["Si", "Silicon"], ["Ti", "Titanium"],
  ["Cr", "Chromium"], ["Mn", "Manganese"], ["Co", "Cobalt"], ["V", "Vanadium"], ["W", "Tungsten"]
];

// ---------- STARTER UNLOCKS ----------
const starterUnlocked = ["H", "O", "C", "N", "Fire", "Air"];

// ---------- BASE ITEMS ----------
const items = [];

// Elements
for (const [sym, name] of elements) {
  items.push({
    sym,
    name,
    emoji: "⚪",
    category: "Elements",
    unlocked: starterUnlocked.includes(sym)
  });
}

// Environmental
items.push({ sym: "Fire", name: "Fire", emoji: "🔥", category: "Environmental", unlocked: true });
items.push({ sym: "Air", name: "Air", emoji: "💨", category: "Environmental", unlocked: true });
items.push({ sym: "Earth", name: "Earth", emoji: "🌍", category: "Environmental", unlocked: false });
items.push({ sym: "Water", name: "Water", emoji: "💧", category: "Environmental", unlocked: false });
items.push({ sym: "Energy", name: "Energy", emoji: "⚡", category: "Force", unlocked: false });

// ---------- BASIC COMPOUNDS ----------
const baseCompounds = [
  ["H2", "Hydrogen Gas", "💨"],
  ["O2", "Oxygen Gas", "🫧"],
  ["H2O", "Water", "💧"],
  ["CO2", "Carbon Dioxide", "🌫️"],
  ["NH3", "Ammonia", "💨"],
  ["CH4", "Methane", "🔥"],
  ["NaCl", "Salt", "🧂"],
  ["Rust", "Rust", "🟫"],
  ["Steam", "Steam", "☁️"],
  ["Explosion", "Explosion", "💥"],
  ["SaltWater", "Salt Water", "🌊"],
  ["Acid", "Acid", "🧪"],
  ["Glass", "Glass", "🔹"],
  ["Lava", "Lava", "🌋"],
  ["Stone", "Stone", "🪨"],
  ["Sand", "Sand", "🏖️"],
  ["Plant", "Plant", "🌱"],
  ["Life", "Life", "🧬"]
];
for (const [sym, name, emoji] of baseCompounds) {
  items.push({ sym, name, emoji, category: "Compounds", unlocked: false });
}

// ---------- RECIPES ----------
const recipes = [
  // Elemental
  { inputs: ["H", "H"], output: "H2" },
  { inputs: ["O", "O"], output: "O2" },
  { inputs: ["H", "O"], output: "H2O" },
  { inputs: ["C", "O"], output: "CO2" },
  { inputs: ["N", "H"], output: "NH3" },
  { inputs: ["C", "H"], output: "CH4" },
  { inputs: ["Na", "Cl"], output: "NaCl" },
  { inputs: ["Fe", "O"], output: "Rust" },

  // Environmental & physical
  { inputs: ["H2O", "Fire"], output: "Steam" },
  { inputs: ["Fire", "O2"], output: "Explosion" },
  { inputs: ["Earth", "Fire"], output: "Lava" },
  { inputs: ["Lava", "Air"], output: "Stone" },
  { inputs: ["Earth", "Air"], output: "Dust" },
  { inputs: ["Earth", "Water"], output: "Mud" },
  { inputs: ["Mud", "Fire"], output: "Clay" },
  { inputs: ["Clay", "Fire"], output: "Brick" },
  { inputs: ["Sand", "Fire"], output: "Glass" },
  { inputs: ["Water", "NaCl"], output: "SaltWater" },
  { inputs: ["CO2", "H2O"], output: "Acid" },

  // Energy-related
  { inputs: ["Fire", "Air"], output: "Energy" },
  { inputs: ["Energy", "O2"], output: "Plasma" },
  { inputs: ["Energy", "Earth"], output: "Metal" },
  { inputs: ["Energy", "Water"], output: "Electricity" },

  // Life chain
  { inputs: ["Earth", "Water"], output: "Mud" },
  { inputs: ["Mud", "Energy"], output: "Plant" },
  { inputs: ["Plant", "Energy"], output: "Life" },
  { inputs: ["Life", "Fire"], output: "Ash" },
  { inputs: ["Life", "Water"], output: "Bacteria" },
];

// ---------- SAVE SYSTEM ----------
function saveUnlocks() {
  try {
    const unlocked = items.filter(i => i.unlocked).map(i => i.sym);
    localStorage.setItem("chemicraft_unlocks", JSON.stringify(unlocked));
  } catch (e) { console.warn("Save failed:", e); }
}

function loadUnlocks() {
  try {
    const data = JSON.parse(localStorage.getItem("chemicraft_unlocks") || "[]");
    items.forEach(it => it.unlocked = data.includes(it.sym) || starterUnlocked.includes(it.sym));
  } catch (e) { console.warn("Load failed:", e); }
}

// Load saved unlocks
loadUnlocks();
