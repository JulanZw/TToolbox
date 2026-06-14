# Basic Bot Example

A minimal Discord bot demonstrating the core TToolbox patterns.

## Commands

| Command | Description |
| --- | --- |
| `/ping` | Replies with bot latency |
| `/help list` | Paginated list of all commands |
| `/help command <name>` | Detailed info for a specific command (with autocomplete) |

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.example.env` to `.env` and fill in your values:

```env
DISCORD_TOKEN=your_token_here
```

3. Start the bot:

```bash
npm run dev
```

## Project Structure

```text
src/
├── commands/
│   ├── ping.ts                     # /ping — minimal Command example
│   └── help/
│       ├── helpSubcommandGroup.ts  # /help — SubcommandGroup example
│       └── subcommands/
│           ├── list.ts             # /help list
│           └── command.ts          # /help command <name>
└── index.ts                        # Client setup, managers, interaction routing
```

## What This Demonstrates

- `Command` — minimum viable slash command
- `SubcommandGroup` — grouping related subcommands under one top-level command
- `CommandManager` — registering and executing commands (`registerCommand`, `executeCommand`, `getAllSorted`)
- `AutocompleteManager` — wiring up autocomplete for a command option
- `PaginatedEmbed` — multi-page embeds with navigation buttons

## Next Steps

See [`examples/advanced-bot/`](../advanced-bot/) for a fuller example covering context menu commands, modals, components, a custom `DiscordHandler`, and a complete ticket system.
