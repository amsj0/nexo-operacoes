# Nexo · Shared institutional services

Nexo is a Portuguese-language pilot for managing libraries, shared equipment, and teaching kits. It includes a configurable mobile service wallet and an administrator-only partner-server emulator with two fictional institutions.

This public repository contains the application source, database migrations, and automated checks. Publishing the source does **not** make the existing private deployment public or provide production authentication for a new deployment.

## Application areas

| Route | Purpose |
| --- | --- |
| `/` | Institutional management: catalog, people, reservations, loans, returns, reports, settings, and integration inspector. |
| `/mobile` | Configurable service wallet, catalog search, reservations, cancellations, and eligible renewals. |
| `/admin/parceiro` | Restricted partner emulator: session issuance and revocation, institution policies, protection tests, and decision trace. |
| `/mobile/parceiro` | Partner client for consulting and reserving books through verified simulated sessions. |

### Implemented workflows

- Persistent catalog and user registration in Cloudflare D1.
- Reservations with stock allocation, collection deadlines, and duplicate prevention.
- Staff confirmation of collection and return; cancellation and one eligible renewal.
- Server-side stock and user-limit checks, including concurrent reservations.
- Expired reservations release availability; overdue loans remain allocated.
- Activity history, filtered CSV export, and a demonstration user portal.
- A wallet whose selected services and order persist for each fictional profile.
- A simplified library API: `GET /api/biblioteca` and `POST /api/biblioteca`.
- An inspectable ECDH P-256 / HKDF-SHA256 / AES-256-GCM connector demonstration.
- Separate partner-emulator data for Instituto Horizonte and Centro Educacional Aurora, with signed five-minute sessions, revocation, membership checks, simulated MFA policies, and audit events.

The main wallet and partner client use separate records. Changing a fictional profile is a demonstration control, not an independent user login.

### Demonstrated future integrations

Rooms and spaces, materials requests, internal support tickets, documents, and appointments can be selected as wallet examples. Their operations are not implemented. Institutional Google sign-in, real MFA, official QR-code onboarding, and external institutional APIs are also future work.

## Technology

React 19, TypeScript, Vinext/Vite, Tailwind CSS, Cloudflare Workers, Cloudflare D1, and Drizzle ORM. The project retains the vendored Sites build integration and local tooling, including their license notices.

## Local development

Requirements: Node.js **22.13.0 or newer** and pnpm **11.25.0**, as pinned in `package.json`. Use a local checkout with an isolated demonstration database.

```bash
git clone https://github.com/amsj0/nexo-operacoes.git
cd nexo-operacoes
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
```

The build generates `dist/server/wrangler.json`. For a **new** local database, apply the four SQL migrations in filename order:

```bash
pnpm exec wrangler d1 execute DB --local --persist-to .wrangler/state --config dist/server/wrangler.json --file drizzle/0000_familiar_santa_claus.sql
pnpm exec wrangler d1 execute DB --local --persist-to .wrangler/state --config dist/server/wrangler.json --file drizzle/0001_watery_mordo.sql
pnpm exec wrangler d1 execute DB --local --persist-to .wrangler/state --config dist/server/wrangler.json --file drizzle/0002_gorgeous_the_liberteens.sql
pnpm exec wrangler d1 execute DB --local --persist-to .wrangler/state --config dist/server/wrangler.json --file drizzle/0003_moaning_grandmaster.sql
pnpm dev
```

Open the local URL printed by the development server. Migrations create the schema; use the application's initialization action to populate fictional pilot data. Do not rerun these raw migrations against an already initialized database.

For the partner emulator, copy `.dev.vars.example` to `.dev.vars` before starting development. It allows the bundled loopback-only mock sign-in identity. Use the local sign-in flow to obtain that development identity; choosing a fictional institutional profile does not authenticate an administrator.

Local identity emulation is development-only. The browser cryptography demonstration needs a secure browser context; use HTTPS when publishing. No Google or Cloudflare account credentials are included in this repository.

## Automated checks

```bash
pnpm typecheck
pnpm build
pnpm test:worker
```

`test:worker` runs the built Worker in an isolated Miniflare runtime with an ephemeral D1 database. It applies migrations and runs **49 checks** across circulation, mobile wallet/library operations, concurrency, encrypted messages, replay protection, partner sessions, institution membership, MFA scenarios, and revocation. It does not use the deployed database.

`scripts/verify-pilot.mjs`, `scripts/verify-mobile.mjs`, and `scripts/verify-partner.mjs` are invoked by the Worker test runner. The latter two require that runner's isolated request context.

## Deployment and access control

The full application needs a Worker runtime and D1; GitHub Pages cannot run its server APIs or database. `.openai/hosting.json` retains the `DB` binding declaration but intentionally omits the original Site's deployment identifier. Provision and configure your own resources for any new deployment.

**Keep operational deployments behind a trusted authentication gateway.** The original pilot's main management and wallet APIs rely on the private Sites perimeter. They are not a complete public multi-user authorization system. Partner administration additionally checks the authenticated identity and `NEXO_PARTNER_ADMIN_EMAILS`.

When migrating away from Sites, replace or securely reproduce its identity boundary before accepting requests. Never trust client-supplied `oai-authenticated-user-*` headers on a directly reachable Worker. Real institutional deployment also requires user-to-institution mapping, per-operation authorization, real MFA where required, and server-side external connectors. See [SECURITY.md](SECURITY.md).

Secrets, live database files, session keys, build outputs, local runtime state, and the original deployment identity are excluded from this export. The existing private Site is managed independently of this repository.

## API documentation

- [Mobile wallet and simplified library API](docs/mobile-api.md)
- [Partner-server emulator and multi-institution scenarios](docs/partner-emulator.md)
- [Security and deployment boundaries](SECURITY.md)

The connector endpoints are `POST /api/connector/handshake` and `POST /api/connector/exchange`. Encrypted connector payloads supplement HTTPS; signed partner JWTs protect integrity and authenticity but do not encrypt request bodies. Both demonstrations terminate in this application rather than an external institution.

## Licenses

Third-party license notices are retained beside vendored code and styles. No project-wide open-source license has been selected in this export; a public repository alone does not grant an additional license to the project's authored code.
