import { Command } from 'commander';
import { getSession, clearSession } from '../auth/session';
import { checkStatus } from '../api/client';
import { handleError } from '../utils/errors';

export const statusCommand = new Command('status')
  .description('Display basic CLI authentication state')
  .action(async () => {
    try {
      const session = getSession();
      
      console.log('\nVAULTX\n');

      if (!session) {
        console.log('Authenticated: No\n');
        console.log('Run:\nvaultx login\n');
        return;
      }

      try {
        // Validate the plugin token
        const info = await checkStatus(session.token);
        
        console.log('Authenticated: Yes');
        console.log(`Account: ${info.account}`);
        console.log('CLI: Connected\n');
      } catch (err) {
        // Token is likely expired or invalid
        clearSession();
        console.log('Authenticated: Session Expired\n');
        console.log('Run:\nvaultx login\n');
      }

    } catch (error) {
      handleError(error);
    }
  });
