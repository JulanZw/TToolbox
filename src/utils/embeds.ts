import {
  APIEmbedField,
  ColorResolvable,
  EmbedBuilder,
  ButtonStyle,
  ButtonBuilder,
  ActionRowBuilder,
} from 'discord.js';

import { PaginationButtonLocation } from '../types/button.js';

/**
 * Util function for building an embed
 *
 * @param title - The title of the embed
 * @param fields - The fields of the embed
 * @param description - The description of the embed, optional
 * @param footer - The footer of the embed, optional
 * @param timestamp - If the embed should have a timestamp, defaults to false
 * @param color - The color of the embed, defaults to STANDARD_COLOR
 * @param customize - A function to customize the embed further, defaults to no customization
 *
 * @returns An EmbedBuilder instance with the specified properties
 */
export function embedBuilder({
  title,
  fields,
  description,
  footer,
  timestamp = false,
  color = '#3F48CC',
  customize = (e) => e,
}: {
  title: string;
  fields?: APIEmbedField[];
  description?: string;
  footer?: string;
  timestamp?: boolean;
  color?: ColorResolvable;
  customize?: (embed: EmbedBuilder) => EmbedBuilder;
}): EmbedBuilder {
  let embed = new EmbedBuilder().setTitle(title).setColor(color);

  if (fields && fields.length > 0) embed = embed.setFields(fields);
  if (description) embed = embed.setDescription(description);
  if (footer) embed = embed.setFooter({ text: footer });
  if (timestamp) embed = embed.setTimestamp();

  return customize(embed);
}

/**
 * Creates a single button based on its type and config.
 *
 * @param type - The button type of the button (prev, next, edit, delete, etc)
 * @param actionId - The base action ID for the button
 * @param disabled - Whether the button should be disabled, defaults to false
 * @param label - Optional label for the button, defaults to type-based label
 * @param style - Optional style for the button, defaults to secondary
 *
 * @return A ButtonBuilder instance configured with the specified properties
 */
export function createButton({
  type,
  disabled = false,
  label,
  style,
  customId,
}: {
  type: string;
  disabled?: boolean;
  label?: string;
  style?: ButtonStyle;
  customId?: string;
}): ButtonBuilder {
  const button = new ButtonBuilder()
    .setCustomId(customId ?? `${type}`)
    .setDisabled(disabled);

  switch (type) {
    case 'prev':
      return button
        .setLabel(label ?? 'Previous')
        .setStyle(ButtonStyle.Secondary);
    case 'next':
      return button.setLabel(label ?? 'Next').setStyle(ButtonStyle.Secondary);
    case 'edit':
      return button.setLabel(label ?? 'Edit').setStyle(ButtonStyle.Primary);
    case 'delete':
      return button.setLabel(label ?? 'Delete').setStyle(ButtonStyle.Danger);
    default:
      return button
        .setLabel(label ?? 'Unknown')
        .setStyle(style ?? ButtonStyle.Secondary);
  }
}

/**
 * Creates an `ButtonBuilder[]` with a prev and next button (in that order).
 *
 * @param index - The current index of the item being paginated
 * @param total - The total number of pages
 *
 * @returns An `ButtonBuilder[]` containing the buttons
 */
export function createPaginationButtons(
  index: number,
  total: number,
): ButtonBuilder[] {
  const buttons = [
    createButton({
      type: 'prev',
      disabled: index === 0,
    }),
    createButton({
      type: 'next',
      disabled: index === total - 1,
    }),
  ];

  return buttons;
}

/**
 * Creates an action row containing buttons with optional pagination controls.
 * 
 * Combines custom buttons with pagination buttons (prev/next) in a single row.
 * The location parameter determines where pagination buttons are placed relative
 * to custom buttons.
 * 
 * @param normalButtons - Array of custom buttons to include in the row
 * @param pagination - Optional pagination configuration
 * @param pagination.buttons - Array of exactly 2 pagination buttons (prev and next)
 * @param pagination.location - Where to place pagination buttons relative to custom buttons
 * @returns An ActionRowBuilder containing the combined buttons
 * 
 * @example Without pagination
 * ```typescript
 * const row = createButtonsRow([
 *   createButton({ type: 'edit' }),
 *   createButton({ type: 'delete' }),
 * ]);
 * // Result: [Edit] [Delete]
 * ```
 * 
 * @example With pagination (embrace)
 * ```typescript
 * const row = createButtonsRow(
 *   [createButton({ type: 'edit' })],
 *   {
 *     buttons: createPaginationButtons(0, 5),
 *     location: 'embrace'
 *   }
 * );
 * // Result: [<] [Edit] [>]
 * ```
 * 
 * @example With pagination (start)
 * ```typescript
 * const row = createButtonsRow(
 *   [createButton({ type: 'edit' })],
 *   { buttons: createPaginationButtons(0, 5), location: 'start' }
 * );
 * // Result: [<] [>] [Edit]
 * ```
 * 
 * @example With pagination (end)
 * ```typescript
 * const row = createButtonsRow(
 *   [createButton({ type: 'edit' })],
 *   { buttons: createPaginationButtons(0, 5), location: 'end' }
 * );
 * // Result: [Edit] [<] [>]
 * ```
 */
export function createButtonsRow(
  normalButtons: ButtonBuilder[],
  pagination?: { buttons: ButtonBuilder[]; location: PaginationButtonLocation },
) {
  if (pagination && pagination.buttons.length === 2) {
    switch (pagination.location) {
      case 'embrace':
        return new ActionRowBuilder<ButtonBuilder>().addComponents(
          pagination.buttons[0],
          ...normalButtons,
          pagination.buttons[1],
        );
      case 'start':
        return new ActionRowBuilder<ButtonBuilder>().addComponents(
          ...pagination.buttons,
          ...normalButtons,
        );
      case 'end':
        return new ActionRowBuilder<ButtonBuilder>().addComponents(
          ...normalButtons,
          ...pagination.buttons,
        );
    }
  } else {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...normalButtons,
    );
  }
}
