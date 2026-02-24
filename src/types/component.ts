import { StringSelectMenuInteraction, ChannelSelectMenuInteraction, RoleSelectMenuInteraction, UserSelectMenuInteraction, MentionableSelectMenuInteraction, ButtonInteraction } from "discord.js";

/**
 * Type for all select menu interactions
 */
export type AnySelectMenuInteraction =
  | StringSelectMenuInteraction
  | ChannelSelectMenuInteraction
  | RoleSelectMenuInteraction
  | UserSelectMenuInteraction
  | MentionableSelectMenuInteraction;

/**
 * Handler function for button interactions
 */
export type ButtonHandler = (interaction: ButtonInteraction) => Promise<void>;

/**
 * Handler function for select menu interactions
 */
export type SelectMenuHandler = (interaction: AnySelectMenuInteraction) => Promise<void>;

/**
 * Configuration for a component handler
 */
export interface ComponentConfig {
  /** Whether this component should be removed after being handled once */
  ephemeral?: boolean;
  /** Optional timeout in milliseconds after which the handler is removed */
  timeout?: number;
}