import 'dotenv/config';

import {
  CommandManager,
  ComponentManager,
  AutocompleteManager,
  ModalManager,
  TToolboxLogger,
} from '@julanzw/ttoolbox-discordjs-framework';
import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';

import { BotHandler } from './BotHandler.js';
import { TicketManager } from './tickets/TicketManager.js';
import { setupTicketHandlers } from './tickets/setupTicketPanel.js';

import { TicketSubcommandGroup } from './commands/ticket/TicketSubcommandGroup.js';
import { GetUserInfoCommand } from './commands/context/GetUserInfoCommand.js';
import { ReportMessageCommand } from './commands/context/ReportMessageCommand.js';
import { PingCommand } from './commands/ping.js';
import { HelpSubcommandGroup } from './commands/help/helpSubcommandGroup.js';

// ── Managers ────────────────────────────────────────────────────────────────
const logger = new TToolboxLogger({ logDir: './logs', logFileName: 'advanced-bot.log' });
const ticketManager = new TicketManager();
export const commandManager = new CommandManager();
const componentManager = new ComponentManager(logger);
const autocompleteManager = new AutocompleteManager();
const modalManager = new ModalManager();

// ── Commands ────────────────────────────────────────────────────────────────
commandManager.setLogger(logger);
commandManager.registerCommand([
  new TicketSubcommandGroup(ticketManager),
  new GetUserInfoCommand(),
  new ReportMessageCommand(modalManager),
  new PingCommand(),
  new HelpSubcommandGroup(),
]);

// ── Autocomplete: /ticket close id ──────────────────────────────────────────
// Completes open ticket IDs as the user types
autocompleteManager.register('ticket', 'id', async (_interaction, value) => {
  return ticketManager
    .search(value)
    .filter(t => t.open)
    .slice(0, 25)
    .map(t => ({ name: `${t.id} — ${t.subject}`, value: t.id }));
});

// ── Ticket panel ─────────────────────────────────────────────────────────────
setupTicketHandlers(componentManager, modalManager, ticketManager);

// ── Discord client ───────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

const handler = new BotHandler(
  client,
  commandManager,
  componentManager,
  autocompleteManager,
  modalManager,
  ticketManager,
  logger,
);

handler.setupErrorHandlers();
await handler.setupOtherHandlers();

client.once('ready', async () => {
  logger.info(`✅ Logged in as ${client.user?.tag}`, 'startup', true);
  logger.info(`📦 Loaded ${commandManager.size} commands`, 'startup', true);

  const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

  try {
    logger.info('🔄 Registering commands...', 'startup', true);
    const commands = commandManager.toJSON();
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID!), { body: commands });
    logger.info(`✅ Registered ${commands.length} commands`, 'startup', true);
  } catch (err) {
    logger.error(`❌ Failed to register commands: ${err}`, 'startup', true);
  }
});

client.login(process.env.DISCORD_TOKEN);
