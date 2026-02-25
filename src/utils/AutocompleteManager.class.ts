import { AutocompleteInteraction } from 'discord.js';
import type { ILogger } from '../types/logger.js';
import { AutocompleteHandler } from '../types/autocomplete.js';

/**
 * Manages autocomplete interactions for slash commands.
 * 
 * Provides centralized registration and handling of autocomplete options.
 * Supports per-command, per-option handlers with automatic filtering and
 * Discord's 25-choice limit.
 * 
 * @example
 * ```typescript
 * const autocompleteManager = new AutocompleteManager(logger);
 * 
 * // Register autocomplete for a specific command option
 * autocompleteManager.register('item', 'name', async (interaction, value) => {
 *   const items = await prisma.item.findMany({
 *     where: {
 *       userId: interaction.user.id,
 *       name: { contains: value },
 *     },
 *   });
 *   
 *   return items.map(item => ({ name: item.name, value: item.name }));
 * });
 * 
 * // Handle autocomplete interactions
 * client.on('interactionCreate', async (interaction) => {
 *   if (interaction.isAutocomplete()) {
 *     await autocompleteManager.handle(interaction);
 *   }
 * });
 * ```
 */
export class AutocompleteManager {
  // Map structure: Map<commandName, Map<optionName, handler>>
  private handlers = new Map<string, Map<string, AutocompleteHandler>>();

  constructor(private logger?: ILogger) {}

  /**
   * Register an autocomplete handler for a command option.
   * 
   * @param commandName - The name of the slash command
   * @param optionName - The name of the option with autocomplete enabled
   * @param handler - The handler function that returns choices
   * 
   * @example
   * ```typescript
   * // Simple static choices
   * autocompleteManager.register('config', 'setting', async () => {
   *   return [
   *     { name: 'Notifications', value: 'notifications' },
   *     { name: 'Language', value: 'language' },
   *     { name: 'Theme', value: 'theme' },
   *   ];
   * });
   * 
   * // Dynamic choices from database
   * autocompleteManager.register('item', 'name', async (interaction, value) => {
   *   const items = await prisma.item.findMany({
   *     where: {
   *       userId: interaction.user.id,
   *       name: { contains: value },
   *     },
   *     take: 25,
   *   });
   *   
   *   return items.map(item => ({ name: item.name, value: item.id }));
   * });
   * 
   * // With fuzzy search
   * autocompleteManager.register('user', 'username', async (interaction, value) => {
   *   const users = await searchUsers(value);
   *   return users.map(u => ({ name: u.tag, value: u.id }));
   * });
   * ```
   */
  register(
    commandName: string,
    optionName: string,
    handler: AutocompleteHandler,
  ): void {
    if (!this.handlers.has(commandName)) {
      this.handlers.set(commandName, new Map());
    }

    this.handlers.get(commandName)!.set(optionName, handler);

    this.logger?.info(
      `Registered autocomplete handler: ${commandName}.${optionName}`,
      'autocomplete-manager',
    );
  }

  /**
   * Handle an autocomplete interaction.
   * 
   * Automatically calls the appropriate handler and responds with choices.
   * Handles errors gracefully and enforces Discord's 25-choice limit.
   * 
   * @param interaction - The autocomplete interaction to handle
   * 
   * @example
   * ```typescript
   * client.on('interactionCreate', async (interaction) => {
   *   if (interaction.isAutocomplete()) {
   *     await autocompleteManager.handle(interaction);
   *   }
   * });
   * ```
   */
  async handle(interaction: AutocompleteInteraction): Promise<void> {
    const commandHandlers = this.handlers.get(interaction.commandName);

    if (!commandHandlers) {
      this.logger?.warn(
        `No autocomplete handlers for command: ${interaction.commandName}`,
        'autocomplete-manager',
      );
      await interaction.respond([]);
      return;
    }

    const focusedOption = interaction.options.getFocused(true);
    const handler = commandHandlers.get(focusedOption.name);

    if (!handler) {
      this.logger?.warn(
        `No autocomplete handler for ${interaction.commandName}.${focusedOption.name}`,
        'autocomplete-manager',
      );
      await interaction.respond([]);
      return;
    }

    try {
      const choices = await handler(interaction, focusedOption.value);

      // Discord's 25-choice limit
      const limitedChoices = choices.slice(0, 25);

      if (choices.length > 25) {
        this.logger?.warn(
          `Autocomplete handler for ${interaction.commandName}.${focusedOption.name} returned ${choices.length} choices, truncating to 25`,
          'autocomplete-manager',
        );
      }

      await interaction.respond(limitedChoices);
    } catch (err: any) {
      this.logger?.error(
        `Error in autocomplete handler for ${interaction.commandName}.${focusedOption.name}: ${err.message}`,
        'autocomplete-manager',
      );

      // Empty array on error to prevent interaction failure
      await interaction.respond([]);
    }
  }

  /**
   * Unregister an autocomplete handler.
   * 
   * @param commandName - The command name
   * @param optionName - The option name
   * @returns true if the handler was removed, false if it didn't exist
   */
  unregister(commandName: string, optionName: string): boolean {
    const commandHandlers = this.handlers.get(commandName);
    if (!commandHandlers) return false;

    const removed = commandHandlers.delete(optionName);

    if (commandHandlers.size === 0) {
      this.handlers.delete(commandName);
    }

    return removed;
  }

  /**
   * Unregister all handlers for a command.
   * 
   * @param commandName - The command name
   * @returns true if any handlers were removed
   */
  unregisterCommand(commandName: string): boolean {
    return this.handlers.delete(commandName);
  }

  /**
   * Check if a handler is registered for a command option.
   * 
   * @param commandName - The command name
   * @param optionName - The option name
   * @returns true if a handler exists
   */
  has(commandName: string, optionName: string): boolean {
    return this.handlers.get(commandName)?.has(optionName) || false;
  }

  /**
   * Get all registered command names.
   */
  getCommands(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get all registered option names for a command.
   * 
   * @param commandName - The command name
   * @returns Array of option names, or empty array if command not found
   */
  getOptions(commandName: string): string[] {
    const commandHandlers = this.handlers.get(commandName);
    return commandHandlers ? Array.from(commandHandlers.keys()) : [];
  }

  /**
   * Clear all registered handlers.
   * 
   * Useful for cleanup or testing.
   */
  clear(): void {
    this.handlers.clear();
    this.logger?.info('Cleared all autocomplete handlers', 'autocomplete-manager');
  }

  /**
   * Get the total number of registered handlers across all commands.
   */
  get handlerCount(): number {
    let count = 0;
    for (const commandHandlers of this.handlers.values()) {
      count += commandHandlers.size;
    }
    return count;
  }
}