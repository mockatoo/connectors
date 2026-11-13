<p align="center">
  <img src="mockatoo-logo.png" alt="Mockatoo" width="128" height="128">
</p>

<h1 align="center">Mockatoo</h1>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="readme-headline-dark.svg">
    <img src="readme-headline-light.svg" alt="Test Google, Microsoft, GitHub, Apple, Discord, LinkedIn, X and Facebook sign-in in CI, without getting blocked. One free OAuth provider for agentic development, E2E tests, and CI. No app registration, no bot checks, no fragile workarounds." width="880">
  </picture>
</p>

<p align="center">
  <a href="https://github.com/mockatoo/connectors/actions/workflows/ci.yml"><img src="https://github.com/mockatoo/connectors/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

<p align="center">
  <a href="https://mockatoo.globalunderdog.com">Website</a> ·
  <a href="https://mockatoo.globalunderdog.com/docs">Documentation</a> ·
  <a href="https://github.com/mockatoo/connectors">Connectors</a> ·
  <a href="https://app.mockatoo.globalunderdog.com">Create a free test account</a>
</p>

# Mockatoo connectors

Open source connectors and documentation for [Mockatoo](https://mockatoo.globalunderdog.com). The connectors and documentation are MIT licensed. The hosted OAuth server is accessed at [https://app.mockatoo.globalunderdog.com](https://app.mockatoo.globalunderdog.com).

## Install

Run the CLI in your app's directory. It detects Better Auth or Auth.js, installs
the matching connector, and saves test credentials to `.env.local`:

```sh
npx -y @mockatoo/mockatoo@latest init
```

To install a connector yourself, add the package for your framework:

```sh
npm install @mockatoo/connect-better-auth   # Better Auth
npm install @mockatoo/connect-authjs        # Auth.js
```

For agent-assisted setup, discover the public skill with:

```sh
npx skills add mockatoo/connectors --skill mockatoo
```

See the [documentation](https://mockatoo.globalunderdog.com/docs), [Mockatoo skill](skills/mockatoo/SKILL.md), and [examples](https://github.com/mockatoo/examples) for setup instructions.
