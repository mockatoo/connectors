<p align="center">
  <img src="../../mockatoo-logo.png" alt="Mockatoo" width="128" height="128">
</p>

<h1 align="center">Mockatoo</h1>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../../readme-headline-dark.svg">
    <img src="../../readme-headline-light.svg" alt="Test Google, Microsoft, GitHub, Apple, Discord, LinkedIn, X and Facebook sign-in in CI, without getting blocked. One free OAuth provider for agentic development, E2E tests, and CI. No app registration, no bot checks, no fragile workarounds." width="880">
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

# @mockatoo/connect-authjs

Use a provider helper such as `MockGoogle()` to preserve your Google sign-in integration:

```ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { MockGoogle } from "@mockatoo/connect-authjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    process.env.NODE_ENV === "production" ? Google() : MockGoogle(),
  ],
});
```

Keep your normal Auth.js application settings, including its secret and callback URL configuration. The mock supplies its shared client credentials automatically. See the [runnable Next.js example](https://github.com/mockatoo/examples/tree/main/authjs-next).

This connector supports next-auth v5, `@auth/sveltekit`, other `@auth/*`
adapters, and bare `@auth/core` through the same import. The `@auth/core` peer
is optional: next-auth v5 users already get `@auth/core` through next-auth,
and `@auth/*` adapter users get it from their adapter. It is installed
standalone only for bare `@auth/core` apps (or when npm or pnpm does not reuse
the transitive copy). The floor is 0.37.1, the version bundled by
next-auth 5.0.0-beta.23.

## Mockatoo URL

The connector uses the hosted service automatically; users do not need to know or configure its URL. For links or test helpers that need the address, import the resolved value:

```ts
import { MOCKATOO_URL } from "@mockatoo/connect-authjs";

const loginOrigin = new URL(MOCKATOO_URL).origin;
```

`MOCKATOO_URL` reads `process.env.MOCKATOO_URL` when the module is loaded and falls back to `https://app.mockatoo.globalunderdog.com` when it is unset or empty. The environment override is for Mockatoo's own development; set it before importing the connector. `process.env.MOCKATOO_URL` is the only supported origin override; connectors have no `origin` option.
