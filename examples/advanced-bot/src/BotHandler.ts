import {
  DiscordHandler,
  CommandManager,
  ComponentManager,
  AutocompleteManager,
  ModalManager,
  TToolboxLogger,
  InteractionError,
} from '@julanzw/ttoolbox-discordjs-framework';
import {
  Client,
  Interaction,
  Message,
  MessageReaction,
  OmitPartialGroupDMChannel,
  PartialMessage,
  PartialMessageReaction,
  PartialUser,
  User,
} from 'discord.js';

import { TicketManager } from './tickets/TicketManager.js';

export class BotHandler extends DiscordHandler {
  constructor(
    client: Client,
    private commandManager: CommandManager,
    private componentManager: ComponentManager,
    private autocompleteManager: AutocompleteManager,
    private modalManager: ModalManager,
    private ticketManager: TicketManager,
    private readonly botLogger: TToolboxLogger,
  ) {
    super(client, botLogger);
  }

  protected async handleInteractionCreation(interaction: Interaction): Promise<void> {
    try {
      if (interaction.isChatInputCommand()) {
        await this.commandManager.executeCommand(
          interaction.commandName,
          interaction,
          this.client,
        );
        return;
      }

      if (interaction.isUserContextMenuCommand()) {
        await this.commandManager.executeUserContextMenu(
          interaction.commandName,
          interaction,
          this.client,
        );
        return;
      }

      if (interaction.isMessageContextMenuCommand()) {
        await this.commandManager.executeMessageContextMenu(
          interaction.commandName,
          interaction,
          this.client,
        );
        return;
      }

      if (interaction.isAutocomplete()) {
        await this.autocompleteManager.handle(interaction);
        return;
      }

      if (interaction.isModalSubmit()) {
        await this.modalManager.handleSubmit(interaction);
        return;
      }

      // Collectors handle their own buttons first (e.g. PaginatedEmbed).
      // Only pass to ComponentManager if not already replied/deferred.
      if (interaction.isButton() && !interaction.replied && !interaction.deferred) {
        if (this.componentManager.hasButton(interaction.customId)) {
          await this.componentManager.handleButton(interaction);
        }
        return;
      }

      if (interaction.isAnySelectMenu() && !interaction.replied && !interaction.deferred) {
        if (this.componentManager.hasSelect(interaction.customId)) {
          await this.componentManager.handleSelect(interaction);
        }
        return;
      }
    } catch (err: any) {
      // InteractionError is expected — log at warn level, not error
      if (err instanceof InteractionError) {
        this.botLogger.warn(
          `InteractionError [${err.reason}]: ${err.message}`,
          'interaction-handler',
        );
        return;
      }

      this.botLogger.error(
        `Unhandled interaction error: ${err.message}`,
        'interaction-handler',
        true,
      );
    }
  }

  // Stubs for abstract event handlers not used by this bot
  protected async handleMessageCreation(_message: Message<boolean>): Promise<void> {}
  protected async handleReactionAdded(
    _reaction: MessageReaction | PartialMessageReaction,
    _user: User | PartialUser,
  ): Promise<void> {}
  protected async handleReactionRemoval(
    _reaction: MessageReaction | PartialMessageReaction,
    _user: User | PartialUser,
  ): Promise<void> {}
  protected async handleMessageDeletion(
    _message: OmitPartialGroupDMChannel<Message<boolean> | PartialMessage>,
  ): Promise<void> {}
}
