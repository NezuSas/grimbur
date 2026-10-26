/**
 * Every hero has one active ability with a cooldown (the passive perks live in heroes.ts).
 *  - scout:  Vael reveals a safe unexplored tile next to the explored area.
 *  - volley: Sera fires a free volley along her facing line: up to two guardians within five tiles, one heart off the Grimbur.
 *  - brace:  Borin raises a shield.
 *  - magnet: Auric pulls in the nearest gem.
 *  - flare:  Mira explores every non-lethal tile within two steps (hazards stay hidden).
 *  - blast:  Bram sets off a free bomb (guardians and vortexes in the 3x3, never the Grimbur).
 */
export type AbilityId = 'scout' | 'volley' | 'brace' | 'magnet' | 'flare' | 'blast';

/** Manhattan reach of the Flare. */
export const FLARE_REACH = 2;

export const VOLLEY_REACH = 5;
export const VOLLEY_TARGETS = 2;
