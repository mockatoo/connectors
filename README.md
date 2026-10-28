<p align="center">
  <img src="assets/mockatoo-logo.png" alt="Mockatoo" width="96" height="96">
</p>

<h1 align="center">Mockatoo connectors</h1>

<p align="center">
  Develop and test OAuth flows in the agentic era.
</p>

<p align="center">
  One OAuth provider for development, E2E tests, and the agents that write them.
  No app registration, bot checks, or fragile workarounds.
</p>

<p align="center">
  <a href="https://mockatoo.com">Website</a> ·
  <a href="https://www.mockatoo.com/docs">Documentation</a> ·
  <a href="https://app.mockatoo.globalunderdog.com">Create a test account</a>
</p>

## Why Mockatoo?

Mockatoo replaces live social providers outside production while keeping your app's normal OAuth flow. It is designed for development, automated browser tests, CI, and coding agents:

- **Headless-browser friendly** — no CAPTCHA, MFA, bot detection, or proof-of-work.
- **Built for E2E testing** — stable semantic HTML and generous rate limits for test bursts.
- **Fast to adopt** — use your framework's normal sign-in call and swap the provider address outside production.
- **Agent-friendly** — agents can create accounts and complete sign-in without human-only checks.

## Install a connector

```sh
pnpm add @mockatoo/connect-better-auth
# or
pnpm add @mockatoo/connect-authjs
```

The connectors currently support Better Auth and Auth.js. See the framework-specific guides in [`packages/connectors/`](packages/connectors/) and runnable examples in [`examples/`](examples/).

For agent-assisted setup:

```sh
npx skills add mockatoo/connectors --skill mockatoo
```

## How it works

1. Install the connector for your auth framework.
2. Point non-production OAuth requests at Mockatoo.
3. Keep production credentials and provider configuration unchanged.
4. Run the same sign-in flow locally, in CI, and in browser tests.

Mockatoo provides a shared test client and hosted OAuth server, so there is no provider application registration step for development.

## Supported integrations

- [Better Auth](packages/connectors/better-auth/README.md)
- [Auth.js](packages/connectors/authjs/README.md)
- [Mockatoo agent skill](skills/mockatoo/SKILL.md)

## License

The connectors, examples, and documentation are MIT licensed. The hosted OAuth service is accessed through [app.mockatoo.globalunderdog.com](https://app.mockatoo.globalunderdog.com).
