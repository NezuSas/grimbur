/** Accent colour of each hero, by roster index (Vael, Sera, Borin, Auric, Mira, Bram). */
export const HERO_ACCENT: readonly string[] = ["#69C3DE", "#E5737E", "#97C46E", "#E8BA52", "#E86FB5", "#E8894A"];

export const heroAccent = (index: number): string => HERO_ACCENT[index] ?? "#E8BA52";
