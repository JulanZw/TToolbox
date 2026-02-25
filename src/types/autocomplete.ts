import { AutocompleteInteraction } from "discord.js";

/**
 * Handler function for autocomplete interactions.
 * 
 * @param interaction - The autocomplete interaction
 * @param focusedValue - The current value the user is typing
 * @returns Array of choices to display (max 25)
 * 
 * @example
 * ```typescript
 * async (interaction, focusedValue) => {
 *   const feeds = await getFeeds(interaction.user.id);
 *   return feeds
 *     .filter(f => f.name.toLowerCase().includes(focusedValue.toLowerCase()))
 *     .map(f => ({ name: f.name, value: f.name }));
 * }
 * ```
 */
export type AutocompleteHandler = (
  interaction: AutocompleteInteraction,
  focusedValue: string,
) => Promise<Array<{ name: string; value: string }>> | Array<{ name: string; value: string }>;