import { Command, SubcommandGroup } from '@julanzw/ttoolbox-discordjs-framework';

import { CloseCommand } from './subcommands/CloseCommand.js';
import { ListCommand } from './subcommands/ListCommand.js';
import { SetupChannelCommand } from './subcommands/SetupChannelCommand.js';
import { TicketManager } from '../../tickets/TicketManager.js';

export class TicketSubcommandGroup extends SubcommandGroup {
  name = 'ticket';
  description = 'Manage support tickets';

  private closeCommand = new CloseCommand(this.ticketManager);
  private listCommand = new ListCommand(this.ticketManager);
  private setupChannelCommand = new SetupChannelCommand();

  protected subcommands = new Map<string, Command>([
    [this.closeCommand.name, this.closeCommand],
    [this.listCommand.name, this.listCommand],
    [this.setupChannelCommand.name, this.setupChannelCommand],
  ]);

  constructor(private ticketManager: TicketManager) {
    super();
  }
}
