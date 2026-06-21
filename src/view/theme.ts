// Design tokens — the single source of truth for colors and layout.
// Mirrors Docs/BATTLE_VISUAL_STYLE_GUIDE.md. Do NOT hard-code colors elsewhere;
// add/adjust here so the look stays coherent (the legacy-web failure was
// stacked, conflicting style overrides — this prevents that).

/** Numeric colors for Phaser graphics/fills. */
export const COLOR = {
  bgDeep: 0x0b0e14,
  panel: 0x141a24,
  ink: 0xe8e0d0,
  muted: 0x8b97a6,
  accent: 0x3da9fc, // selection / movable / mana
  danger: 0xe5484d, // attack / damage
  tileLight: 0x1b2331,
  tileDark: 0x141a24,
  tileBorder: 0x2a3344,
  playerUnit: 0x2f6f4f,
  enemyUnit: 0x7a2330,
  hq: 0xe8c870,
  selected: 0xffffff, // selected-unit ring
} as const;

/** CSS color strings for Phaser text styles. */
export const TEXT_COLOR = {
  ink: "#e8e0d0",
  muted: "#8b97a6",
  accent: "#3da9fc",
  danger: "#ff8a8a",
  health: "#9fe6b0",
  hq: "#e8c870",
} as const;

export const LAYOUT = {
  /** Fraction of the smaller viewport dimension the 6x6 board occupies. */
  boardFraction: 0.82,
  /** Unit token size as a fraction of a tile. */
  unitFraction: 0.82,
} as const;

export const FONT_FAMILY = "system-ui, sans-serif";
