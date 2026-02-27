import {
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
  ApplicationCommandType,
  Client,
} from 'discord.js';
import type { ILogger } from '../types/logger.js';
import type { ErrorReporter } from '../utils/ErrorReporter.js';
import { PermissionLevel } from '../types/permission.js';
import { safeReply } from '../utils/editAndReply.js';

/**
 * Base class for Message Context Menu Commands.
 * 
 * Message context menu commands appear when right-clicking on a message and
 * selecting "Apps" in the context menu.
 * 
 * @example
 * ```typescript
 * export class ReportMessageCommand extends MessageContextMenuCommand {
 *   name = 'Report Message';
 *   guildOnly = true;
 *   permissionLevel = 'user' as const;
 * 
 *   protected async run(interaction: MessageContextMenuCommandInteraction) {
 *     const message = interaction.targetMessage;
 *     await reportMessage(message);
 *     await interaction.reply({ content: 'Message reported!', ephemeral: true });
 *   }
 * }
 * ```
 */
export abstract class MessageContextMenuCommand {
  abstract name: string;
  abstract guildOnly: boolean;
  abstract permissionLevel: PermissionLevel;

  protected logger?: ILogger;
  protected errorReporter?: ErrorReporter;

  /**
   * The main execution method - implement your command logic here.
   */
  protected abstract run(
    interaction: MessageContextMenuCommandInteraction,
    client: Client,
  ): Promise<void>;

  /**
   * Optional: Called before command execution.
   * Return false to stop execution.
   */
  protected async beforeExecute?(
    interaction: MessageContextMenuCommandInteraction,
    client: Client,
  ): Promise<boolean | void>;

  /**
   * Optional: Called after successful command execution.
   */
  protected async afterExecute?(
    interaction: MessageContextMenuCommandInteraction,
    client: Client,
  ): Promise<void>;

  /**
   * Optional: Called when command execution fails.
   */
  protected async onError?(
    interaction: MessageContextMenuCommandInteraction,
    error: Error,
    client: Client,
  ): Promise<void>;

  /**
   * Set the logger for this command.
   */
  setLogger(logger: ILogger): void {
    this.logger = logger;
  }

  /**
   * Set the error reporter for this command.
   */
  setErrorReporter(reporter: ErrorReporter): void {
    this.errorReporter = reporter;
  }

  /**
   * Log a message using the configured logger.
   */
  protected log(
    message: string,
    level: string,
    scope: string,
    logToConsole: boolean = false,
  ): void {
    this.logger?.log(message, level, scope, logToConsole);
  }

  /**
   * Validate the interaction (guild-only check).
   */
  protected validate(interaction: MessageContextMenuCommandInteraction): string | null {
    if (this.guildOnly && !interaction.guildId) {
      return 'This command can only be used in a server.';
    }
    return null;
  }

  /**
   * Check if the user has permission to use this command.
   * Override this method to implement custom permission logic.
   */
  protected async hasPermission(
    interaction: MessageContextMenuCommandInteraction,
  ): Promise<boolean> {
    // Default: everyone has permission
    return true;
  }

  /**
   * Execute the command with validation and error handling.
   */
  async execute(
    interaction: MessageContextMenuCommandInteraction,
    client: Client,
  ): Promise<void> {
    await this.safeExecute(this.name, interaction, client, async () => {
      const error = this.validate(interaction);
      if (error) return await safeReply(interaction, error, true);

      if (!(await this.hasPermission(interaction))) {
        return await safeReply(
          interaction,
          'You do not have permission to use this command.',
          true,
        );
      }

      if (this.beforeExecute) {
        const shouldContinue = await this.beforeExecute(interaction, client);
        if (shouldContinue === false) return;
      }

      try {
        await this.run(interaction, client);

        if (this.afterExecute) {
          await this.afterExecute(interaction, client);
        }
      } catch (err: any) {
        if (this.onError) {
          await this.onError(interaction, err, client);
        }
        throw err;
      }
    });
  }

  private async safeExecute(
    commandName: string,
    interaction: MessageContextMenuCommandInteraction,
    client: Client,
    fn: () => Promise<any>,
  ) {
    const scope = `${commandName}_EXECUTION`;

    try {
      await fn();
      this.log(`${commandName} context menu command executed`, 'info', scope);
    } catch (err: any) {
      this.log('An Error occurred: ' + err, 'error', scope, true);

      if (this.errorReporter) {
        await this.errorReporter.reportError(err, `Context Menu: ${commandName}`, {
          user: interaction.user.tag,
          userId: interaction.user.id,
          messageAuthor: interaction.targetMessage.author.tag,
          messageContent: interaction.targetMessage.content.slice(0, 100),
          guild: interaction.guild?.name,
          guildId: interaction.guildId,
        });
      }

      return await safeReply(interaction, 'An unexpected error occurred.');
    }
  }

  /**
   * Convert this command to Discord API JSON format.
   */
  toJSON() {
    return new ContextMenuCommandBuilder()
      .setName(this.name)
      .setType(ApplicationCommandType.Message)
      .toJSON();
  }
}