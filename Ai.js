/* ai.js — Hybrid AI system for Chemicraft
   Works offline with smart chemistry logic,
   and supports online expansion via a future API endpoint.
*/

(() => {
  // ====== CONFIG ======
  const ONLINE_AI_ENABLED = false; // set true when you connect to your own API endpoint
  const AI_ENDPOINT = "https://your-api-endpoint.com/combine"; // placeholder

  // ====== BASIC CHEMICAL RULES ======
  const elementProps = {
    H: "Hydrogen",
    O: "Oxygen",
    N: "Nitrogen",
    C: "Carbon",
    Na: "Sodium",
    Cl: "Chlorine",
    Fe: "Iron",
    S: "Sulfur",
    K: "Potassium",
    Ca: "Calcium",
    Mg: "Magnesium",
    Cu: "Copper",
    Zn: "Zinc",
  };

  const knownReactions = [
    { inputs: ["H", "O"], output: "H2O", name: "Water" },
    { inputs: ["C", "O"], output: "CO2", name: "Carbon Dioxide" },
    { inputs: ["Na", "Cl"], output: "NaCl", name: "Salt" },
    { inputs: ["N", "H"], output: "NH3", name: "Ammonia" },
    { inputs: ["Fe", "O"], output: "Fe2O3", name: "Rust" },
    { inputs: ["Na", "H2O"], output: "NaOH + H2", name: "Sodium Hydroxide" },
    { inputs: ["H2O", "CO2"], output: "H2CO3", name: "Carbonic Acid" },
    { inputs: ["Ca", "CO2"], output: "CaCO3", name: "Calcium Carbonate" },
    { inputs: ["C", "H"], output: "CH4", name: "Methane" },
  ];

  // ====== OFFLINE GENERATION ======
  function generateOfflineReaction(a, b) {
    // Check known reactions first
    for (const r of knownReactions) {
      if (r.inputs.includes(a) && r.inputs.includes(b)) return r;
    }

    // Otherwise, make a plausible or fantasy chemistry compound
    const elemA = elementProps[a] || a;
    const elemB = elementProps[b] || b;

    // Randomly choose between plausible formula or fantasy combo
    if (Math.random() < 0.6) {
      const formula = `${a}${b}${Math.floor(Math.random() * 3) + 1}`;
      const name = `${elemA}-${elemB} Compound`;
      return { inputs: [a, b], output: formula, name };
    } else {
      const weird = [
        "Plasma Crystal",
        "Quantum Dust",
        "Synthetic Gas",
        "Nano Sludge",
        "Hyperoxide",
      ];
      return {
        inputs: [a, b],
        output: `${a}${b}`,
        name: weird[Math.floor(Math.random() * weird.length)],
      };
    }
  }

  // ====== ONLINE FETCH (Optional Future Use) ======
  async function generateOnlineReaction(a, b) {
    try {
      const res = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ a, b }),
      });
      if (!res.ok) throw new Error("Bad response");
      const data = await res.json();
      if (data.output) {
        return { inputs: [a, b], output: data.output, name: data.name || data.output };
      }
    } catch (e) {
      console.warn("Online AI failed, using offline fallback:", e);
      return generateOfflineReaction(a, b);
    }
  }

  // ====== PUBLIC INTERFACE ======
  async function getReaction(a, b) {
    if (ONLINE_AI_ENABLED) {
      return await generateOnlineReaction(a, b);
    } else {
      return generateOfflineReaction(a, b);
    }
  }

  // Hook into Chemicraft logic
  if (!window.chemicraft) window.chemicraft = {};
  window.chemicraft.getReaction = getReaction;

  console.log("Chemicraft AI module loaded (Hybrid mode).");
})();
