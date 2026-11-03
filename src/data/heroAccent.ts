/** Accent colour of each hero, by roster index (Vael, Sera, Borin, Auric, Mira, Bram). */
export const HERO_ACCENT: readonly string[] = ["#69C3DE", "#E5737E", "#97C46E", "#D2A85A", "#E86FB5", "#C8844E"];

export const heroAccent = (index: number): string => HERO_ACCENT[index] ?? "#D2A85A";
