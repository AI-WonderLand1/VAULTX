import { Command } from 'commander';
import { clearSession, getSession } from '../auth/session';
import { handleError } from '../utils/errors';

export const logoutCommand = new Command('logout')
  .description('Remove the local CLI authentication session')
  .action(() => {
    try {
      const session = getSession();
      if (!session) {
        console.log('\nYou are not currently logged in.\n');
        return;
      }

      clearSession();
      console.log('\n👋 Local CLI session removed successfully.\n');
    } catch (error) {
      handleError(error);
    }
  });
