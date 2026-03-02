import { createButton } from "../utils/embeds";

/**
 * Options for configuring a paginated embed
 * 
 * @typeParam T - The type of items being paginated
 */
export type PaginatedEmbedOptions<T> = {
  /**
   * Optional extra buttons to display alongside pagination controls
   * 
   * @example
   * ```typescript
   * extraButtons: [
   *   createButton('delete', 'Delete', 'Danger'),
   *   createButton('edit', 'Edit', 'Primary'),
   * ]
   * ```
   */
  extraButtons?: ReturnType<typeof createButton>[];
  
  /**
   * Optional timeout in milliseconds
   * 
   * @default 120000 (2 minutes)
   * 
   * @example
   * ```typescript
   * timeout: 5 * 60 * 1000  // 5 minutes
   * ```
   */
  timeout?: number;

  /**
   * Handler for custom button clicks
   * 
   * Called when a non-pagination button is clicked. Return `handled: true`
   * to prevent the default pagination behavior.
   * 
   * @param action - The custom ID of the clicked button
   * @param index - The current page index
   * @param items - The current array of items
   * @returns Object indicating if the action was handled and any updates
   * 
   * @example
   * ```typescript
   * onCustomButton: async (action, index, items) => {
   *   if (action === 'delete') {
   *     await deleteItem(items[index]);
   *     const newItems = items.filter((_, i) => i !== index);
   *     return { handled: true, newItems, stopCollector: newItems.length === 0 };
   *   }
   *   return { handled: false };
   * }
   * ```
   */
  onCustomButton?: (
    action: string,
    index: number,
    items: T[],
  ) => Promise<{
    /** Whether this button click was handled by the custom handler */
    handled: boolean;
    /** Optional updated items array (useful for delete operations) */
    newItems?: T[];
    /** Whether to stop the collector (e.g., when no items remain) */
    stopCollector?: boolean;
  }>;
};