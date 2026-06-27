# TToolbox Discord.js Framework

A TypeScript-first Discord.js command framework with built-in handlers, logging, and utilities.

[![github](https://img.shields.io/badge/Github-repo-gray?logo=github&labelColor=black)](https://github.com/JulanZw/TToolbox)
[![npm](https://img.shields.io/npm/v/@julanzw/ttoolbox-discordjs-framework?logo=npm&labelColor=red&color=gray)](https://www.npmjs.com/package/@julanzw/ttoolbox-discordjs-framework)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-gray?labelColor=orange)](./LICENSE)
[![Docs](https://img.shields.io/badge/Docs-typedoc-gray?labelColor=blue)](https://julanzw.github.io/TToolbox/)

I made this for my own bots, but feel free to use it yourself!

## Features

- **Slash commands** — class-based `Command` with typed options via `customize()`
- **Subcommand groups** — `SubcommandGroup` with a typed `subcommands` Map
- **Context menu commands** — `UserContextMenuCommand` and `MessageContextMenuCommand`
- **Lifecycle hooks** — `beforeExecute`, `afterExecute`, and `onError` on all command types
- **Permission system** — `user`, `admin`, `owner`, `disabled`, or any Discord permission bit
- **CommandManager** — central registry with auto-loader, help pages, and typed getters
- **ComponentManager** — buttons and select menus with dynamic ID base-matching and optional timeout/ephemeral
- **ModalManager** — declarative modal definitions with dynamic ID support
- **AutocompleteManager** — per-command/option handlers, auto-truncated to 25 choices
- **DiscordHandler** — abstract base class with automatic event wiring and custom handler registration
- **TToolboxLogger** — file logging with rotation, custom levels, ANSI colors, and an `ILogger` interface
- **ErrorReporter** — posts errors to a Discord channel as formatted embeds
- **PaginatedEmbed** — generic paginator with prev/next buttons and optional custom action buttons
- **Utilities** — `embedBuilder`, `safeReply`/`safeEdit`, slash command option helpers, date/duration formatters, `TIMES_MILISECONDS`

## Installation

```bash
npm install @julanzw/ttoolbox-discordjs-framework discord.js
```

## Core Concepts

### Commands

Extend `Command` and implement `run()`. Use `customize()` to add slash command options.

```typescript
import { Command } from '@julanzw/ttoolbox-discordjs-framework';
import { ChatInputCommandInteraction, Client, SlashCommandSubcommandBuilder } from 'discord.js';

export class BanCommand extends Command {
  name = 'ban';
  description = 'Ban a user';
  guildOnly = true;
  permissionLevel = 'admin' as const;

  customize(builder: SlashCommandSubcommandBuilder) {
    return builder.addUserOption(opt =>
      opt.setName('user').setDescription('User to ban').setRequired(true)
    );
  }

  protected async run(interaction: ChatInputCommandInteraction, client: Client) {
    const target = interaction.options.getUser('user', true);
    await interaction.reply(`Banned ${target.tag}`);
  }
}
```

### Subcommand Groups

Extend `SubcommandGroup` and populate the `subcommands` Map with `Command` instances.

```typescript
import { SubcommandGroup, Command } from '@julanzw/ttoolbox-discordjs-framework';
import { ListCommand } from './subcommands/ListCommand.js';
import { CloseCommand } from './subcommands/CloseCommand.js';

const listCommand = new ListCommand();
const closeCommand = new CloseCommand();

export class TicketSubcommandGroup extends SubcommandGroup {
  name = 'ticket';
  description = 'Manage support tickets';

  protected subcommands = new Map<string, Command>([
    [listCommand.name, listCommand],
    [closeCommand.name, closeCommand],
  ]);
}
```

### Context Menu Commands

Right-click context menus on users or messages. Extend `UserContextMenuCommand` or `MessageContextMenuCommand` and implement `run()`.

```typescript
import { UserContextMenuCommand } from '@julanzw/ttoolbox-discordjs-framework';
import { Client, UserContextMenuCommandInteraction } from 'discord.js';

export class GetUserInfoCommand extends UserContextMenuCommand {
  name = 'Get User Info';
  guildOnly = false;
  permissionLevel = 'user' as const;

  protected async run(interaction: UserContextMenuCommandInteraction, client: Client) {
    await interaction.reply({ content: `User ID: ${interaction.targetUser.id}`, ephemeral: true });
  }
}
```

### CommandManager

Central registry for all command types. Set it up once, then route interactions to it.

```typescript
import { CommandManager, TToolboxLogger } from '@julanzw/ttoolbox-discordjs-framework';

const logger = new TToolboxLogger();
const commandManager = new CommandManager();

commandManager.setLogger(logger).registerCommand([
  new PingCommand(),
  new TicketSubcommandGroup(),
  new GetUserInfoCommand(),
  new ReportMessageCommand(),
]);

// In your interactionCreate handler:
if (interaction.isChatInputCommand())
  await commandManager.executeCommand(interaction.commandName, interaction, client);
if (interaction.isUserContextMenuCommand())
  await commandManager.executeUserContextMenu(interaction.commandName, interaction, client);
if (interaction.isMessageContextMenuCommand())
  await commandManager.executeMessageContextMenu(interaction.commandName, interaction, client);

// Deploy commands to Discord:
await rest.put(Routes.applicationCommands(clientId), { body: commandManager.toJSON() });
```

### Lifecycle Hooks

All command types support three optional hooks. `beforeExecute` can return `false` to abort execution.

```typescript
export class AuditedCommand extends Command {
  name = 'delete-data';
  // ...

  async beforeExecute(interaction: ChatInputCommandInteraction): Promise<boolean> {
    const confirmed = /* check something */ true;
    return confirmed; // return false to stop execution
  }

  async afterExecute(interaction: ChatInputCommandInteraction): Promise<void> {
    this.log('delete-data ran successfully', 'info', 'audit');
  }

  async onError(interaction: ChatInputCommandInteraction, error: Error): Promise<void> {
    await interaction.reply({ content: 'Something went wrong.', ephemeral: true });
  }

  protected async run(interaction: ChatInputCommandInteraction) { /* ... */ }
}
```

### ComponentManager

Handles button and select menu interactions. Supports **dynamic ID base-matching**: registering `close-ticket` will match any custom ID that starts with `close-ticket` (e.g. `close-ticket:123`).

```typescript
import { ComponentManager } from '@julanzw/ttoolbox-discordjs-framework';

const componentManager = new ComponentManager(logger);

// Persistent button — handles all IDs starting with "close-ticket"
componentManager.registerButton('close-ticket', async (interaction) => {
  const ticketId = interaction.customId.split(':')[1];
  // close ticket...
});

// One-time button with timeout
componentManager.registerButton('confirm-action', async (interaction) => {
  // handle confirm...
}, { ephemeral: true, timeout: 30_000 });

// Select menu
componentManager.registerSelect('role-select', async (interaction) => {
  // handle selection...
});

// In your interactionCreate handler:
if (interaction.isButton()) await componentManager.handleButton(interaction);
if (interaction.isAnySelectMenu()) await componentManager.handleSelect(interaction);
```

### ModalManager

Define modals declaratively with `buildAndRegister()`. Supports dynamic IDs (e.g. `report:${interaction.id}`) for per-interaction, one-time modals.

```typescript
import { ModalManager } from '@julanzw/ttoolbox-discordjs-framework';
import { TextInputStyle } from 'discord.js';

const modalManager = new ModalManager();

const modal = modalManager.buildAndRegister({
  id: 'feedback-form',
  title: 'Submit Feedback',
  ephemeral: true,
  fields: [
    {
      customId: 'feedback-text',
      name: 'Your feedback',
      style: TextInputStyle.Paragraph,
      required: true,
      maxLength: 500,
    },
  ],
  onSubmit: async (interaction) => {
    const text = interaction.fields.getTextInputValue('feedback-text');
    await interaction.reply({ content: 'Thanks!', ephemeral: true });
  },
});

// Show it:
await interaction.showModal(modal);

// In your interactionCreate handler:
if (interaction.isModalSubmit()) await modalManager.handleSubmit(interaction);
```

### AutocompleteManager

Register a handler per command + option pair. Handlers return up to 25 choices; the manager truncates automatically.

```typescript
import { AutocompleteManager } from '@julanzw/ttoolbox-discordjs-framework';

const autocompleteManager = new AutocompleteManager(logger);

autocompleteManager.register('ticket', 'id', async (interaction, focusedValue) => {
  return openTickets
    .filter(t => t.id.includes(focusedValue))
    .map(t => ({ name: `${t.id} — ${t.subject}`, value: t.id }));
});

// In your interactionCreate handler:
if (interaction.isAutocomplete()) await autocompleteManager.handle(interaction);
```

### DiscordHandler

Extend this abstract class to wire up Discord events. Override only the handlers your bot needs — unoverridden abstract methods can be stubbed as empty. Call `setupOtherHandlers()` to activate them automatically.

```typescript
import { DiscordHandler } from '@julanzw/ttoolbox-discordjs-framework';
import { Client, Interaction, Message } from 'discord.js';

export class BotHandler extends DiscordHandler {
  constructor(client: Client, logger: ILogger) {
    super(client, logger);
  }

  protected async handleInteractionCreation(interaction: Interaction) {
    // Route to your managers
  }

  protected async handleMessageCreation(message: Message) {}
  protected async handleReactionAdded() {}
  protected async handleReactionRemoval() {}
  protected async handleMessageDeletion() {}
}

const handler = new BotHandler(client, logger);
handler.setupErrorHandlers(); // uncaughtException, unhandledRejection, SIGINT, SIGTERM
await handler.setupOtherHandlers();
```

Custom handlers for any Discord.js event can be added with `registerCustomHandler(event, handler)`.

### TToolboxLogger

File logger with console output, ANSI-colored levels, and log rotation. Implements `ILogger` so it can be swapped for any compatible logger.

```typescript
import { TToolboxLogger } from '@julanzw/ttoolbox-discordjs-framework';

const logger = new TToolboxLogger({ logDir: './logs', logFileName: 'bot.log' });

logger.info('Bot started', 'startup', true);   // true = also print to console
logger.warn('Rate limit hit', 'api');
logger.error('Unhandled error', 'handler', true);

logger.rotate(); // archives current log to a timestamped file, clears active log
```

Custom levels with ANSI colors:

```typescript
const logger = new TToolboxLogger({
  logDir: './logs',
  customLevels: { debug: '\x1b[35m' },
  extendDefaultLevels: true, // keep info/warn/error + add debug
});
```

### ErrorReporter

Posts unhandled errors to a Discord channel as rich embeds. Useful for production monitoring.

```typescript
import { ErrorReporter } from '@julanzw/ttoolbox-discordjs-framework';

const reporter = new ErrorReporter(client, process.env.ERROR_CHANNEL_ID!);

try {
  // ...
} catch (err) {
  await reporter.reportError(err as Error, 'command handler', { command: 'ban' });
}
```

### PaginatedEmbed

Generic paginator — pass any array of items and a function that builds the embed(s) for each page.

```typescript
import { PaginatedEmbed, TIMES_MILISECONDS } from '@julanzw/ttoolbox-discordjs-framework';
import { EmbedBuilder } from 'discord.js';

const paginator = new PaginatedEmbed(
  interaction,
  items,
  (item, index, total) => [
    new EmbedBuilder()
      .setTitle(`Item ${index + 1} of ${total}`)
      .setDescription(item.description),
  ],
  {
    timeout: TIMES_MILISECONDS.MINUTE * 5,
    extraButtons: [deleteButton],
    onCustomButton: async (action, index, items) => {
      if (action === 'delete') {
        items.splice(index, 1);
        return { handled: true, newItems: items };
      }
      return { handled: false };
    },
  }
);

await paginator.start();
```

### Utilities

**Embed & button helpers** (`embedBuilder`, `createButton`, `createPaginationButtons`, `createButtonsRow`):

```typescript
import { embedBuilder, createButton } from '@julanzw/ttoolbox-discordjs-framework';

const embed = embedBuilder({ title: 'Hello', description: 'World', color: '#5865F2' });
const btn = createButton({ type: 'delete', label: 'Remove', style: ButtonStyle.Danger });
```

**Safe reply/edit** — handles already-replied or deferred interactions, throws `InteractionError` if the interaction has expired:

```typescript
import { safeReply, safeEdit } from '@julanzw/ttoolbox-discordjs-framework';

await safeReply(interaction, 'Done!', true);
await safeEdit(interaction, 'Updated.');
```

**Slash command option helpers**:

```typescript
import { stringOption, userOption, channelOption } from '@julanzw/ttoolbox-discordjs-framework';

builder
  .addStringOption(stringOption('reason', 'Reason for action', true))
  .addUserOption(userOption('target', 'Target user'))
  .addChannelOption(channelOption('channel', 'Target channel'));
```

**Formatting utilities**: `formatDateToString`, `formatDateToDDMMYYYY`, `formatDuration(ms)`, `capitalizeFirst`, `getDaySuffix`.

**Time constants**:

```typescript
import { TIMES_MILISECONDS } from '@julanzw/ttoolbox-discordjs-framework';

TIMES_MILISECONDS.SECOND   // 1 000
TIMES_MILISECONDS.MINUTE   // 60 000
TIMES_MILISECONDS.TEN_MINUTES
TIMES_MILISECONDS.HOUR
TIMES_MILISECONDS.DAY
```

## Permission System

`permissionLevel` is required on every command type.

| Value | Who can use it |
|---|---|
| `'user'` | Anyone |
| `'admin'` | Guild administrators |
| `'owner'` | Bot owner (`process.env.OWNER_DISCORD_ID`) |
| `'disabled'` | Nobody — command is disabled |
| `null` | No restriction enforced |
| `bigint` / `PermissionFlagsBits` key | Users with that specific Discord permission |

## Auto-loader (experimental)

Scans a directory for command files and registers them automatically.

```typescript
const count = await commandManager.loadFromDirectory('./dist/commands', {
  recursive: true,
  verbose: false,
  skipDirs: ['__tests__'],
  skipFiles: ['base'],
});
```

## Examples

- [Basic bot](./examples/basic/) — ping command, subcommand group, autocomplete
- [Advanced bot](./examples/advanced-bot/) — context menus, modals, ticket system, `DiscordHandler`, full manager setup
- [Fully implemented bot](https://github.com/JulanZw/TibboBot) - one of my own bots that use the framework

## Documentation

Full API reference generated with TypeDoc: **[julanzw.github.io/TToolbox](https://julanzw.github.io/TToolbox/)**

## License

AGPL-3.0 — see [LICENSE](./LICENSE) for details.

## Contributing

Issues and pull requests are welcome!
