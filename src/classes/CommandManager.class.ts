import {
  ChatInputCommandInteraction,
  Client,
  MessageContextMenuCommandInteraction,
  RESTPostAPIApplicationCommandsJSONBody,
  UserContextMenuCommandInteraction,
} from 'discord.js';

import { ILogger } from '../types/logger.js';

import { Command } from './Command.class.js';
import { SubcommandGroup } from './SubcommandGroup.class.js';
import { ErrorReporter } from '../utils/ErrorReporter.js';
import { MessageContextMenuCommand } from './MessageContextMenuCommand.class.js';
import { UserContextMenuCommand } from './UserContextMenuCommand.class.js';
import { LoadCommandsOptions } from '../types/loadCommands.js';
import { loadCommands } from '../utils/loadCommands.js';
import { deprecatorWarner } from '../utils/deprecatorWarner.js';

export class CommandManager {
  private commands: Map<string, Command | SubcommandGroup> = new Map();
  private userContextMenuCommands: Map<string, UserContextMenuCommand> = new Map();
  private messageContextMenuCommands: Map<string, MessageContextMenuCommand> = new Map();

  protected logger?: ILogger;
  protected errorReporter?: ErrorReporter;

  /**
   * Register commands (accepts single, array, or mixed types)
   * @param command - Command(s) to register
   * @example
   * ```typescript
   * // Single command
   * commandManager.registerCommand(new PingCommand());
   * 
   * // Array of commands
   * commandManager.registerCommand([cmd1, cmd2, cmd3]);
   * 
   * // Mixed types
   * commandManager.registerCommand([
   *   new PingCommand(),
   *   new UserContextMenu(),
   *   new SubcommandGroup(),
   * ]);
   * ```
   */
  registerCommand(
    command:
      | Command
      | SubcommandGroup
      | UserContextMenuCommand
      | MessageContextMenuCommand
      | Array<Command | SubcommandGroup | UserContextMenuCommand | MessageContextMenuCommand | any>
  ): void {
    if (Array.isArray(command)) {
      for (const cmd of command) {
        this.registerCommand(cmd);
      }
      return;
    }

    if (this.logger && 'setLogger' in command) {
      command.setLogger(this.logger);
    }
    if (this.errorReporter && 'setErrorReporter' in command) {
      command.setErrorReporter(this.errorReporter);
    }

    if (command instanceof Command || command instanceof SubcommandGroup) {
      this.commands.set(command.name, command);
    } else if (command instanceof UserContextMenuCommand) {
      this.userContextMenuCommands.set(command.name, command);
    } else if (command instanceof MessageContextMenuCommand) {
      this.messageContextMenuCommands.set(command.name, command);
    } else {
      this.logger?.warn(
        `Attempted to register invalid command type: ${(command as any)?.constructor?.name || 'unknown'}`,
        'command-manager',
      );
    }
  }

  /**
   * @experimental
   * Automatically load and register all commands from a directory.
   * 
   * This is a convenience wrapper around the loadCommands utility.
   * 
   * @param dirPath - Absolute path to the directory containing commands
   * @param options - Optional configuration
   * @returns Number of commands successfully loaded
   * 
   * @example
   * ```typescript
   * // Basic usage
   * const count = await commandManager.loadFromDirectory('./src/commands');
   * console.log(`Loaded ${count} commands`);
   * 
   * // With options
   * await commandManager.loadFromDirectory('./src/commands', {
   *   verbose: true,
   *   skipDirs: ['subcommands', 'test'],
   * });
   * ```
   */
  async loadFromDirectory(
    dirPath: string,
    options: LoadCommandsOptions = {},
  ): Promise<number> {
    const commands = await loadCommands(dirPath, options);
    
    this.registerCommand(commands);

    const validCount = commands.filter(cmd =>
      cmd instanceof Command ||
      cmd instanceof SubcommandGroup ||
      cmd instanceof UserContextMenuCommand ||
      cmd instanceof MessageContextMenuCommand
    ).length;

    this.logger?.info(
      `Auto-loaded ${validCount} commands from ${dirPath}`,
      'command-manager',
    );

    return validCount;
  }

  /**
   * @deprecated Use `registerCommand()` instead
   * 
   * Register a single command or subcommand group
   */
  register(command: Command | SubcommandGroup): this {
    deprecatorWarner('register()', 'registerCommand()');
    this.registerCommand(command);
    return this;
  }

  /**
   * @deprecated Use `registerCommand()` with an array instead
   * 
   * Register multiple commands at once
   */
  registerMultiple(commands: Array<Command | SubcommandGroup>): this {
    deprecatorWarner('registerMultiple()', 'registerCommand()');
    this.registerCommand(commands);
    return this;
  }

  /**
   * Get a specific slash command by name
   */
  get(name: string): Command | SubcommandGroup | undefined {
    return this.commands.get(name);
  }

  /**
   * Get a specific user context menu command by name
   */
  getUserContextMenu(name: string): UserContextMenuCommand | undefined {
    return this.userContextMenuCommands.get(name);
  }

  /**
   * Get a specific message context menu command by name
   */
  getMessageContextMenu(name: string): MessageContextMenuCommand | undefined {
    return this.messageContextMenuCommands.get(name);
  }

  /**
   * Get all registered slash commands
   */
  getAll(): Array<Command | SubcommandGroup> {
    return Array.from(this.commands.values());
  }

  /**
   * Get all registered user context menu commands
   */
  getAllUserContextMenus(): UserContextMenuCommand[] {
    return Array.from(this.userContextMenuCommands.values());
  }

  /**
   * Get all registered message context menu commands
   */
  getAllMessageContextMenus(): MessageContextMenuCommand[] {
    return Array.from(this.messageContextMenuCommands.values());
  }

  /**
   * Get all slash commands sorted alphabetically by name
   */
  getAllSorted(): Array<Command | SubcommandGroup> {
    return this.getAll().sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Convert all commands to Discord JSON format for registration
   */
  toJSON(): RESTPostAPIApplicationCommandsJSONBody[] {
    const slashCommands = Array.from(
      this.commands.values()
    ).map((cmd) => {
      if (process.env.ENV === 'dev') {
        console.log(`Registering: ${cmd.name}`);
      }
      return cmd.toJSON();
    });

    const userContextMenus = Array.from(
      this.userContextMenuCommands.values()
    ).map((cmd) => {
      if (process.env.ENV === 'dev') {
        console.log(`Registering user context menu: ${cmd.name}`);
      }
      return cmd.toJSON();
    });

    const messageContextMenus = Array.from(
      this.messageContextMenuCommands.values(),
    ).map((cmd) => {
      if (process.env.ENV === 'dev') {
        console.log(`Registering message context menu: ${cmd.name}`);
      }
      return cmd.toJSON();
    });

    return [...slashCommands, ...userContextMenus, ...messageContextMenus];
  }

  /**
   * Generate paginated help pages for display in help command
   * Returns a 2D array where each inner array is a page of command descriptions
   *
   * @param commandsPerPage - How many regular commands to show per page (default: 10)
   * @returns 2D array of command info for pagination
   */
  getHelpPages(
    commandsPerPage: number = 5,
  ): Array<Array<{ name: string; value: string }>> {
    const subcommandPages: Array<Array<{ name: string; value: string }>> = [];
    const otherCommands: Array<{ name: string; value: string }> = [];

    for (const command of this.getAllSorted()) {
      if (command instanceof SubcommandGroup) {
        // Each subcommand group gets its own page
        const page = [
          {
            name: `─── ${command.name.toUpperCase()} ───`,
            value: command.description || 'No description.',
          },
          ...command.getSubcommandList().map((sub) => ({
            name: `› ${sub.name}`,
            value: sub.description,
          })),
        ];
        subcommandPages.push(page);
      } else {
        // Regular commands are grouped together
        // Add a header when starting a new page
        if (otherCommands.length % commandsPerPage === 0) {
          otherCommands.push({
            name: `─── OTHER ───`,
            value: 'Other commands',
          });
        }
        otherCommands.push({
          name: `› ${command.name}`,
          value: command.description,
        });
      }
    }

    // Combine subcommand pages first, then regular command pages
    const allPages = [...subcommandPages];

    // Split regular commands into pages
    while (otherCommands.length) {
      allPages.push(otherCommands.splice(0, commandsPerPage));
    }

    return allPages;
  }

  /**
   * Execute a command by name
   * This is called from your interaction handler
   */
  async executeCommand(
    commandName: string,
    interaction: ChatInputCommandInteraction,
    client: Client,
  ): Promise<void> {
    const command = this.get(commandName);

    if (!command) {
      throw new Error(`Command not found: ${commandName}`);
    }

    await command.execute(interaction, client);
  }

  /**
   * Execute a user context menu command.
   */
  async executeUserContextMenu(
    commandName: string,
    interaction: UserContextMenuCommandInteraction,
    client: Client,
  ): Promise<void> {
    const command = this.userContextMenuCommands.get(commandName);

    if (!command) {
      throw new Error(`User context menu command not found: ${commandName}`);
    }

    await command.execute(interaction, client);
  }

  /**
   * Execute a message context menu command.
   */
  async executeMessageContextMenu(
    commandName: string,
    interaction: MessageContextMenuCommandInteraction,
    client: Client,
  ): Promise<void> {
    const command = this.messageContextMenuCommands.get(commandName);

    if (!command) {
      throw new Error(`Message context menu command not found: ${commandName}`);
    }

    await command.execute(interaction, client);
  }

  /**
   * Get total number of registered slash commands
   */
  get size(): number {
    return this.commands.size;
  }

  /**
   * Get total number of all registered commands
   */
  get totalSize(): number {
    return this.commands.size + 
            this.userContextMenuCommands.size + 
            this.messageContextMenuCommands.size;
  }

  /**
   * Check if a slash command exists
   */
  has(name: string): boolean {
    return this.commands.has(name);
  }

  /**
   * Check if a user context menu command exists
   */
  hasUserContextMenu(name: string): boolean {
    return this.userContextMenuCommands.has(name);
  }

  /**
   * Check if a message context menu command exists
   */
  hasMessageContextMenu(name: string): boolean {
    return this.messageContextMenuCommands.has(name);
  }

  /**
   * Check if any command (slash, user context, or message context) exists
   */
  hasAny(name: string): boolean {
    return this.commands.has(name) || 
            this.userContextMenuCommands.has(name) || 
            this.messageContextMenuCommands.has(name);
  }

  /**
   * Remove a slash command (useful for hot-reloading in dev)
   */
  unregister(name: string): boolean {
    return this.commands.delete(name);
  }

  /**
   * Remove a user context menu command
   */
  unregisterUserContextMenu(name: string): boolean {
    return this.userContextMenuCommands.delete(name);
  }

  /**
   * Remove a message context menu command
   */
  unregisterMessageContextMenu(name: string): boolean {
    return this.messageContextMenuCommands.delete(name);
  }

  /**
   * Clear all commands (slash commands, user context menus, and message context menus)
   */
  clear(): void {
    this.commands.clear();
    this.userContextMenuCommands.clear();
    this.messageContextMenuCommands.clear();
  }

  /**
   * Get slash command names as an array
   */
  getCommandNames(): string[] {
    return Array.from(this.commands.keys());
  }

  /**
   * Get user context menu command names as an array
   */
  getUserContextMenuNames(): string[] {
    return Array.from(this.userContextMenuCommands.keys());
  }

  /**
   * Get message context menu command names as an array
   */
  getMessageContextMenuNames(): string[] {
    return Array.from(this.messageContextMenuCommands.keys());
  }

  /**
   * Get all command names (slash + context menus) as an array
   */
  getAllCommandNames(): string[] {
    return [
      ...this.getCommandNames(),
      ...this.getUserContextMenuNames(),
      ...this.getMessageContextMenuNames(),
    ];
  }

  setLogger(logger: ILogger): this {
    this.logger = logger;

    // Inject logger into all already-registered commands
    for (const command of this.commands.values()) {
      command.setLogger(logger);
    }
    for (const command of this.userContextMenuCommands.values()) {
      command.setLogger(logger);
    }
    for (const command of this.messageContextMenuCommands.values()) {
      command.setLogger(logger);
    }

    return this;
  }

  /**
   * Set the error reporter for all commands
   */
  setErrorReporter(reporter: ErrorReporter): this {
    this.errorReporter = reporter;

    for (const command of this.commands.values()) {
      command.setErrorReporter(reporter);
    }
    for (const command of this.userContextMenuCommands.values()) {
      command.setErrorReporter(reporter);
    }
    for (const command of this.messageContextMenuCommands.values()) {
      command.setErrorReporter(reporter);
    }

    return this;
  }
}