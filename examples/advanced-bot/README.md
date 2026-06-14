# Advanced Bot Example

A feature-complete Discord bot demonstrating the full TToolbox surface area, built around a support ticket system.

## Commands

### Slash commands

| Command | Permission | Description |
| --- | --- | --- |
| `/ping` | user | Replies with bot latency |
| `/help list` | user | Paginated list of all commands |
| `/help command <name>` | user | Detailed info for a specific command (with autocomplete) |
| `/ticket close <id>` | admin | Close a ticket by ID (with autocomplete) |
| `/ticket list` | admin | Paginated list of open (or all) tickets |
| `/ticket setup-channel [channel]` | admin | Send the ticket panel to a channel |

### Context menu commands

| Command | Type | Description |
| --- | --- | --- |
| Get User Info | User | Shows account age, join date, and highest role |
| Report Message | Message | Opens a modal to collect a report reason |

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in your values:

```env
DISCORD_TOKEN=your_token_here
CLIENT_ID=your_client_id_here
```

3. Start the bot:

```bash
npm run dev
```

Commands are registered automatically on startup. To register to a specific guild during development, use `npm run deploy`.

## Project Structure

```text
src/
├── commands/
│   ├── ping.ts                              # /ping
│   ├── context/
│   │   ├── GetUserInfoCommand.ts            # Right-click user → Get User Info
│   │   └── ReportMessageCommand.ts          # Right-click message → Report Message
│   ├── help/
│   │   ├── helpSubcommandGroup.ts           # /help
│   │   └── subcommands/
│   │       ├── list.ts                      # /help list
│   │       └── command.ts                   # /help command <name>
│   └── ticket/
│       ├── TicketSubcommandGroup.ts         # /ticket
│       └── subcommands/
│           ├── CloseCommand.ts              # /ticket close
│           ├── ListCommand.ts               # /ticket list
│           └── SetupChannelCommand.ts       # /ticket setup-channel
├── tickets/
│   ├── TicketManager.ts                     # In-memory ticket store
│   └── setupTicketPanel.ts                  # Panel embed + button/modal handlers
├── BotHandler.ts                            # DiscordHandler subclass
└── index.ts                                 # Client setup and manager wiring
```

## What This Demonstrates

- `SubcommandGroup` — multi-level command organisation with injected dependencies
- `UserContextMenuCommand` / `MessageContextMenuCommand` — right-click context menu commands
- `ComponentManager` — persistent button and select-menu handlers
- `ModalManager` — building and registering modals (persistent and one-shot)
- `AutocompleteManager` — dynamic autocomplete backed by live data
- `PaginatedEmbed` — multi-page embeds with navigation buttons
- `DiscordHandler` — structured base class for all Discord event routing
- `TToolboxLogger` — file-based logger with console output and log rotation
- `InteractionError` — typed error for expected interaction failures

## Ticket Flow

1. An admin runs `/ticket setup-channel` in the desired channel — this posts the ticket panel embed.
2. Any user clicks **Open a Ticket**, fills in the modal, and a private thread is created.
3. Admins can close tickets via the **Close Ticket** button in the thread, or with `/ticket close <id>`.
4. `/ticket list` shows all open tickets with pagination; pass `show-closed: true` to include closed ones.

## Next Steps

Swap `TicketManager`'s in-memory `Map` for a database (e.g. Prisma) — the interface is already isolated so only `TicketManager.ts` needs to change.
