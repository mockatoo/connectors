# Microsoft

## Implemented flow

The mock implements the **Microsoft identity platform v2.0 authorization code
flow**, including OIDC discovery, signed ID tokens, userinfo, refresh tokens and
an end-session endpoint. It supports `common`, `organizations`, `consumers`, tenant
IDs and domain authorities, with work, school, personal and guest identities.
Authorization responses can use `query`, `fragment` or `form_post`.

Hybrid and implicit flows, client credentials, device code and on-behalf-of grants
are not implemented. SPA registration rules, v1.0 endpoints, sovereign clouds and
Entra External ID / B2C are not modeled. Microsoft Graph is limited to OIDC
userinfo; photos, mail and other Graph APIs are not served.

Sources: [authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow),
[OIDC](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc),
[scopes and permissions](https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc).

## Using the connector

```ts
// Better Auth: pass the same options you give socialProviders.microsoft
import { mockMicrosoft } from "@oauth-mock/connect-better-auth";
const microsoft = { clientId: process.env.MICROSOFT_CLIENT_ID!,
                    clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
                    tenantId: "common" };
export const auth = betterAuth({
  socialProviders: process.env.NODE_ENV === "production" ? { microsoft } : {},
  plugins: process.env.NODE_ENV === "production" ? [] : [mockMicrosoft(microsoft)],
});

// Auth.js
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { MockMicrosoftEntraID } from "@oauth-mock/connect-authjs";
providers: [process.env.NODE_ENV === "production" ? MicrosoftEntraID() : MockMicrosoftEntraID()],
```

- **API scopes are accepted without registration.** Any scope matching
  `api://{id}/Scope`, an HTTPS App ID URI, or `{api-client-id}/Scope` can be used.
  This cannot validate your API registration or permissions. Graph permission
  names are checked against the published list, without checking app approval.
  An authorization request can name only one resource.
- Your own API receives a signed v2.0 JWT access token. Graph access tokens are
  opaque. Configure validators with the mock issuer and keys; check the audience
  difference documented below before relying on a successful mock validation.
- **Neither connector returns a profile picture.** Auth.js replaces its default
  profile mapping to skip the Graph photo fetch; pass a custom `profile` mapping
  to the connector if you use one.
- ID tokens omit `email_verified`, so Better Auth treats the email as unverified.
  Handle missing email and avoid assuming that matching emails allow linking.
- Preserve the tenant setting. Better Auth uses `oid` for identity; Auth.js uses
  the app-specific `sub`. Guests have a separate identity in each tenant.
- Request `offline_access` for refresh tokens. Refreshing returns a new refresh
  token, and the old refresh token remains usable.
- Auth.js requires an HTTPS mock origin for its tenant discovery. A local app's
  Node process must trust the local mock certificate. With `form_post`, account
  for state cookies omitted on cross-site POSTs by `SameSite=Lax`.

## Known differences
