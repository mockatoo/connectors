---
description: "Mockatoo is a hosted OAuth provider for testing Google, GitHub, Apple and other social sign-in in CI, E2E tests and coding agents, with no bot checks."
---

# Mockatoo

A hosted OAuth provider for local development, CI, end-to-end browser tests, and coding agents. It mocks the sign-in flows of the major social providers with one shared client, so there is no app registration, reCAPTCHA, or bot detection, and headless browsers are accepted. The connectors for Better Auth and Auth.js are open source; the service is hosted.

Use Mockatoo only outside production. Select its connector behind a non-production check, and keep your test account's email and password in environment variables or CI secrets, never in source control.

Users do not need to know or configure the hosted URL. Both `@mockatoo/connect-better-auth` and `@mockatoo/connect-authjs` export `MOCKATOO_URL` for links and test helpers; import it from the connector your app uses instead of hardcoding the address or reading the environment yourself.

The exported value is `process.env.MOCKATOO_URL` or, when unset or empty, `https://app.mockatoo.globalunderdog.com`. It is resolved when the module loads. The environment override is for Mockatoo's own development. An explicit connector `origin` option overrides the URL for that call without changing the exported value. A manual OIDC integration without a connector must supply its own provider URL.

## Guides

- [Account flow](account-flow.md): Sign-up, login, sessions, password regeneration, consent, and the stable form labels
- [Email tags](email-tags.md): Sign in as other users with `you+<tag>@example.com`, and the tags that trigger edge cases
- [Playwright](playwright.md): Sign in from a Playwright test, with a distinct user per test
- [Cypress](cypress.md): Sign in from Cypress with `cy.origin`, cached sessions, every provider, and edge-case tags
- [Run in CI](ci.md): GitHub Actions secrets, workflow, and parallel workers

## Providers

- [Google](providers/google.md): Implemented flow, test addresses, and known differences
- [Microsoft](providers/microsoft.md): Implemented flow, tenants, test addresses, and known differences
- [GitHub](providers/github.md): Implemented flow, test addresses, and known differences
- [Apple](providers/apple.md): Implemented flow, test addresses, and known differences
- [Discord](providers/discord.md): Implemented flow, test addresses, and known differences
- [LinkedIn](providers/linkedin.md): Implemented flow, test addresses, and known differences
- [X](providers/x.md): Implemented flow, test addresses, and known differences
- [Facebook](providers/facebook.md): Implemented flow, test addresses, and known differences

Each provider page includes its test addresses and known differences. See
[Email tags](email-tags.md) for how tagged addresses work.
