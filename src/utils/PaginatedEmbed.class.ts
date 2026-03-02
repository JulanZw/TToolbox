import {
  ChatInputCommandInteraction,
  ButtonInteraction,
  ComponentType,
} from 'discord.js';

import { InteractionError } from '../classes/InteractionError.class.js';

import {
  createButtonsRow,
  createPaginationButtons,
} from './embeds.js';
import { safeReply } from './editAndReply.js';
import { TIMES_MILISECONDS } from './miliseconds.js';
import { PaginatedEmbedOptions } from '../types/paginatedEmbedOptions.js';

/**
 * A utility class for creating paginated embeds with navigation buttons.
 * 
 * Displays a collection of items one at a time with prev/next buttons,
 * and supports custom action buttons alongside pagination controls.
 * 
 * @typeParam T - The type of items being paginated
 * 
 * @example
 * ```typescript
 * //Basic Usage
 * const reminders = await getReminders(userId);
 * 
 * const paginator = new PaginatedEmbed(
 *   interaction,
 *   reminders,
 *   (reminder, index, total) => {
 *     return [new EmbedBuilder()
 *       .setTitle(`Reminder ${index + 1}/${total}`)
 *       .setDescription(reminder.message)];
 *   }
 * );
 * 
 * await paginator.start();
 * ```
 * 
 * @example
 * ```typescript
 * //With Custom Buttons
 * const paginator = new PaginatedEmbed(
 *   interaction,
 *   items,
 *   (item, index, total) => [buildEmbed(item)],
 *   {
 *     extraButtons: [createButton('delete', 'Delete', 'Danger')],
 *     timeout: 5 * 60 * 1000,
 *     onCustomButton: async (action, index, items) => {
 *       if (action === 'delete') {
 *         await deleteItem(items[index]);
 *         return {
 *           handled: true,
 *           newItems: items.filter((_, i) => i !== index),
 *           stopCollector: items.length === 1,
 *         };
 *       }
 *       return { handled: false };
 *     },
 *   }
 * );
 * ```
 */
export class PaginatedEmbed<T> {
  private index = 0;
  private items: T[];
  private collector?: any;

  /**
   * Create a new paginated embed.
   * 
   * @param interaction - The command interaction to reply to
   * @param items - Array of items to paginate through
   * @param buildEmbed - Function to build embed(s) for each item
   * @param options - Optional configuration for buttons and behavior
   * 
   * @example
   * ```typescript
   * new PaginatedEmbed(
   *   interaction,
   *   [item1, item2, item3],
   *   (item, index, total) => [
   *     new EmbedBuilder()
   *       .setTitle(`Item ${index + 1}/${total}`)
   *       .setDescription(item.description)
   *   ]
   * );
   * ```
   */
  constructor(
    private interaction: ChatInputCommandInteraction,
    items: T[],
    private buildEmbed: (item: T, index: number, total: number) => any[],
    private options?: PaginatedEmbedOptions<T>,
  ) {
    this.items = items;
  }

  /**
   * Build the button rows for the current state.
   * 
   * Combines pagination buttons (prev/next) with any custom buttons
   * defined in options.
   * 
   * @private
   * @returns Array of action rows containing buttons
   */
  private buildButtons() {
    const paginationButtons = createPaginationButtons(
      this.index,
      this.items.length,
    );
    const extraButtons = this.options?.extraButtons ?? [];

    return [
      createButtonsRow(extraButtons, {
        buttons: paginationButtons,
        location: 'embrace',
      }),
    ];
  }

  /**
   * Start the paginated embed interaction.
   * 
   * Sends the initial embed and sets up button collectors for navigation
   * and custom actions. Automatically cleans up components when the
   * collector times out.
   * 
   * @throws {InteractionError} If the interaction has already been replied to
   * 
   * @example
   * ```typescript
   * const paginator = new PaginatedEmbed(...);
   * await paginator.start();
   * ```
   */
  async start() {
    await safeReply(
      this.interaction,
      '',
      false,
      this.buildEmbed(this.items[this.index], this.index, this.items.length),
      this.buildButtons(),
    );

    const msg = await this.interaction.fetchReply();
    this.collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: this.options?.timeout ?? TIMES_MILISECONDS.MINUTE * 2,
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.collector.on('collect', async (btnInteraction: ButtonInteraction) => {
      if (btnInteraction.user.id !== this.interaction.user.id) {
        return await safeReply(
          btnInteraction,
          'You cannot use this button.',
          true,
        );
      }

      const action = btnInteraction.customId;

      // Handle custom buttons first
      if (this.options?.onCustomButton) {
        const result = await this.options.onCustomButton(
          action,
          this.index,
          this.items,
        );

        if (result.handled) {
          if (result.newItems) {
            this.items = result.newItems;
            this.index = Math.min(this.index, this.items.length - 1);

            if (this.items.length === 0 || result.stopCollector) {
              this.stop();
              return;
            }
          }

          // Don't update for confirmation dialogs
          if (action !== 'delete') {
            await btnInteraction.update({
              embeds: this.buildEmbed(
                this.items[this.index],
                this.index,
                this.items.length,
              ),
              components: this.buildButtons(),
            });
          }
          return;
        }
      }

      // Handle pagination
      switch (action) {
        case 'prev':
          this.index = Math.max(0, this.index - 1);
          break;
        case 'next':
          this.index = Math.min(this.items.length - 1, this.index + 1);
          break;
        default:
          return;
      }

      await btnInteraction.update({
        embeds: this.buildEmbed(
          this.items[this.index],
          this.index,
          this.items.length,
        ),
        components: this.buildButtons(),
      });
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.collector.on('end', async () => {
      try {
        await this.interaction.editReply({ components: [] });
      } catch (err: any) {
        throw new InteractionError(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          `Failed to clear components: ${err.message}`,
          this.interaction.id,
          'failed',
        );
      }
    });
  }

  /**
   * Manually stop the collector and clean up components.
   * 
   * Useful for stopping pagination early, such as when all items
   * have been deleted or when implementing a "close" button.
   * 
   * @example
   * ```typescript
   * // In a custom button handler
   * if (items.length === 0) {
   *   paginator.stop();
   * }
   * ```
   */
  stop() {
    if (this.collector) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      this.collector.stop();
    }
  }

  /**
   * Get the current page index.
   * 
   * Useful for custom button handlers that need to know which
   * item is currently being displayed.
   * 
   * @returns The zero-based index of the current page
   * 
   * @example
   * ```typescript
   * const currentIndex = paginator.getCurrentIndex();
   * console.log(`Viewing page ${currentIndex + 1}`);
   * ```
   */
  getCurrentIndex() {
    return this.index;
  }

  /**
   * Get the current items array.
   * 
   * Useful for custom button handlers that need to inspect or
   * modify the items being paginated.
   * 
   * @returns The current array of items
   * 
   * @example
   * ```typescript
   * const items = paginator.getItems();
   * console.log(`${items.length} items remaining`);
   * ```
   */
  getItems() {
    return this.items;
  }
}