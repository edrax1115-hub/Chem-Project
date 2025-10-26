/* data.js — Chemicraft Database (Elements + Recipes) */

// ===== Elements =====
const items = [
  // --- Starter Elements (Unlocked) ---
  { sym: "H", name: "Hydrogen", emoji: "💧", category: "Elements", unlocked: true },
  { sym: "O", name: "Oxygen", emoji: "🌬️", category: "Elements", unlocked: true },
  { sym: "C", name: "Carbon", emoji: "🪵", category: "Elements", unlocked: true },
  { sym: "N", name: "Nitrogen", emoji: "🌫️", category: "Elements", unlocked: true },
  { sym: "Na", name: "Sodium", emoji: "🧂", category: "Elements", unlocked: true },
  { sym: "Cl", name: "Chlorine", emoji: "☣️", category: "Elements", unlocked: true },

  // --- Discoverable Elements ---
  { sym: "Fe", name: "Iron", emoji: "⚙️", category: "Elements", unlocked: false },
  { sym: "S", name: "Sulfur", emoji: "🌋", category: "Elements", unlocked: false },
  { sym: "Ca", name: "Calcium", emoji: "🦴", category: "Elements", unlocked: false },
  { sym: "K", name: "Potassium", emoji: "🍌", category: "Elements", unlocked: false },
  { sym: "P", name: "Phosphorus", emoji: "✨", category: "Elements", unlocked: false },
  { sym: "Si", name: "Silicon", emoji: "💠", category: "Elements", unlocked: false },
  { sym: "Mg", name: "Magnesium", emoji: "⚡", category: "Elements", unlocked: false },

  // --- Starter Category 2: Common Compounds (Locked) ---
  { sym: "H2O", name: "Water", emoji: "💦", category: "Compounds", unlocked: false },
  { sym: "CO2", name: "Carbon Dioxide", emoji: "💨", category: "Compounds", unlocked: false },
  { sym: "NaCl", name: "Salt", emoji: "🧂", category: "Compounds", unlocked: false },
  { sym: "NH3", name: "Ammonia", emoji: "💨", category: "Compounds", unlocked: false },
  { sym: "CH4", name: "Methane", emoji: "🔥", category: "Compounds", unlocked: false },
  { sym: "H2SO4", name: "Sulfuric Acid", emoji: "🧪", category: "Compounds", unlocked: false },
  { sym: "Fe2O3", name: "Iron Oxide", emoji: "🧱", category: "Compounds", unlocked: false },
  { sym: "CaCO3", name: "Calcium Carbonate", emoji: "🪨", category: "Compounds", unlocked: false },
  { sym: "SiO2", name: "Silicon Dioxide", emoji: "🔮", category: "Compounds", unlocked: false },
];

// ===== Recipes =====
const recipes = [
  // --- Basic Reactions ---
  { inputs: ["H", "O"], output: "H2O" },
  { inputs: ["C", "O"], output: "CO2" },
  { inputs: ["Na", "Cl"], output: "NaCl" },
  { inputs: ["N", "H"], output: "NH3" },
  { inputs: ["C", "H"], output: "CH4" },
  { inputs: ["H2O", "C"], output: "CH4" },
  { inputs: ["Fe", "O"], output: "Fe2O3" },
  { inputs: ["Ca", "C"], output: "CaCO3" },
  { inputs: ["Si", "O"], output: "SiO2" },
  { inputs: ["S", "O"], output: "H2SO4" },

  // --- Creative / Fun Combos ---
  { inputs: ["H2O", "Na"], output: "NaOH" },
  { inputs: ["NaCl", "H2O"], output: "SaltWater" },
  { inputs: ["CH4", "O"], output: "CO2" },
  { inputs: ["NH3", "H2O"], output: "NH4OH" },
  { inputs: ["CO2", "H2O"], output: "H2CO3" },
  { inputs: ["SiO2", "Na"], output: "Glass" },
  { inputs: ["Fe", "C"], output: "Steel" },
  { inputs: ["C", "O", "H"], output: "OrganicCompound" },
  { inputs: ["CaCO3", "Heat"], output: "CO2" },
  { inputs: ["NaOH", "HCl"], output: "H2O" },
];

// ===== Save/Load =====
function saveUnlocks() {
  const unlocked = items.filter(i => i.unlocked).map(i => i.sym);
  localStorage.setItem("chemicraft_unlocks", JSON.stringify(unlocked));
}

function loadUnlocks() {
  try {
    const unlocked = JSON.parse(localStorage.getItem("chemicraft_unlocks")) || [];
    items.forEach(i => {
      i.unlocked = unlocked.includes(i.sym);
    });
  } catch (e) {
    console.warn("Failed to load unlocks", e);
  }
}

// Load unlocks on start
loadUnlocks();
