import { Command } from 'commander';
import { input, password, select } from '@inquirer/prompts';
import { loginWithEmailAndPassword, validatePluginToken } from '../api/client';
import { saveSession, getSession } from '../auth/session';
import { handleError } from '../utils/errors';

export const loginCommand = new Command('login')
  .description('Authenticate VAULTX CLI')
  .action(async () => {
    try {
      const existingSession = getSession();
      if (existingSession) {
        console.log(`\n✅ You are already authenticated as ${existingSession.email}.\n`);
        return;
      }

      console.log('\n🔐 VAULTX Authentication\n');

      const authMethod = await select({
        message: 'How would you like to authenticate?',
        choices: [
          {
            name: 'Direct Login (Email/Password)',
            value: 'email',
            description: 'Direct login requires Email/Password Auth to be enabled in Supabase.'
          },
          {
            name: 'Universal Plugin Token',
            value: 'token',
            description: 'Use a token from the web dashboard (or Supabase Access Token for testing).'
          }
        ]
      });

      let sessionData;

      if (authMethod === 'email') {
        const email = await input({
          message: 'Email:',
          validate: (val) => val.includes('@') || 'Please enter a valid email address.'
        });

        const pwd = await password({
          message: 'Password:',
          mask: '*'
        });

        console.log('\nAuthenticating...');
        sessionData = await loginWithEmailAndPassword(email, pwd);
      } else {
        const tokenInput = await password({
          message: 'Plugin Token (or Supabase Access Token):',
          mask: '*'
        });

        console.log('\nVerifying token...');
        sessionData = await validatePluginToken(tokenInput);
      }
      
      saveSession({
        token: sessionData.token,
        email: sessionData.email,
        expiresAt: sessionData.expiresAt
      });

      console.log(`\n✅ Successfully authenticated CLI for ${sessionData.email}\n`);
    } catch (error) {
      handleError(error);
    }
  });
