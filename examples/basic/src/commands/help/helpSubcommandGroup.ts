import { Command, SubcommandGroup } from '@julanzw/ttoolbox-discordjs-framework';

import { ListCommand } from './subcommands/list.js';
import { CommandInfoCommand } from './subcommands/command.js';

const listCommand = new ListCommand();
const commandInfoCommand = new CommandInfoCommand();

/**
 * Help command group providing information about bot commands.
 * 
 * This demonstrates how to structure a SubcommandGroup with multiple
 * subcommands organized in a dedicated folder.
 */
export class HelpSubcommandGroup extends SubcommandGroup {
  name = 'help';
  description = 'Get help with bot commands';
  guildOnly = false;
  permissionLevel = 'user' as const;

  protected subcommands = new Map<string, Command>([
    [listCommand.name, listCommand],
    [commandInfoCommand.name, commandInfoCommand],
  ]);
}