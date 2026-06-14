import { 
  Command, 
  SubcommandGroup 
} from '@julanzw/ttoolbox-discordjs-framework';
import {
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  SlashCommandSubcommandBuilder,
} from 'discord.js';

import { commandManager } from '../../../index.js';

/**
 * Shows detailed information about a specific command.
 * 
 * Demonstrates usage of:
 * - String options with autocomplete
 * - CommandManager.get()
 * - Type checking (Command vs SubcommandGroup)
 * - Dynamic embed building
 */
export class CommandInfoCommand extends Command {
  name = 'command';
  description = 'Get detailed information about a specific command';
  guildOnly = false;
  permissionLevel = 'user' as const;

  customize(builder: SlashCommandSubcommandBuilder) {
    return builder.addStringOption((option) =>
      option
        .setName('name')
        .setDescription('The command name')
        .setRequired(true)
        .setAutocomplete(true),
    );
  }

  protected async run(
    interaction: ChatInputCommandInteraction,
    client: Client,
  ): Promise<void> {
    const commandName = interaction.options.getString('name', true);
    const command = commandManager.get(commandName);

    if (!command) {
      await interaction.reply({
        content: `❌ Command \`${commandName}\` not found.`,
        ephemeral: true,
      });
      return;
    }

    // Build detailed embed
    const embed = new EmbedBuilder()
    //   .setTitle(`📖 Command: /${command.name}`)
    //   .setDescription(command.description)
    //   .setColor('#3F48CC')
    //   .addFields(
    //     {
    //       name: '🏠 Guild Only',
    //       value: command.guildOnly ? 'Yes' : 'No',
    //       inline: true,
    //     },
    //     {
    //       name: '🔒 Permission Level',
    //       value: command.permissionLevel,
    //       inline: true,
    //     },
    //   );

    // // Add cooldown if it exists
    // if (command.cooldown) {
    //   embed.addFields({
    //     name: '⏱️ Cooldown',
    //     value: `${command.cooldown / 1000} seconds`,
    //     inline: true,
    //   });
    // }

    // If it's a SubcommandGroup, show subcommands
    if (command instanceof SubcommandGroup) {
      const subcommands = command.getSubcommandList();
      
      embed.addFields({
        name: '📋 Subcommands',
        value: subcommands.length > 0
          ? subcommands.map((sub) => `• \`${sub.name}\` - ${sub.description}`).join('\n')
          : 'No subcommands',
      });

      embed.setFooter({ 
        text: `Use /help command ${command.name} for subcommand details` 
      });
    }

    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
}