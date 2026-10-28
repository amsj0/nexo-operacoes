# Security and deployment boundaries

Nexo is a demonstration with fictional institutional data. Source visibility and deployment access are separate choices.

## Authentication and authorization

- The main pilot assumes an owner-private Sites deployment. Its management and wallet APIs are not independently protected for anonymous public deployment.
- Fictional profile selection is not authentication. Request parameters such as `personId` are demonstration inputs, not verified institutional identities.
- Partner administration requires a trusted visitor identity and a server-side administrator allowlist. Partner sessions also check signature, issuer, audience, expiry, revocation, actor binding, institution membership, service policy, and operation scope.
- The current `oai-authenticated-user-*` headers must come from a trusted gateway that strips untrusted incoming values. A directly reachable custom deployment cannot treat those headers as proof of identity.
- The bundled local sign-in mock is restricted to loopback development. It is not a production identity provider.

## Demonstration limits

Institutional identity and the partner's MFA flag are simulated. Google-issued institutional sessions, real two-factor authentication, official QR readers, and live external institutional systems are not integrated.

The integration inspector adds AES-256-GCM payload protection to HTTPS. The partner emulator uses signed sessions over HTTPS, with its institutional adapter in the same application. Neither mechanism supplies missing user authorization or replaces TLS. Signing a token does not encrypt its contents.

## Before a public operational deployment

1. Add verified authentication and enforce roles and resource ownership in every server operation, including catalog/user management and wallet actions.
2. Configure a trusted identity gateway or replace the Sites identity adapter. Prevent direct access that bypasses the gateway.
3. Provision a separate D1 database and apply the migrations through a controlled deployment process.
4. Keep secrets and administrator configuration in the hosting platform's server-side secret store. Use HTTPS and appropriate session/cookie controls.
5. Implement real institutional connectors, membership mapping, and MFA verification as required by the institution; define retention, rate limits, backups, and operational monitoring for the intended deployment.

Never commit `.env` files, `.dev.vars`, API credentials, live database exports, signing keys, cookies, or tokens. `.dev.vars.example` contains a fictional loopback development identity only.

## Reporting a concern

For non-sensitive defects, use repository issues. Do not publish real credentials, session material, private institutional data, or exploitable details in a public issue; contact the repository owner through an appropriate private channel instead.
