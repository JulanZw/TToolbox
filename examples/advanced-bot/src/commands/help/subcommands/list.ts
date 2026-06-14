import { Command, PaginatedEmbed, TIMES_MILISECONDS } from '@julanzw/ttoolbox-discordjs-framework';
import {
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  SlashCommandSubcommandBuilder,
} from 'discord.js';

import { commandManager } from '../../../index.js';

/**
 * Lists all available commands in a paginated format.
 * 
 * Demonstrates usage of:
 * - CommandManager.getHelpPages()
 * - PaginatedEmbed utility
 * - Subcommand structure
 */
export class ListCommand extends Command {
  name = 'list';
  description = 'Show all available commands';
  guildOnly = false;
  permissionLevel = 'user' as const;

  customize(builder: SlashCommandSubcommandBuilder) {
    return builder;
  }

  protected async run(
    interaction: ChatInputCommandInteraction,
    client: Client,
  ): Promise<void> {
    // Get help pages from CommandManager (automatically grouped)
    const pages = commandManager.getHelpPages(5);

    if (pages.length === 0) {
      await interaction.reply({
        content: 'No commands available.',
        ephemeral: true,
      });
      return;
    }

    // Create paginated embed
    const paginator = new PaginatedEmbed(
      interaction,
      pages,
      (page, index, total) => [
        new EmbedBuilder()
          .setTitle(`Bot Commands (Page ${index + 1}/${total})`)
          .setDescription('Use `/help command <name>` for detailed information about a specific command.')
          .setColor('#3F48CC')
          .addFields(page)
          .setFooter({ text: `Page ${index + 1} of ${total}` })
          .setTimestamp(),
      ],
      {
        timeout: TIMES_MILISECONDS.MINUTE * 5,
      },
    );

    await paginator.start();
  }
}