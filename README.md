<p align="center">
  <img src="mockatoo-logo.png" alt="Mockatoo" width="128" height="128">
</p>

<h1 align="center">Mockatoo</h1>

<p align="center">
  Develop and test OAuth flows in the agentic era.
</p>

<p align="center">
  One OAuth provider for development, E2E tests, CI, and the agents that write them.
</p>

<p align="center">
  <a href="https://mockatoo.globalunderdog.com">Website</a> ·
  <a href="https://mockatoo.globalunderdog.com/docs">Documentation</a> ·
  <a href="https://github.com/mockatoo/connectors">Connectors</a> ·
  <a href="https://app.mockatoo.globalunderdog.com">Create a test account</a>
</p>

# Mockatoo connectors

Open source connectors and documentation for [Mockatoo](https://mockatoo.globalunderdog.com). The connectors and documentation are MIT licensed. The hosted OAuth server is accessed at [https://app.mockatoo.globalunderdog.com](https://app.mockatoo.globalunderdog.com).

## Install

The npm packages have not been released yet. Install from GitHub with pnpm:

```sh
pnpm add @mockatoo/connectors@github:mockatoo/connectors#main
```

Import Better Auth helpers from `@mockatoo/connectors/better-auth`, or Auth.js
helpers from `@mockatoo/connectors/authjs`. These entry points export TypeScript
source; Next.js apps should add `@mockatoo/connectors` to `transpilePackages`.
The individual `@mockatoo/connect-better-auth` and `@mockatoo/connect-authjs`
packages remain available in this source tree for a future npm release.

For agent-assisted setup, discover the public skill with:

```sh
npx skills add mockatoo/connectors --skill mockatoo
```

See the [documentation](https://mockatoo.globalunderdog.com/docs), [Mockatoo skill](skills/mockatoo/SKILL.md), and [examples](https://github.com/mockatoo/examples) for setup instructions.
