import { UserContextMenuCommand } from '@julanzw/ttoolbox-discordjs-framework';
import {
  Client,
  EmbedBuilder,
  UserContextMenuCommandInteraction,
} from 'discord.js';

/**
 * Right-click a user → Apps → "Get User Info"
 */
export class GetUserInfoCommand extends UserContextMenuCommand {
  name = 'Get User Info';
  guildOnly = false;
  permissionLevel = 'user' as const;

  protected async run(
    interaction: UserContextMenuCommandInteraction,
    _client: Client,
  ): Promise<void> {
    const user = interaction.targetUser;
    const member = interaction.guild?.members.cache.get(user.id);

    const embed = new EmbedBuilder()
      .setTitle(user.tag)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: 'User ID', value: user.id, inline: true },
        { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
        ...(member ? [
          { name: 'Joined Server', value: member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>` : 'Unknown', inline: true },
          { name: 'Highest Role', value: member.roles.highest.toString(), inline: true },
        ] : []),
      )
      .setColor(0x5865f2)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}
