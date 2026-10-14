/**
 * Every hero has one active ability with a cooldown (the passive perks live in heroes.ts).
 *  - scout:  Vael reveals a safe unexplored tile next to the explored area.
 *  - volley: Sera fires a free volley along her facing line: up to two guardians within five tiles, one heart off the Wumpus.
 *  - brace:  Borin raises a shield.
 *  - magnet: Auric pulls in the nearest gem.
 */
export type AbilityId = 'scout' | 'volley' | 'brace' | 'magnet';

export const VOLLEY_REACH = 5;
export const VOLLEY_TARGETS = 2;
