import { Command } from '@julanzw/ttoolbox-discordjs-framework';
import {
  ChatInputCommandInteraction,
  Client,
  SlashCommandSubcommandBuilder,
  TextChannel,
} from 'discord.js';

import { sendTicketPanel } from '../../../tickets/setupTicketPanel.js';

export class SetupChannelCommand extends Command {
  name = 'setup-channel';
  description = 'Send the ticket panel to a channel';
  guildOnly = true;
  permissionLevel = 'admin' as const;

  customize(builder: SlashCommandSubcommandBuilder) {
    builder.addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Channel to send the ticket panel to (defaults to current channel)')
        .setRequired(false),
    );
    return builder;
  }

  protected async run(interaction: ChatInputCommandInteraction, _client: Client): Promise<void> {
    const target = (interaction.options.getChannel('channel') ?? interaction.channel) as TextChannel;

    if (!target?.isTextBased()) {
      await interaction.reply({ content: '⚠️ Please specify a text channel.', ephemeral: true });
      return;
    }

    await sendTicketPanel(target);
    await interaction.reply({ content: `✅ Ticket panel sent to ${target}.`, ephemeral: true });
  }
}
