import {
  ComponentManager,
  ModalManager,
  InteractionError,
} from '@julanzw/ttoolbox-discordjs-framework';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  TextChannel,
  TextInputStyle,
} from 'discord.js';

import { TicketManager } from './TicketManager.js';

export function setupTicketHandlers(
  componentManager: ComponentManager,
  modalManager: ModalManager,
  ticketManager: TicketManager,
): void {

  // ── Modal: Ticket submission ─────────────────────────────────────────────
  // Pre-register once at setup time — persistent, any user can submit it
  const ticketModal = modalManager.buildAndRegister({
    id: 'ticket-submit',
    title: 'Open a Support Ticket',
    ephemeral: false,
    fields: [
      {
        customId: 'ticket-subject',
        name: 'Subject',
        style: TextInputStyle.Short,
        placeholder: 'Brief description of your issue',
        required: true,
        maxLength: 100,
      },
      {
        customId: 'ticket-description',
        name: 'Description',
        style: TextInputStyle.Paragraph,
        placeholder: 'Explain your issue in detail...',
        required: true,
        maxLength: 1000,
      },
    ],
    onSubmit: async (interaction) => {
      const subject = interaction.fields.getTextInputValue('ticket-subject');
      const description = interaction.fields.getTextInputValue('ticket-description');

      const channel = interaction.channel as TextChannel;
      if (!channel || channel.type !== ChannelType.GuildText) {
        throw new InteractionError(
          'Tickets can only be created in text channels.',
          interaction.id,
          'failed',
        );
      }

      const thread = await channel.threads.create({
        name: `ticket-${interaction.user.username}-${Date.now()}`,
        type: ChannelType.PrivateThread,
        reason: `Support ticket by ${interaction.user.tag}`,
      });

      const ticket = ticketManager.create(
        interaction.user.id,
        interaction.user.username,
        subject,
        description,
        thread.id,
      );

      const embed = new EmbedBuilder()
        .setTitle(`🎫 Ticket ${ticket.id}`)
        .setDescription(description)
        .addFields(
          { name: 'Subject', value: subject, inline: true },
          { name: 'Opened by', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Status', value: '🟢 Open', inline: true },
        )
        .setColor(0x57f287)
        .setTimestamp();

      const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`close-ticket:${ticket.id}`)
          .setLabel('Close Ticket')
          .setStyle(ButtonStyle.Danger),
      );

      await thread.send({ embeds: [embed], components: [closeRow] });
      await interaction.reply({
        content: `✅ Your ticket has been created! Head to ${thread} to get support.`,
        ephemeral: true,
      });
    },
  });

  // ── Button: "Open a Ticket" ──────────────────────────────────────────────
  // Persistent handler — registered once, works for any user, any time.
  componentManager.registerButton('open-ticket', async (interaction) => {
    await interaction.showModal(ticketModal);
  });

  // ── Button: "Close Ticket" (dynamic ID: "close-ticket:<ticketId>") ───────
  componentManager.registerButton('close-ticket', async (interaction) => {
    const ticketId = interaction.customId.split(':')[1];
    const closed = ticketManager.close(ticketId);

    if (!closed) {
      await interaction.reply({ content: '⚠️ This ticket is already closed or not found.', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🔒 Ticket Closed')
      .setDescription(`Ticket closed by <@${interaction.user.id}>`)
      .setColor(0xed4245)
      .setTimestamp();

    await interaction.update({ embeds: [embed], components: [] });
  });
}

/**
 * Sends the ticket panel embed to the given channel.
 * Call this once during bot setup (or via an admin command).
 */
export async function sendTicketPanel(channel: TextChannel): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle('🎫 Support Tickets')
    .setDescription('Click the button below to open a support ticket. Our team will get back to you as soon as possible.')
    .setColor(0x5865f2);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('open-ticket')
      .setLabel('Open a Ticket')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎫'),
  );

  await channel.send({ embeds: [embed], components: [row] });
}
