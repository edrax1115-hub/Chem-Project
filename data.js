/* data.js — Chemicraft v2 base data */

const items = [
  // === Starter Elements ===
  { sym: "H", name: "Hydrogen", emoji: "🟦", category: "Elements", unlocked: true },
  { sym: "O", name: "Oxygen", emoji: "🌬️", category: "Elements", unlocked: true },
  { sym: "Fire", name: "Fire", emoji: "🔥", category: "Elements", unlocked: true },
  // === Locked Compounds (discovered via play) ===
  { sym: "H2O", name: "Water", emoji: "💧", category: "Compounds", unlocked: false },
  { sym: "O2", name: "Oxygen Gas", emoji: "🫧", category: "Compounds", unlocked: false },
  { sym: "Steam", name: "Steam", emoji: "🌫️", category: "Compounds", unlocked: false },
  { sym: "Explosion", name: "Explosion", emoji: "💥", category: "Compounds", unlocked: false }
];

// === Recipes ===
// Basic combinations — realistic but simple for now
const recipes = [
  { inputs: ["H", "O"], output: "H2O" },
  { inputs: ["H2O", "Fire"], output: "Steam" },
  { inputs: ["O", "O"], output: "O2" },
  { inputs: ["Fire", "O2"], output: "Explosion" }
];

// === Save System ===
function saveUnlocks() {
  try {
    const unlocked = items.filter(i => i.unlocked).map(i => i.sym);
    localStorage.setItem('chemicraft_unlocks', JSON.stringify(unlocked));
  } catch (e) { console.warn('Save failed:', e); }
}

function loadUnlocks() {
  try {
    const data = JSON.parse(localStorage.getItem('chemicraft_unlocks') || '[]');
    items.forEach(it => it.unlocked = data.includes(it.sym));
  } catch (e) { console.warn('Load failed:', e); }
}

// Load saved unlocks on start
loadUnlocks();
