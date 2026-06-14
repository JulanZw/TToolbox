import { Command } from '@julanzw/ttoolbox-discordjs-framework';
import { ChatInputCommandInteraction, Client } from 'discord.js';

/**
 * Simple ping command to check bot latency.
 * 
 * This is a basic example showing the minimum required for a command.
 */
export class PingCommand extends Command {
  name = 'ping';
  description = 'Check bot latency';
  guildOnly = false;
  permissionLevel = 'user' as const;

  protected async run(
    interaction: ChatInputCommandInteraction,
    client: Client,
  ): Promise<void> {
    await interaction.reply(`Pong!\nLatency: \`${new Date().getTime() - interaction.createdAt.getTime()} ms\``);
  }
}