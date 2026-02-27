import { readdir, stat } from 'fs/promises';
import { join, extname } from 'path';
import { pathToFileURL } from 'url';
import { LoadCommandsOptions } from '../types/loadCommands';

/**
 * @experimental
 * Automatically discover and load all commands from a directory.
 * 
 * Returns an array of command instances that can be registered with CommandManager.
 * 
 * @param dirPath - Absolute path to the directory containing commands
 * @param options - Optional configuration
 * @returns Array of command instances
 * 
 * @example
 * ```typescript
 * import { loadCommands } from '@julanzw/ttoolbox-discordjs-framework';
 * 
 * // Load all commands
 * const commands = await loadCommands('./src/commands', { verbose: true });
 * 
 * // Register them
 * commandManager.registerCommand(commands);
 * 
 * // Or filter/process them first
 * const adminCommands = commands.filter(cmd => cmd.name.startsWith('admin'));
 * commandManager.registerCommand(adminCommands);
 * ```
 */
export async function loadCommands(
  dirPath: string,
  options: LoadCommandsOptions = {},
): Promise<any[]> {
  const {
    recursive = true,
    verbose = false,
    skipDirs = ['subcommands', 'utils', 'helpers', 'lib'],
    skipFiles = ['Helper', 'Util', '.test', '.spec'],
    filter,
  } = options;

  const allCommands: any[] = [];

  try {
    const files = await getFilesRecursive(dirPath, recursive, skipDirs, skipFiles, filter);

    if (verbose) {
      console.log(`Found ${files.length} potential command files in ${dirPath}`);
    }

    for (const file of files) {
      try {
        const commands = await loadCommandsFromFile(file, verbose);
        allCommands.push(...commands);
      } catch (err: any) {
        if (verbose) {
          console.error(`⚠️ Failed to load ${file}: ${err.message}`);
        }
      }
    }

    if (verbose) {
      console.log(`\n✅ Successfully loaded ${allCommands.length} commands`);
    }

    return allCommands;
  } catch (err: any) {
    throw new Error(`Failed to load commands from ${dirPath}: ${err.message}`);
  }
}

/**
 * Recursively get all .js/.ts files from a directory with smart filtering
 */
async function getFilesRecursive(
  dirPath: string,
  recursive: boolean,
  skipDirs: string[],
  skipFiles: string[],
  customFilter?: (filePath: string) => boolean,
): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dirPath);

  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const stats = await stat(fullPath);

    if (stats.isDirectory()) {
      if (skipDirs.some(skip => entry.toLowerCase().includes(skip.toLowerCase()))) {
        continue;
      }

      if (recursive) {
        const subFiles = await getFilesRecursive(
          fullPath,
          recursive,
          skipDirs,
          skipFiles,
          customFilter,
        );
        files.push(...subFiles);
      }
    } else {
      const ext = extname(entry);

      if (ext !== '.js' && ext !== '.ts') continue;

      if (skipFiles.some(skip => entry.includes(skip))) continue;

      if (customFilter && !customFilter(fullPath)) continue;

      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Load all command exports from a single file
 */
async function loadCommandsFromFile(filePath: string, verbose: boolean): Promise<any[]> {
  const commands: any[] = [];

  const fileUrl = pathToFileURL(filePath).href;

  const module = await import(fileUrl);

  if (module.default) {
    commands.push(module.default);
    if (verbose) {
      const type = getCommandType(module.default);
      const name = module.default.name || 'unnamed';
      console.log(`  ✓ ${type}: ${name}`);
    }
  }

  for (const [exportName, exportValue] of Object.entries(module)) {
    if (exportName === 'default') continue;

    commands.push(exportValue);
    if (verbose) {
      const type = getCommandType(exportValue);
      const name = (exportValue as any).name || exportName;
      console.log(`  ✓ ${type}: ${name}`);
    }
  }

  return commands;
}

/**
 * Get a human-readable type name for a command
 */
function getCommandType(obj: any): string {
  const constructorName = obj?.constructor?.name;

  if (constructorName?.includes('SubcommandGroup')) return 'SubcommandGroup';
  if (constructorName?.includes('UserContextMenu')) return 'UserContextMenu';
  if (constructorName?.includes('MessageContextMenu')) return 'MessageContextMenu';
  if (constructorName?.includes('Command')) return 'Command';

  return 'Unknown';
}