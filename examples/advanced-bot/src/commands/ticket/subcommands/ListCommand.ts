import { Command, PaginatedEmbed } from '@julanzw/ttoolbox-discordjs-framework';
import {
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  SlashCommandSubcommandBuilder,
} from 'discord.js';

import { TicketManager } from '../../../tickets/TicketManager.js';

const PAGE_SIZE = 5;

export class ListCommand extends Command {
  name = 'list';
  description = 'List all open tickets';
  guildOnly = true;
  permissionLevel = 'admin' as const;

  constructor(private ticketManager: TicketManager) {
    super();
  }

  customize(builder: SlashCommandSubcommandBuilder) {
    builder.addBooleanOption(opt =>
      opt.setName('show-closed')
        .setDescription('Include closed tickets (default: false)'),
    );
    return builder;
  }

  protected async run(interaction: ChatInputCommandInteraction, _client: Client): Promise<void> {
    const showClosed = interaction.options.getBoolean('show-closed') ?? false;
    const tickets = showClosed ? this.ticketManager.getAll() : this.ticketManager.getOpen();

    if (tickets.length === 0) {
      await interaction.reply({ content: '📭 No tickets found.', ephemeral: true });
      return;
    }

    const pages: typeof tickets[] = [];
    for (let i = 0; i < tickets.length; i += PAGE_SIZE) {
      pages.push(tickets.slice(i, i + PAGE_SIZE));
    }

    const paginator = new PaginatedEmbed(
      interaction,
      pages,
      (page, index, total) => [
        new EmbedBuilder()
          .setTitle(`🎫 Tickets (Page ${index + 1}/${total})`)
          .setDescription(
            page.map(t =>
              `**${t.id}** — ${t.subject}\n` +
              `> <@${t.userId}> • ${t.open ? '🟢 Open' : '🔴 Closed'} • <t:${Math.floor(t.createdAt.getTime() / 1000)}:R>`,
            ).join('\n\n'),
          )
          .setColor(0x5865f2)
          .setFooter({ text: `${tickets.length} ticket(s) total` })
          .setTimestamp(),
      ],
      { timeout: 5 * 60 * 1000 },
    );

    await paginator.start();
  }
}
