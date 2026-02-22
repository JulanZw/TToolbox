import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import type { ILogger } from '../types/logger.js';

/**
 * Reports errors to a designated Discord channel.
 * 
 * Used for monitoring production bots - get notified when errors occur
 * without having to constantly checking logs.
 * 
 * @example
 * ```typescript
 * const errorReporter = new ErrorReporter(client, '1234567890', logger);
 * 
 * try {
 *   await riskyOperation();
 * } catch (err) {
 *   await errorReporter.reportError(err, 'Processing user data');
 * }
 * ```
 */
export class ErrorReporter {
  constructor(
    private client: Client,
    private channelId: string,
    private logger?: ILogger,
  ) {}

  /**
   * Report an error to the configured Discord channel.
   * 
   * @param error - The error that occurred
   * @param context - Context about where/why the error happened
   * @param additionalInfo - Optional additional information to include
   * 
   * @example
   * ```typescript
   * await errorReporter.reportError(
   *   new Error('Comparison went wrong'),
   *   'data not equal to moreData',
   *   { data: '123', moreData: '456' }
   * );
   * ```
   */
  async reportError(
    error: Error,
    context: string,
    additionalInfo?: Record<string, any>,
  ): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(this.channelId);

      if (!channel?.isTextBased()) {
        this.logger?.warn(
          `Error reporter channel ${this.channelId} is not text-based`,
          'error-reporter',
        );
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('Error Occurred')
        .setColor(0xed4245)
        .addFields(
          { name: 'Context', value: context },
          { 
            name: 'Error', 
            value: `\`\`\`${this.truncate(error.message, 1000)}\`\`\`` 
          },
        )
        .setTimestamp();

      if (error.stack) {
        embed.addFields({
          name: 'Stack Trace',
          value: `\`\`\`${this.truncate(error.stack, 1000)}\`\`\``,
        });
      }

      if (additionalInfo && Object.keys(additionalInfo).length > 0) {
        embed.addFields({
          name: 'Additional Info',
          value: `\`\`\`json\n${JSON.stringify(additionalInfo, null, 2).slice(0, 1000)}\`\`\``,
        });
      }

      await (channel as TextChannel).send({ embeds: [embed] });

      this.logger?.info(
        `Error reported to channel ${this.channelId}`,
        'error-reporter',
      );
    } catch (err: any) {
      this.logger?.error(
        `Failed to report error to Discord: ${err.message}`,
        'error-reporter',
      );
    }
  }

  /**
   * Truncate text to a maximum length
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  }

  /**
   * Update the channel ID for error reporting
   */
  setChannel(channelId: string): void {
    this.channelId = channelId;
  }

  /**
   * Get the current channel ID
   */
  getChannelId(): string {
    return this.channelId;
  }
}