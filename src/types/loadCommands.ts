/**
 * Options for loading commands from a directory
 */
export interface LoadCommandsOptions {
  /**
   * Whether to recursively search subdirectories (default: true)
   */
  recursive?: boolean;

  /**
   * Whether to log verbose output to console (default: false)
   */
  verbose?: boolean;

  /**
   * Directory names to skip (default: ['subcommands', 'utils', 'helpers', 'lib'])
   * Case-insensitive partial matching
   */
  skipDirs?: string[];

  /**
   * File name patterns to skip (default: ['Helper', 'Util', '.test', '.spec'])
   * Case-sensitive partial matching
   */
  skipFiles?: string[];

  /**
   * Custom filter function for fine-grained control (optional)
   * Return true to include the file, false to skip
   * Runs AFTER skipDirs and skipFiles checks
   */
  filter?: (filePath: string) => boolean;
}