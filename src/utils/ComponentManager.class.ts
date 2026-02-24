import { 
  ButtonInteraction, 
  AnySelectMenuInteraction,
} from 'discord.js';
import type { ILogger } from '../types/logger.js';
import { ButtonHandler, ComponentConfig, SelectMenuHandler } from '../types/component.js';

/**
 * Manages Discord component interactions (buttons and select menus).
 * 
 * Provides centralized registration and handling of long living 
 * button clicks and select menu interactions. 
 * 
 * Supports dynamic custom IDs (e.g., "delete-feed:123"),
 * ephemeral handlers (one-time use), and automatic cleanup.
 * 
 * @example
 * ```typescript
 * const componentManager = new ComponentManager(logger);
 * 
 * // Register a button handler
 * componentManager.registerButton('delete-feed', async (interaction) => {
 *   const feedId = interaction.customId.split(':')[1];
 *   await deleteFeed(feedId);
 *   await interaction.reply('Feed deleted!');
 * });
 * 
 * // Register a select menu handler
 * componentManager.registerSelect('choose-feed-type', async (interaction) => {
 *   const type = interaction.values[0];
 *   await interaction.reply(`You selected: ${type}`);
 * });
 * 
 * // Handle interactions
 * client.on('interactionCreate', async (interaction) => {
 *   if (interaction.isButton()) {
 *     await componentManager.handleButton(interaction);
 *   }
 *   if (interaction.isAnySelectMenu()) {
 *     await componentManager.handleSelect(interaction);
 *   }
 * });
 * ```
 */
export class ComponentManager {
  private buttonHandlers = new Map<string, { handler: ButtonHandler; config: ComponentConfig }>();
  private selectHandlers = new Map<string, { handler: SelectMenuHandler; config: ComponentConfig }>();
  private timeouts = new Map<string, NodeJS.Timeout>();

  constructor(private logger?: ILogger) {}

  /**
   * Register a button click handler.
   * 
   * Supports dynamic custom IDs - if the exact ID isn't found, attempts to match
   * using the base ID (before the first colon).\
   * This allows for buttons with dynamic suffixes like "global-delete:123".
   * 
   * Its recommended to add a prefix like ```global-``` to the id to fully 
   * distingush it from other local component handlers.
   * 
   * @param customId - The button's custom ID (or base ID for dynamic buttons)
   * @param handler - Function to call when the button is clicked
   * @param config - Optional configuration (ephemeral, timeout)
   * 
   * @example
   * ```typescript
   * // Simple button
   * componentManager.registerButton('global-refresh', async (interaction) => {
   *   await interaction.reply('Refreshed!');
   * });
   * 
   * // Dynamic button (matches "global-delete:123", "global-delete:456", etc.)
   * componentManager.registerButton('global-delete', async (interaction) => {
   *   const id = interaction.customId.split(':')[1];
   *   await deleteItem(id);
   * });
   * 
   * // Ephemeral button (one-time use)
   * componentManager.registerButton('global-confirm', async (interaction) => {
   *   await processConfirmation();
   * }, { ephemeral: true });
   * 
   * // Button with timeout (auto-remove after 5 minutes)
   * componentManager.registerButton('global-temp-action', async (interaction) => {
   *   await doTempAction();
   * }, { timeout: 5 * 60 * 1000 });
   * ```
   */
  registerButton(
    customId: string,
    handler: ButtonHandler,
    config: ComponentConfig = {},
  ): void {
    this.buttonHandlers.set(customId, { handler, config });

    // Set up auto-removal timeout if specified
    if (config.timeout) {
      this.setupTimeout('button', customId, config.timeout);
    }

    this.logger?.info(
      `Registered button handler: ${customId}${config.ephemeral ? ' (ephemeral)' : ''}${config.timeout ? ` (timeout: ${config.timeout}ms)` : ''}`,
      'component-manager',
    );
  }

  /**
   * Register a select menu handler.
   * 
   * Supports dynamic custom IDs - if the exact ID isn't found, attempts to match
   * using the base ID (before the first colon).
   * 
   * Its recommended to add a prefix like ```global-``` to the id to fully 
   * distingush it from other local component handlers.
   * 
   * @param customId - The select menu's custom ID (or base ID for dynamic menus)
   * @param handler - Function to call when a selection is made
   * @param config - Optional configuration (ephemeral, timeout)
   * 
   * @example
   * ```typescript
   * // String select menu
   * componentManager.registerSelect('global-choose-type', async (interaction) => {
   *   const selected = interaction.values[0];
   *   await interaction.reply(`You chose: ${selected}`);
   * });
   * 
   * // Dynamic select menu
   * componentManager.registerSelect('global-choose-item', async (interaction) => {
   *   const itemId = interaction.customId.split(':')[1];
   *   const selected = interaction.values;
   *   await processSelection(itemId, selected);
   * });
   * ```
   */
  registerSelect(
    customId: string,
    handler: SelectMenuHandler,
    config: ComponentConfig = {},
  ): void {
    this.selectHandlers.set(customId, { handler, config });

    if (config.timeout) {
      this.setupTimeout('select', customId, config.timeout);
    }

    this.logger?.info(
      `Registered select menu handler: ${customId}${config.ephemeral ? ' (ephemeral)' : ''}${config.timeout ? ` (timeout: ${config.timeout}ms)` : ''}`,
      'component-manager',
    );
  }

  /**
   * Handle a button interaction.
   * 
   * Automatically matches dynamic IDs and removes ephemeral handlers after use.
   * 
   * @param interaction - The button interaction to handle
   * @throws {Error} If no handler is found for the button
   */
  async handleButton(interaction: ButtonInteraction): Promise<void> {
    if (interaction.replied || interaction.deferred) {
      this.logger?.warn(
        `Button ${interaction.customId} already handled, skipping`,
        'component-manager',
      );
      return;
    }

    const entry = this.findHandler(this.buttonHandlers, interaction.customId);

    if (!entry) {
      throw new Error(`No handler registered for button: ${interaction.customId}`);
    }

    const { handler, config, matchedId } = entry;

    try {
      await handler(interaction);

      // Remove ephemeral handlers after use
      if (config.ephemeral) {
        this.unregisterButton(matchedId);
        this.logger?.info(
          `Removed ephemeral button handler: ${matchedId}`,
          'component-manager',
        );
      }
    } catch (err: any) {
      this.logger?.error(
        `Error handling button ${interaction.customId}: ${err.message}`,
        'component-manager',
      );
      throw err;
    }
  }

  /**
   * Handle a select menu interaction.
   * 
   * Automatically matches dynamic IDs and removes ephemeral handlers after use.
   * 
   * @param interaction - The select menu interaction to handle
   * @throws {Error} If no handler is found for the select menu
   */
  async handleSelect(interaction: AnySelectMenuInteraction): Promise<void> {
    if (interaction.replied || interaction.deferred) {
      this.logger?.warn(
        `Select menu ${interaction.customId} already handled, skipping`,
        'component-manager',
      );
      return;
    }

    const entry = this.findHandler(this.selectHandlers, interaction.customId);

    if (!entry) {
      throw new Error(`No handler registered for select menu: ${interaction.customId}`);
    }

    const { handler, config, matchedId } = entry;

    try {
      await handler(interaction);

      if (config.ephemeral) {
        this.unregisterSelect(matchedId);
        this.logger?.info(
          `Removed ephemeral select menu handler: ${matchedId}`,
          'component-manager',
        );
      }
    } catch (err: any) {
      this.logger?.error(
        `Error handling select menu ${interaction.customId}: ${err.message}`,
        'component-manager',
      );
      throw err;
    }
  }

  /**
   * Find a handler by custom ID, supporting dynamic IDs.
   * 
   * First tries exact match, then tries base ID (before colon).
   */
  private findHandler<T>(
    map: Map<string, {
      handler: SelectMenuHandler | ButtonHandler;
      config: ComponentConfig;
    }>,
    customId: string,
  ): { handler: any; config: ComponentConfig; matchedId: string } | null {
    // Try exact match first
    const exact = map.get(customId);
    if (exact) {
      return { ...exact, matchedId: customId };
    }

    // Try base ID (before colon) for dynamic IDs
    const baseId = customId.split(':')[0];
    const base = map.get(baseId);
    if (base) {
      return { ...base, matchedId: baseId };
    }

    return null;
  }

  /**
   * Set up automatic removal timeout for a handler.
   */
  private setupTimeout(
    type: 'button' | 'select',
    customId: string,
    timeout: number,
  ): void {
    // Clear existing timeout if any
    const existingTimeout = this.timeouts.get(`${type}:${customId}`);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeoutId = setTimeout(() => {
      if (type === 'button') {
        this.unregisterButton(customId);
      } else {
        this.unregisterSelect(customId);
      }
      this.logger?.info(
        `Auto-removed ${type} handler after timeout: ${customId}`,
        'component-manager',
      );
    }, timeout);

    this.timeouts.set(`${type}:${customId}`, timeoutId);
  }

  /**
   * Unregister a button handler.
   * 
   * @param customId - The button's custom ID
   * @returns true if the handler was removed, false if it didn't exist
   */
  unregisterButton(customId: string): boolean {
    const removed = this.buttonHandlers.delete(customId);
    
    // Clear timeout if exists
    const timeoutId = this.timeouts.get(`button:${customId}`);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(`button:${customId}`);
    }

    return removed;
  }

  /**
   * Unregister a select menu handler.
   * 
   * @param customId - The select menu's custom ID
   * @returns true if the handler was removed, false if it didn't exist
   */
  unregisterSelect(customId: string): boolean {
    const removed = this.selectHandlers.delete(customId);
    
    const timeoutId = this.timeouts.get(`select:${customId}`);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(`select:${customId}`);
    }

    return removed;
  }

  /**
   * Check if a button handler is registered.
   * 
   * @param customId - The button's custom ID
   * @returns true if a handler exists (exact or base ID match)
   */
  hasButton(customId: string): boolean {
    return this.buttonHandlers.has(customId) || 
            this.buttonHandlers.has(customId.split(':')[0]);
  }

  /**
   * Check if a select menu handler is registered.
   * 
   * @param customId - The select menu's custom ID
   * @returns true if a handler exists (exact or base ID match)
   */
  hasSelect(customId: string): boolean {
    return this.selectHandlers.has(customId) || 
            this.selectHandlers.has(customId.split(':')[0]);
  }

  /**
   * Clear all registered handlers.
   * 
   * Useful for cleanup during bot shutdown or testing.
   */
  clear(): void {
    this.buttonHandlers.clear();
    this.selectHandlers.clear();
    
    // Clear all timeouts
    for (const timeoutId of this.timeouts.values()) {
      clearTimeout(timeoutId);
    }
    this.timeouts.clear();

    this.logger?.info('Cleared all component handlers', 'component-manager');
  }

  /**
   * Get the total number of registered button handlers.
   */
  get buttonCount(): number {
    return this.buttonHandlers.size;
  }

  /**
   * Get the total number of registered select menu handlers.
   */
  get selectCount(): number {
    return this.selectHandlers.size;
  }

  /**
   * Get all registered button IDs.
   */
  getButtonIds(): string[] {
    return Array.from(this.buttonHandlers.keys());
  }

  /**
   * Get all registered select menu IDs.
   */
  getSelectIds(): string[] {
    return Array.from(this.selectHandlers.keys());
  }
}