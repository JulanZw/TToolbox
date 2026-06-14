import { MessageContextMenuCommand, ModalManager } from '@julanzw/ttoolbox-discordjs-framework';
import {
  Client,
  MessageContextMenuCommandInteraction,
  TextInputStyle,
} from 'discord.js';

/**
 * Right-click a message → Apps → "Report Message"
 *
 * Demonstrates MessageContextMenuCommand combined with ModalManager
 * to collect a report reason from the user.
 */
export class ReportMessageCommand extends MessageContextMenuCommand {
  name = 'Report Message';
  guildOnly = true;
  permissionLevel = 'user' as const;

  constructor(private modalManager: ModalManager) {
    super();
  }

  protected async run(
    interaction: MessageContextMenuCommandInteraction,
    _client: Client,
  ): Promise<void> {
    const targetMessage = interaction.targetMessage;

    // Dynamic modal ID scoped to this specific interaction — one-time use
    const modalId = `report-message:${interaction.id}`;

    const modal = this.modalManager.buildAndRegister({
      id: modalId,
      title: 'Report Message',
      ephemeral: true,
      fields: [
        {
          customId: 'report-reason',
          name: 'Reason for report',
          style: TextInputStyle.Paragraph,
          placeholder: 'Describe why this message violates the rules...',
          required: true,
          maxLength: 500,
        },
      ],
      onSubmit: async (modalInteraction) => {
        const reason = modalInteraction.fields.getTextInputValue('report-reason');

        // In a real bot: save to database, notify moderators, etc.
        this.logger?.warn(
          `Message reported: ${targetMessage.id} by ${interaction.user.tag} — Reason: ${reason}`,
          'report-system',
          true,
        );

        await modalInteraction.reply({
          content: '✅ Thank you for your report. Our moderation team will review it shortly.',
          ephemeral: true,
        });
      },
    });

    await interaction.showModal(modal);
  }
}
