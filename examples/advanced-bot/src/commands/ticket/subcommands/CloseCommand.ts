import { Command } from '@julanzw/ttoolbox-discordjs-framework';
import {
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  SlashCommandSubcommandBuilder,
} from 'discord.js';

import { TicketManager } from '../../../tickets/TicketManager.js';

export class CloseCommand extends Command {
  name = 'close';
  description = 'Close a support ticket by ID';
  guildOnly = true;
  permissionLevel = 'admin' as const;

  constructor(private ticketManager: TicketManager) {
    super();
  }

  customize(builder: SlashCommandSubcommandBuilder) {
    builder.addStringOption(opt =>
      opt.setName('id')
        .setDescription('Ticket ID (e.g. TKT-0001)')
        .setRequired(true)
        .setAutocomplete(true),
    );
    return builder;
  }

  protected async run(interaction: ChatInputCommandInteraction, _client: Client): Promise<void> {
    const id = interaction.options.getString('id', true).toUpperCase();
    const closed = this.ticketManager.close(id);

    if (!closed) {
      await interaction.reply({ content: `⚠️ Ticket \`${id}\` not found or already closed.`, ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🔒 Ticket Closed')
      .setDescription(`Ticket \`${id}\` has been closed by <@${interaction.user.id}>.`)
      .setColor(0xed4245)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
}
