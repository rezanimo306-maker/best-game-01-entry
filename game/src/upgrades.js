// upgrades.js — the between-wave upgrade draft: pick 1 of 3, or skip for
// score. Each upgrade stacks up to 3 times; the pool is the game's build
// variety — the choice that makes every run play differently.
// One clear job: what the player can become between waves.
export const UPGRADE_POOL = [
  { id: 'heavy', icon: '◆', name: 'HEAVY ROUNDS', desc: '+1 damage on every bolt. Tanks and bosses melt faster.', max: 3 },
  { id: 'rapid', icon: '≫', name: 'RAPID CYCLER', desc: 'Fire 20% faster. More bolts, more combo.', max: 3 },
  { id: 'twin', icon: '✦', name: 'TWIN CANNONS', desc: '+1 side cannon per stack. A wider wall of fire.', max: 2 },
  { id: 'hull', icon: '▣', name: 'HULL PLATING', desc: '+1 max hull and repair 1 hull right now.', max: 3 },
  { id: 'repair', icon: '+', name: 'FIELD REPAIR', desc: 'Restore 1 hull immediately. Cheap, but it saves runs.', max: 3 },
  { id: 'magnet', icon: '◎', name: 'MAGNET COIL', desc: 'Power-ups drift to you from much farther away.', max: 2 },
  { id: 'nova', icon: '✺', name: 'NOVA CHARGE', desc: 'Nova cores drop far more often from now on.', max: 2 },
  { id: 'overdrive', icon: '↯', name: 'OVERDRIVE', desc: 'Combo lasts +2 seconds per stack. Keep the multiplier alive.', max: 2 },
  { id: 'plating', icon: '◈', name: 'PLASMA SHIELD', desc: 'Gain a shield that blocks 2 hits instead of 1.', max: 1 },
  { id: 'thrusters', icon: '➤', name: 'ION THRUSTERS', desc: 'Move 15% faster. Dodge the spiral, catch the drops.', max: 2 },
];

export const SKIP_SCORE = 250;

/** A fresh draft: 3 distinct upgrades the player has not maxed out. */
export function rollDraft(taken) {
  const available = UPGRADE_POOL.filter((u) => (taken[u.id] || 0) < u.max);
  // Shuffle a copy and take the first three.
  const shuffled = [...available];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 3);
}

/** Short label for the HUD's upgrade line, e.g. "HEAVY x2 · TWIN x1". */
export function upgradesLabel(taken) {
  const parts = [];
  for (const u of UPGRADE_POOL) {
    const n = taken[u.id] || 0;
    if (n > 0) parts.push(`${u.name} x${n}`);
  }
  return parts.join(' · ');
}
