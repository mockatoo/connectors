---
description: "Test Discord sign-in in CI: Mockatoo mocks Discord's OAuth 2.0 authorization code flow with PKCE, the /users/@me profile, refresh and revocation."
title: "Mock Discord OAuth for tests and CI · Mockatoo"
---

# Discord

## Implemented flow

The mock implements the **OAuth 2.0 authorization code flow for user sign-in**:
authorization, code exchange, `/users/@me` profile lookup, token refresh and
revocation. PKCE is supported with S256.

Bot installation, webhooks, app installs, implicit and client credentials flows,
and general Discord APIs are not modeled. Accepting their scopes does not perform
those actions.

For reference, see [Discord OAuth2 flows and scopes](https://discord.com/developers/docs/topics/oauth2).

## OpenID Connect (OIDC)

This provider supports OpenID Connect (OIDC), which adds signed ID tokens to OAuth
2.0 so your app can verify the signed-in user's identity. Mockatoo publishes OIDC
discovery and signing keys for this provider. See the
[Hono + oauth4webapi example](https://github.com/mockatoo/examples/blob/main/oauth4webapi-hono/src/app.tsx)
for a minimal authorization code flow with discovery and ID-token validation,
including this provider's differences, without an auth abstraction.

Request `openid identify email` for OIDC sign-in. Code exchange returns a signed
RS256 ID token with an array audience, a one-hour lifetime, `auth_time`, `at_hash`
and the requested `nonce`; refresh responses contain no ID token. The ID token
contains no email or name: userinfo supplies email and verification with `email`,
and username, nickname, picture and locale with `identify`.

Discovery is served at `/discord/.well-known/openid-configuration`, with keys at
`/discord/api/oauth2/keys` and OIDC userinfo at `/discord/api/oauth2/userinfo`.

## Using the connector

```ts
// Better Auth: pass the same options you give socialProviders.discord
import { mockDiscord } from "@mockatoo/connect-better-auth";
const discord = { clientId: process.env.DISCORD_CLIENT_ID!,
                  clientSecret: process.env.DISCORD_CLIENT_SECRET! };
export const auth = betterAuth({
  socialProviders: process.env.NODE_ENV === "production" ? { discord } : {},
  plugins: process.env.NODE_ENV === "production" ? [] : [mockDiscord(discord)],
});

// Auth.js: declare Discord's issuer, or Auth.js refuses the iss Discord sends
import Discord from "next-auth/providers/discord";
import { MockDiscord } from "@mockatoo/connect-authjs";
const discord = { issuer: "https://discord.com" };
providers: [process.env.NODE_ENV === "production" ? Discord(discord) : MockDiscord(discord)],
```

- Request `identify` for a profile and `email` for email and verification status. A Discord account registered with a phone number has `email: null` and `verified: false` even with the `email` scope; use `you+noemail@example.com` to test this. Better Auth rejects the account with `email_not_found`; Auth.js signs in without an email.
  Handle a missing display name (`global_name: null`).
- Discord includes an issuer in authorization responses. Auth.js needs
  `issuer: "https://discord.com"` on the production provider; the connector
  replaces it with the mock issuer.
- `prompt=none` permits sign-in, but the mock still shows consent every time.
- Token responses include rotating refresh tokens. Each refresh token works
  once; refreshing invalidates the access token issued alongside it. Revoking
  either token ends the whole authorization.
- Only scopes requested in the current sign-in are granted; the mock does not
  accumulate earlier permissions. Users have default avatars and modern
  usernames; custom avatars and legacy discriminators are not exercised.

<SpecialTags provider="discord" />

<KnownDifferences provider="discord" />
