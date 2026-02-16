# TToolbox Discord Framework

A TypeScript-first Discord.js command framework with built-in handlers, logging, and utilities.

I made this for my own bots, but feel free to use it yourself!

## Features

- **Class-based commands** - Clean, extensible command structure
- **Permission system** - Built-in user/admin/owner permission levels
- **Logger** - Flexible logging with custom levels and colors
- **Pagination** - Easy paginated embeds with buttons
- **Modal helpers** - Simplified modal management
- **Error handling** - Built-in error handling and validation
- **TypeScript** - Full type safety

## Installation

```bash
npm install @julanzw/ttoolbox-discord-framework discord.js
```

## Quick Start

```typescript
import { Client, GatewayIntentBits } from 'discord.js';
import { Command, CommandManager, TToolboxLogger } from '@julanzw/ttoolbox-discord-framework';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const logger = new TToolboxLogger();
const commandManager = new CommandManager();

// Create a command
class PingCommand extends Command {
  name = 'ping';
  description = 'Pong!';
  guildOnly = false;
  permissionLevel = 'user' as const;

  protected async run(interaction) {
    await interaction.reply('Pong!');
  }
}

// Register commands
commandManager
  .setLogger(logger)
  .register(new PingCommand());

// Handle interactions
client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    await commandManager.executeCommand(
      interaction.commandName,
      interaction,
      client
    );
  }
});

client.login(process.env.DISCORD_TOKEN);
```

## Documentation

(hopefully soon)

## License

AGPL-3.0 - See [LICENSE](./LICENSE) for details

## Contributing

Issues and pull requests are welcome!
