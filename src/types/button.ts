/**
 * Standard button types used in paginated embeds and component interactions.
 * 
 * - `'prev'` - Navigate to the previous page/item
 * - `'next'` - Navigate to the next page/item  
 * - `'edit'` - Trigger edit action for current item
 * - `'delete'` - Trigger delete action for current item
 * 
 * @example
 * ```typescript
 * const buttonType: ButtonType = 'prev';
 * createButton(buttonType, 'Previous', 'Primary');
 * ```
 */
export type ButtonType = 'prev' | 'next' | 'edit' | 'delete';

/**
 * Determines where pagination buttons (prev/next) are placed relative to custom buttons.
 * 
 * - `'embrace'` - Pagination buttons wrap around custom buttons (prev, [custom], next)
 * - `'start'` - Pagination buttons come before custom buttons (prev, next, [custom])
 * - `'end'` - Pagination buttons come after custom buttons ([custom], prev, next)
 * 
 * @example
 * ```typescript
 * // Pagination embraces custom buttons: [<] [Delete] [Edit] [>]
 * createButtonsRow(customButtons, { 
 *   buttons: paginationButtons, 
 *   location: 'embrace' 
 * });
 * 
 * // Pagination at start: [<] [>] [Delete] [Edit]
 * createButtonsRow(customButtons, { 
 *   buttons: paginationButtons, 
 *   location: 'start' 
 * });
 * 
 * // Pagination at end: [Delete] [Edit] [<] [>]
 * createButtonsRow(customButtons, { 
 *   buttons: paginationButtons, 
 *   location: 'end' 
 * });
 * ```
 */
export type PaginationButtonLocation = 'embrace' | 'start' | 'end';