/* data.js — Chemicraft v3
   Full periodic elements + realistic starter recipes
*/

// ---------- ELEMENTS ----------
const elements = [
  // 1–10
  ["H", "Hydrogen"], ["He", "Helium"], ["Li", "Lithium"], ["Be", "Beryllium"], ["B", "Boron"],
  ["C", "Carbon"], ["N", "Nitrogen"], ["O", "Oxygen"], ["F", "Fluorine"], ["Ne", "Neon"],
  // 11–20
  ["Na", "Sodium"], ["Mg", "Magnesium"], ["Al", "Aluminum"], ["Si", "Silicon"], ["P", "Phosphorus"],
  ["S", "Sulfur"], ["Cl", "Chlorine"], ["Ar", "Argon"], ["K", "Potassium"], ["Ca", "Calcium"],
  // 21–30
  ["Sc", "Scandium"], ["Ti", "Titanium"], ["V", "Vanadium"], ["Cr", "Chromium"], ["Mn", "Manganese"],
  ["Fe", "Iron"], ["Co", "Cobalt"], ["Ni", "Nickel"], ["Cu", "Copper"], ["Zn", "Zinc"],
  // 31–40
  ["Ga", "Gallium"], ["Ge", "Germanium"], ["As", "Arsenic"], ["Se", "Selenium"], ["Br", "Bromine"],
  ["Kr", "Krypton"], ["Rb", "Rubidium"], ["Sr", "Strontium"], ["Y", "Yttrium"], ["Zr", "Zirconium"],
  // 41–50
  ["Nb", "Niobium"], ["Mo", "Molybdenum"], ["Tc", "Technetium"], ["Ru", "Ruthenium"], ["Rh", "Rhodium"],
  ["Pd", "Palladium"], ["Ag", "Silver"], ["Cd", "Cadmium"], ["In", "Indium"], ["Sn", "Tin"],
  // 51–60
  ["Sb", "Antimony"], ["Te", "Tellurium"], ["I", "Iodine"], ["Xe", "Xenon"], ["Cs", "Cesium"],
  ["Ba", "Barium"], ["La", "Lanthanum"], ["Ce", "Cerium"], ["Pr", "Praseodymium"], ["Nd", "Neodymium"],
  // 61–70
  ["Pm", "Promethium"], ["Sm", "Samarium"], ["Eu", "Europium"], ["Gd", "Gadolinium"], ["Tb", "Terbium"],
  ["Dy", "Dysprosium"], ["Ho", "Holmium"], ["Er", "Erbium"], ["Tm", "Thulium"], ["Yb", "Ytterbium"],
  // 71–80
  ["Lu", "Lutetium"], ["Hf", "Hafnium"], ["Ta", "Tantalum"], ["W", "Tungsten"], ["Re", "Rhenium"],
  ["Os", "Osmium"], ["Ir", "Iridium"], ["Pt", "Platinum"], ["Au", "Gold"], ["Hg", "Mercury"],
  // 81–90
  ["Tl", "Thallium"], ["Pb", "Lead"], ["Bi", "Bismuth"], ["Po", "Polonium"], ["At", "Astatine"],
  ["Rn", "Radon"], ["Fr", "Francium"], ["Ra", "Radium"], ["Ac", "Actinium"], ["Th", "Thorium"],
  // 91–100
  ["Pa", "Protactinium"], ["U", "Uranium"], ["Np", "Neptunium"], ["Pu", "Plutonium"], ["Am", "Americium"],
  ["Cm", "Curium"], ["Bk", "Berkelium"], ["Cf", "Californium"], ["Es", "Einsteinium"], ["Fm", "Fermium"],
  // 101–118
  ["Md", "Mendelevium"], ["No", "Nobelium"], ["Lr", "Lawrencium"], ["Rf", "Rutherfordium"], ["Db", "Dubnium"],
  ["Sg", "Seaborgium"], ["Bh", "Bohrium"], ["Hs", "Hassium"], ["Mt", "Meitnerium"], ["Ds", "Darmstadtium"],
  ["Rg", "Roentgenium"], ["Cn", "Copernicium"], ["Nh", "Nihonium"], ["Fl", "Flerovium"], ["Mc", "Moscovium"],
  ["Lv", "Livermorium"], ["Ts", "Tennessine"], ["Og", "Oganesson"]
];

// ---------- STARTERS ----------
const starterUnlocked = ["H", "O", "C", "N", "Fire"];

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

// Environmental (simple base “gamey” elements)
items.push({ sym: "Fire", name: "Fire", emoji: "🔥", category: "Environmental", unlocked: true });
items.push({ sym: "Air", name: "Air", emoji: "💨", category: "Environmental", unlocked: true });
items.push({ sym: "Earth", name: "Earth", emoji: "🌍", category: "Environmental", unlocked: false });
items.push({ sym: "Water", name: "Water", emoji: "💧", category: "Environmental", unlocked: false });

// ---------- BASIC COMPOUNDS ----------
const baseCompounds = [
  ["H2O", "Water", "💧"],
  ["CO2", "Carbon Dioxide", "🌫️"],
  ["O2", "Oxygen Gas", "🫧"],
  ["NH3", "Ammonia", "💨"],
  ["CH4", "Methane", "🔥"],
  ["NaCl", "Salt", "🧂"],
  ["H2", "Hydrogen Gas", "💨"],
  ["Rust", "Rust", "🟫"],
  ["Steam", "Steam", "☁️"],
  ["Explosion", "Explosion", "💥"],
];
for (const [sym, name, emoji] of baseCompounds) {
  items.push({ sym, name, emoji, category: "Compounds", unlocked: true });
}

// ---------- RECIPES ----------
const recipes = [
  // element combos
  { inputs: ["H", "H"], output: "H2" },
  { inputs: ["H", "O"], output: "H2O" },
  { inputs: ["C", "O"], output: "CO2" },
  { inputs: ["N", "H"], output: "NH3" },
  { inputs: ["C", "H"], output: "CH4" },
  { inputs: ["Na", "Cl"], output: "NaCl" },
  { inputs: ["Fe", "O"], output: "Rust" },
  // environment combos
  { inputs: ["H2O", "Fire"], output: "Steam" },
  { inputs: ["Fire", "O2"], output: "Explosion" },
  { inputs: ["Earth", "Water"], output: "Mud" }
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
    items.forEach(it => it.unlocked = data.includes(it.sym));
  } catch (e) { console.warn("Load failed:", e); }
}

// Load saved unlocks at start
loadUnlocks();
