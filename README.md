## Discord + Google Directory Cloudflare Worker

A Discord slash-command bot deployed on Cloudflare Workers that integrates with Google Workspace Admin SDK (Directory API). It verifies Discord interaction signatures and performs read/write admin operations when authorized via a Google Service Account with optional domain-wide delegation.

### Key features
- Verify Discord interaction signatures (ed25519)
- Slash commands for quick lookups and admin operations
  - `/user email:<user@example.com>`
  - `/group email:<group@example.com>`
  - `/admin ...` subcommands for groups, members, aliases, org units, roles, users, and user-aliases
- Google OAuth 2.0 Service Account JWT flow with optional domain-wide delegation
- Health endpoint at `GET /health`

---

## Requirements
- Discord Developer account and an Application (with a Bot)
- Google Cloud project with a Service Account
- Google Workspace domain (for Admin SDK access)
- Cloudflare account (Workers + Wrangler CLI)
- Node.js 18+ and npm

---

## Environment variables (what they are and where to get them)

Set these either in `wrangler.toml` under `[vars]` for development, or preferably via Cloudflare dashboard Secrets for production. Do not commit real secrets to git.

- DISCORD_PUBLIC_KEY: From Discord Developer Portal → Your Application → General Information → Public Key
- DISCORD_APP_ID: From Discord Developer Portal → Your Application → General Information → Application ID
- DISCORD_BOT_TOKEN: From Discord Developer Portal → Your Application → Bot → Reset Token (keep secret)
- GOOGLE_CLIENT_EMAIL: The `client_email` field from your Google service account JSON key
- GOOGLE_PRIVATE_KEY: The `private_key` field from your service account JSON key, PKCS#8 PEM. If stored in environment variables, encode newlines as `\n`
- GOOGLE_SUBJECT (optional but required for domain-wide delegation): An admin user email in your Workspace to impersonate (e.g. `admin@example.com`)
- GOOGLE_CUSTOMER (optional): Your Workspace customer ID (e.g. `C012abc3`); defaults to `my_customer` if omitted
- GOOGLE_SCOPES (optional): Comma-separated list to override all requested scopes from code (advanced; leave empty in normal use)
- SKIP_VERIFY (optional): Set to `true` only for local testing to bypass Discord signature verification; keep `false` in any real deployment

---

## Google Cloud and Workspace setup
1) Create Service Account
   - Google Cloud Console → IAM & Admin → Service Accounts → Create
   - Create and download a JSON key; you will use `client_email` and `private_key`

2) Enable Admin SDK API
   - Google Cloud Console → APIs & Services → Enable APIs and Services → Admin SDK

3) (Optional but recommended) Domain-wide delegation
   - In Service Account details → Enable domain-wide delegation
   - Copy the Client ID
   - Admin Console (Workspace) → Security → API controls → Domain-wide delegation → Add new
   - Client ID: the service account OAuth2 Client ID
   - Scopes: include the scopes this bot may use. Based on implemented features these include, as needed:
     - admin.directory.user.readonly
     - admin.directory.user
     - admin.directory.user.security
     - admin.directory.user.alias
     - admin.directory.group.readonly
     - admin.directory.group
     - admin.directory.group.member.readonly
     - admin.directory.group.member
     - admin.directory.orgunit.readonly
     - admin.directory.orgunit
     - admin.directory.rolemanagement.readonly
     - admin.directory.rolemanagement
   - If you use delegation, set `GOOGLE_SUBJECT` to an admin user email to impersonate

Notes:
- Without domain-wide delegation, calls are limited to the service account itself and most admin operations will fail.
- The code will request minimal scopes per operation, unless you explicitly set `GOOGLE_SCOPES` to override with a custom list (comma-separated).

---

## Discord setup
1) Create an Application and Bot
   - Discord Developer Portal → New Application → Add a Bot
2) Copy credentials
   - Public Key → `DISCORD_PUBLIC_KEY`
   - Application ID → `DISCORD_APP_ID`
   - Bot Token → `DISCORD_BOT_TOKEN` (keep private)
3) Set Interaction endpoint URL
   - After you deploy or run locally with a public tunnel, set it to: `https://<your-worker-domain>/interactions`

Register slash commands:
- Create a `.env` at project root with:
  - `DISCORD_BOT_TOKEN=...`
  - `DISCORD_APP_ID=...`
- Run `npm run register:commands`

---

## Cloudflare setup
- Install Wrangler globally or use via `npx`: `npm i -g wrangler` (optional)
- Authenticate: `wrangler login`
- Configure `wrangler.toml` (already present) and set the `[vars]` values or define them as Secrets:
  - `wrangler secrets put DISCORD_PUBLIC_KEY` (repeat for other secrets)

Routes used by this Worker:
- `POST /interactions` (Discord will call this)
- `GET /health` (simple health check)

---

## Development
Install dependencies:

```bash
npm i
```

Start local dev server:

```bash
npm run dev
```

Expose a public URL to Discord (choose one):
- Deploy to Cloudflare and use the deployed URL, or
- Use a tunneling solution to expose your local dev URL and set the Interaction endpoint to `<public-url>/interactions`

Register commands (once per environment or after changes):

```bash
npm run register:commands
```

---

## Deployment
Deploy the worker:

```bash
npm run deploy
```

Then set the Discord Interaction endpoint to your production URL: `https://<your-worker-domain>/interactions`.

---

## Commands overview
- Users
  - `/user email:<user@example.com>`
- Groups (quick list)
  - `/group email:<group@example.com>`
- Admin subcommand groups
  - `groups`: create, update, get, list, list-for-user, delete
  - `members`: add, update, list, remove
  - `aliases`: add, list, delete
  - `orgunits`: create, update, get, list, delete
  - `roles`: list, assignments, assign
  - `users`: create, update, make-admin, get, list, delete, undelete
  - `user-aliases`: create, list, delete

Command names are English; some option descriptions inside the registration script are in Turkish, which does not affect functionality.

---

## Security and tips
- Keep `DISCORD_BOT_TOKEN` and `GOOGLE_PRIVATE_KEY` secret; prefer Cloudflare Secrets for production
- `GOOGLE_PRIVATE_KEY` must be PKCS#8 PEM exactly as provided in the service account JSON. If stored in env, replace real newlines with `\n`
- Use `SKIP_VERIFY=true` only for local testing; never in production
- `GOOGLE_CUSTOMER` defaults to `my_customer` when not set
- If you encounter 401/403 from Google APIs, verify: domain-wide delegation, scopes granted, and that `GOOGLE_SUBJECT` is an admin user

---

## Scripts
- `npm run dev`: Run worker locally with Wrangler
- `npm run deploy`: Deploy to Cloudflare Workers
- `npm run register:commands`: Register global slash commands using Discord REST API