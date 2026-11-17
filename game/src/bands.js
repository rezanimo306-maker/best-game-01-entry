// bands.js — the three wave bands of NEON VOID: each band tints the whole
// sector (fog, nebula, grid, lights) so waves 1-3, 4-6 and 7-9 each read as
// a different stretch of space. Wave 10 is the boss's own void.
// One clear job: what each part of the sector looks like.
export const BANDS = [
  {
    name: 'AZURE DRIFT',
    waves: [1, 2, 3],
    bg: 0x04040f,
    fog: 0x070418,
    fogDensity: 0.016,
    nebula: ['rgba(139,92,255,0.55)', 'rgba(255,46,136,0.4)', 'rgba(34,230,255,0.35)'],
    gridFine: 0x22e6ff,
    gridFineDim: 0x123a66,
    gridCoarse: 0xff2e88,
    gridCoarseDim: 0x2a0f3d,
    ambient: 0x445577,
    key: 0x88bbff,
    rim: 0xff2e88,
  },
  {
    name: 'EMBER RIFT',
    waves: [4, 5, 6],
    bg: 0x0d0408,
    fog: 0x180614,
    fogDensity: 0.015,
    nebula: ['rgba(255,122,61,0.55)', 'rgba(255,46,136,0.5)', 'rgba(255,194,51,0.35)'],
    gridFine: 0xff8a2e,
    gridFineDim: 0x4a2410,
    gridCoarse: 0xff2e88,
    gridCoarseDim: 0x3d0f2a,
    ambient: 0x554433,
    key: 0xffb088,
    rim: 0xff2e88,
  },
  {
    name: 'CRIMSON DEEP',
    waves: [7, 8, 9],
    bg: 0x0d0310,
    fog: 0x160818,
    fogDensity: 0.017,
    nebula: ['rgba(255,51,85,0.55)', 'rgba(139,92,255,0.5)', 'rgba(255,46,136,0.35)'],
    gridFine: 0xff3355,
    gridFineDim: 0x3d0f2a,
    gridCoarse: 0x8b5cff,
    gridCoarseDim: 0x241040,
    ambient: 0x553344,
    key: 0xff99aa,
    rim: 0x8b5cff,
  },
  {
    name: 'VOID CORE',
    waves: [10],
    bg: 0x020208,
    fog: 0x0a0416,
    fogDensity: 0.019,
    nebula: ['rgba(255,46,136,0.6)', 'rgba(139,92,255,0.55)', 'rgba(255,255,255,0.3)'],
    gridFine: 0xff2e88,
    gridFineDim: 0x2a0f3d,
    gridCoarse: 0x22e6ff,
    gridCoarseDim: 0x0f2a3d,
    ambient: 0x442244,
    key: 0xff88bb,
    rim: 0xff2e88,
  },
];

/** The band a wave belongs to (waves 1-10). */
export function bandForWave(wave) {
  for (const band of BANDS) {
    if (band.waves.includes(wave)) return band;
  }
  return BANDS[0];
}
