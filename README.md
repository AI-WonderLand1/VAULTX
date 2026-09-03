# VAULTX Secrets Manager

VAULTX is a React/Vite dashboard with a Node/Express API and a TypeScript CLI.

## Security boundary

Secret values are encrypted and decrypted only by the VAULTX server using AES-256-GCM.

`VAULTX_ENCRYPTION_KEY` is server-only. It must never use the `VITE_` prefix.

The browser keeps only public Supabase configuration:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The VAULTX API validates the signed-in user's Supabase session and performs secret operations server-side.

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` from `.env.example` and set:

   ```env
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   VAULTX_ENCRYPTION_KEY=...
   ```

3. Generate the encryption key if needed:

   ```bash
   openssl rand -hex 32
   ```

4. Start the VAULTX API in terminal 1:

   ```bash
   npm run dev:server
   ```

5. Start Vite in terminal 2:

   ```bash
   npm run dev
   ```

The Vite development server proxies `/api` to `http://localhost:8787`.

## Production

Build the frontend:

```bash
npm run build
```

Then run the combined VAULTX server:

```bash
npm start
```

The deployment runtime must provide `VAULTX_ENCRYPTION_KEY`. A GitHub Actions secret is safe only if your deployment workflow passes it to the server runtime; it must never be passed into a `VITE_*` build variable.

## CLI

The CLI lives in `packages/vaultx-cli`.

```bash
npx tsx packages/vaultx-cli/src/index.ts
```

Plugin-token authentication is still under development and is separate from the dashboard's Supabase login.
