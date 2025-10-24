/* data.js — Chemicraft Stable v1
   Contains base elements, unlock system, and beginner recipes
   Must load before logic.js
*/

// ===== Global Data =====
window.items = [
  // --- Starter Elements (Unlocked) ---
  { sym: "H", name: "Hydrogen", category: "Element", emoji: "⚪", unlocked: true },
  { sym: "O", name: "Oxygen", category: "Element", emoji: "🔵", unlocked: true },
  { sym: "C", name: "Carbon", category: "Element", emoji: "⚫", unlocked: true },
  { sym: "N", name: "Nitrogen", category: "Element", emoji: "🟣", unlocked: true },
  { sym: "Fire", name: "Fire", category: "Energy", emoji: "🔥", unlocked: true },
  { sym: "Air", name: "Air", category: "Energy", emoji: "💨", unlocked: true },

  // --- Locked Elements ---
  { sym: "Na", name: "Sodium", category: "Element", emoji: "⚪", unlocked: false },
  { sym: "Cl", name: "Chlorine", category: "Element", emoji: "🟢", unlocked: false },
  { sym: "Fe", name: "Iron", category: "Element", emoji: "⚙️", unlocked: false },
  { sym: "Au", name: "Gold", category: "Element", emoji: "🟡", unlocked: false },
  { sym: "Ag", name: "Silver", category: "Element", emoji: "⚪", unlocked: false },
  { sym: "S", name: "Sulfur", category: "Element", emoji: "🟠", unlocked: false },
  { sym: "Si", name: "Silicon", category: "Element", emoji: "🪨", unlocked: false },
  { sym: "Cu", name: "Copper", category: "Element", emoji: "🟤", unlocked: false },
  { sym: "Zn", name: "Zinc", category: "Element", emoji: "⚪", unlocked: false },

  // --- Compounds (Discovered later) ---
  { sym: "H2O", name: "Water", category: "Compound", emoji: "💧", unlocked: false },
  { sym: "CO2", name: "Carbon Dioxide", category: "Compound", emoji: "🌫️", unlocked: false },
  { sym: "NaCl", name: "Salt", category: "Compound", emoji: "🧂", unlocked: false },
  { sym: "FeO", name: "Iron Oxide", category: "Compound", emoji: "🟥", unlocked: false },
  { sym: "H2", name: "Hydrogen Gas", category: "Compound", emoji: "💨", unlocked: false },
  { sym: "O2", name: "Oxygen Gas", category: "Compound", emoji: "💨", unlocked: false },
  { sym: "SO2", name: "Sulfur Dioxide", category: "Compound", emoji: "🌋", unlocked: false },
  { sym: "Energy", name: "Energy", category: "Energy", emoji: "⚡", unlocked: false },
  { sym: "Steam", name: "Steam", category: "Compound", emoji: "🌫️", unlocked: false },
];

// ===== Recipes =====
window.recipes = [
  // --- Basic Chemistry ---
  { inputs: ["H", "H"], output: "H2" },
  { inputs: ["O", "O"], output: "O2" },
  { inputs: ["H", "O"], output: "H2O" },
  { inputs: ["C", "O2"], output: "CO2" },
  { inputs: ["Na", "Cl"], output: "NaCl" },
  { inputs: ["Fe", "O"], output: "FeO" },
  { inputs: ["S", "O2"], output: "SO2" },

  // --- Fun / Sandbox Reactions ---
  { inputs: ["Fire", "Air"], output: "Energy" },
  { inputs: ["H2O", "Energy"], output: "Steam" },
  { inputs: ["C", "Energy"], output: "Fire" },
  { inputs: ["O2", "Fire"], output: "CO2" },
];

// ===== Save / Load Unlocks =====
window.saveUnlocks = function() {
  try {
    const unlocked = items.filter(i => i.unlocked).map(i => i.sym);
    localStorage.setItem("chemicraft_unlocks", JSON.stringify(unlocked));
  } catch (e) { console.warn("Save failed", e); }
};

window.loadUnlocks = function() {
  try {
    const data = JSON.parse(localStorage.getItem("chemicraft_unlocks") || "[]");
    items.forEach(i => { if (data.includes(i.sym)) i.unlocked = true; });
  } catch (e) { console.warn("Load failed", e); }
};

// Auto-load when script runs
loadUnlocks();
