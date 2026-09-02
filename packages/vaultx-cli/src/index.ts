import { Command } from 'commander';
import { loginCommand } from './commands/login';
import { logoutCommand } from './commands/logout';
import { statusCommand } from './commands/status';

const program = new Command();

program
  .name('vaultx')
  .description('VAULTX - Secrets and Connections Manager CLI')
  .version('1.0.0');

// Add commands
program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(statusCommand);

// Parse input
program.parse(process.argv);

// Display help if no arguments are provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
