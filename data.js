/* data.js — Chemicraft Data Core
   Defines elements, compounds, and reactions.
   Phase 2: Adds more combinations (water, fire, air, metal, organic).
*/

// ---- Base items ----
const items = [
  // 🌍 Basic Elements
  { sym: "H", name: "Hydrogen", emoji: "🟦", category: "Elements", unlocked: true },
  { sym: "O", name: "Oxygen", emoji: "🌬️", category: "Elements", unlocked: true },
  { sym: "N", name: "Nitrogen", emoji: "🌫️", category: "Elements", unlocked: true },
  { sym: "C", name: "Carbon", emoji: "🪨", category: "Elements", unlocked: true },
  { sym: "Na", name: "Sodium", emoji: "⚡", category: "Elements", unlocked: true },
  { sym: "Cl", name: "Chlorine", emoji: "☣️", category: "Elements", unlocked: true },
  { sym: "Fe", name: "Iron", emoji: "🪓", category: "Elements", unlocked: true },
  { sym: "S", name: "Sulfur", emoji: "🟨", category: "Elements", unlocked: true },

  // 🌿 Environmentals (basic, gamey)
  { sym: "Air", name: "Air", emoji: "💨", category: "Environmental", unlocked: true },
  { sym: "Fire", name: "Fire", emoji: "🔥", category: "Environmental", unlocked: true },
  { sym: "Earth", name: "Earth", emoji: "🌍", category: "Environmental", unlocked: true },
  { sym: "Water", name: "Water", emoji: "💧", category: "Environmental", unlocked: true },

  // ⚗️ Compounds (locked until discovery)
  { sym: "H2O", name: "Water (Compound)", emoji: "💧", category: "Compounds", unlocked: false },
  { sym: "CO2", name: "Carbon Dioxide", emoji: "🌫️", category: "Compounds", unlocked: false },
  { sym: "O2", name: "Oxygen Gas", emoji: "🌬️", category: "Compounds", unlocked: false },
  { sym: "NaCl", name: "Salt", emoji: "🧂", category: "Compounds", unlocked: false },
  { sym: "NH3", name: "Ammonia", emoji: "💨", category: "Compounds", unlocked: false },
  { sym: "CH4", name: "Methane", emoji: "🔥", category: "Compounds", unlocked: false },
  { sym: "Rust", name: "Rust (Iron Oxide)", emoji: "🟫", category: "Compounds", unlocked: false },
  { sym: "H2SO4", name: "Sulfuric Acid", emoji: "💀", category: "Compounds", unlocked: false },
  { sym: "NaOH", name: "Sodium Hydroxide", emoji: "🧪", category: "Compounds", unlocked: false },
  { sym: "SaltWater", name: "Saltwater", emoji: "🌊", category: "Compounds", unlocked: false },
  { sym: "Steam", name: "Steam", emoji: "☁️", category: "Compounds", unlocked: false },
  { sym: "Organic", name: "Organic Matter", emoji: "🌿", category: "Compounds", unlocked: false },
  { sym: "Life", name: "Life", emoji: "🧬", category: "Compounds", unlocked: false },
  { sym: "Ash", name: "Ash", emoji: "🪶", category: "Compounds", unlocked: false },
];

// ---- Recipes (order-insensitive) ----
const recipes = [
  // Basic chemical & gamey reactions
  { inputs: ["H", "O"], output: "H2O" },            // water
  { inputs: ["O", "O"], output: "O2" },             // oxygen gas
  { inputs: ["C", "O"], output: "CO2" },            // carbon dioxide
  { inputs: ["Na", "Cl"], output: "NaCl" },         // salt
  { inputs: ["N", "H"], output: "NH3" },            // ammonia
  { inputs: ["C", "H"], output: "CH4" },            // methane
  { inputs: ["Fe", "O"], output: "Rust" },          // rust

  // Phase 2 — environment-based combos
  { inputs: ["NaCl", "H2O"], output: "SaltWater" }, // salt + water
  { inputs: ["H2O", "Fire"], output: "Steam" },     // water + fire
  { inputs: ["C", "Fire"], output: "Ash" },         // carbon burns to ash
  { inputs: ["H2O", "Earth"], output: "Organic" },  // water + earth → life base
  { inputs: ["Organic", "Air"], output: "Life" },   // organic + air → life

  // Advanced reaction chain preview (Phase 3 seeds)
  { inputs: ["S", "H2O"], output: "H2SO4" },        // sulfur + water
  { inputs: ["Na", "H2O"], output: "NaOH" },        // sodium + water
];

// ---- Persistence ----
const STORAGE_KEY = "chemicraft_unlocks_v2";

function loadUnlocks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    items.forEach((i) => {
      if (arr.includes(i.sym)) i.unlocked = true;
    });
  } catch (e) {
    console.warn("Failed to load unlocks:", e);
  }
}

function saveUnlocks() {
  try {
    const arr = items.filter((i) => i.unlocked).map((i) => i.sym);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch (e) {
    console.warn("Failed to save unlocks:", e);
  }
}

loadUnlocks();
