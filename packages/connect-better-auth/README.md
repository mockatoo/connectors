<p align="center">
  <img src="../../mockatoo-logo.png" alt="Mockatoo" width="128" height="128">
</p>

<h1 align="center">Mockatoo</h1>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../../readme-headline-dark.svg">
    <img src="../../readme-headline-light.svg" alt="Test Google, Microsoft, GitHub, Apple, Discord, LinkedIn, X and Facebook sign-in in CI, without getting blocked. OAuth testing for the agentic era: one provider for development, E2E tests, CI, and the agents that write them." width="880">
  </picture>
</p>

<p align="center">
  <a href="https://github.com/mockatoo/connectors/actions/workflows/ci.yml"><img src="https://github.com/mockatoo/connectors/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

<p align="center">
  <a href="https://mockatoo.globalunderdog.com">Website</a> ·
  <a href="https://mockatoo.globalunderdog.com/docs">Documentation</a> ·
  <a href="https://github.com/mockatoo/connectors">Connectors</a> ·
  <a href="https://app.mockatoo.globalunderdog.com">Create a test account</a>
</p>

# @mockatoo/connect-better-auth

A Better Auth plugin that adds a test mode for social sign-in. Google, GitHub and the other providers sign in against Mockatoo's hosted mock, so E2E tests, CI and coding agents don't need real accounts, app registration, or to get past the providers' bot checks.

## Why a plugin

Better Auth's built-in providers hardcode their endpoints, so you can't point `socialProviders.google` at a mock. Each `mockX()` builds Better Auth's own provider, then replaces it with a copy pointed at the mock's endpoints. Better Auth's own code still builds the authorization URL, exchanges the code, checks the ID token and maps the profile, so `authClient.signIn.social({ provider: "google" })` and the callback URL `/api/auth/callback/google` stay the same.

## Install

```sh
npm install -D @mockatoo/connect-better-auth
```

Requires `better-auth` `^1.7.7`.

## Usage

Server code:

```ts
import { betterAuth } from "better-auth";
import { mockGoogle } from "@mockatoo/connect-better-auth";

const google = {
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
};
const isProd = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  socialProviders: isProd ? { google } : {},
  plugins: isProd ? [] : [mockGoogle(google)],
});
```

Client code does not change:

```ts
await authClient.signIn.social({ provider: "google" });
```

The mock ignores `clientId` and `clientSecret` and uses its shared client, so the production options can be passed unchanged.

## Signing in during tests

[Create a test account](https://app.mockatoo.globalunderdog.com), then sign in on the mock's login page with that email and password, for example from Playwright. See the [Playwright guide](https://mockatoo.globalunderdog.com/docs/playwright) and [account flow](https://mockatoo.globalunderdog.com/docs/account-flow).

## Providers

| Better Auth provider | Mock | Notes |
| --- | --- | --- |
| google | `mockGoogle` | |
| github | `mockGitHub` | |
| microsoft | `mockMicrosoft` | Takes `tenantId`. |
| apple | `mockApple` | |
| discord | `mockDiscord` | |
| linkedin | `mockLinkedIn` | |
| twitter (X) | `mockTwitter` | |
| facebook | `mockFacebook` | |

## Generic provider

`mockatooPlugin` / `createMockatooPlugin()` adds one `genericOAuth` provider with id `mockatoo`, for apps that don't use a built-in provider. The client then calls `authClient.signIn.oauth2({ providerId: "mockatoo" })` with `genericOAuthClient()`.

```ts
import { createAuthClient } from "better-auth/client";
import { genericOAuthClient } from "better-auth/client/plugins";

const authClient = createAuthClient({
  plugins: [genericOAuthClient()],
});

await authClient.signIn.oauth2({ providerId: "mockatoo" });
```

## Options

`origin`: override only for a local or self-hosted mock. The default is `https://app.mockatoo.globalunderdog.com`.

## Tested

The CI-tested example app is [better-auth-next](https://github.com/mockatoo/examples/tree/main/better-auth-next).

## License

MIT.
