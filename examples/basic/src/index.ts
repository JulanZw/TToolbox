import 'dotenv/config';

import {
  CommandManager,
  AutocompleteManager
} from '@julanzw/ttoolbox-discordjs-framework';
import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';

import { PingCommand } from './commands/ping.js';
import { HelpSubcommandGroup } from './commands/help/helpSubcommandGroup.js';

// Initialize Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Initialize managers
export const commandManager = new CommandManager();
const autocompleteManager = new AutocompleteManager();

// Register commands
commandManager.registerCommand([
  new PingCommand(),
  new HelpSubcommandGroup(),
]);

// Register commands on bot ready
client.once('clientReady', async (readyClient) => {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
  const commands = commandManager.toJSON();
  await rest.put(Routes.applicationCommands(readyClient.user.id), {
    body: commands,
  });
});

// Register autocomplete for /help command <name>
autocompleteManager.register('help', 'name', async (interaction, value) => {
  const commands = commandManager.getAllSorted();

  return commands
    .filter((cmd) =>
      cmd.name.toLowerCase().includes(value.toLowerCase()) ||
      cmd.description.toLowerCase().includes(value.toLowerCase())
    )
    .slice(0, 25)
    .map((cmd) => ({
      name: `${cmd.name} - ${cmd.description.slice(0, 50)}`,
      value: cmd.name,
    }));
});

// Handle interactions
client.on('interactionCreate', async (interaction) => {
  console.log(`Received interaction: ${interaction.isChatInputCommand()} (${interaction.id})`);
  if (interaction.isChatInputCommand()) {
    await commandManager.executeCommand(
      interaction.commandName,
      interaction,
      client,
    );
  }

  if (interaction.isAutocomplete()) {
    await autocompleteManager.handle(interaction);
  }
});

// Login
client.once('clientReady', () => {
  console.log(`✅ Logged in as ${client.user?.tag}`);
  console.log(`📦 Loaded ${commandManager.size} commands`);
});

client.login(process.env.DISCORD_TOKEN);