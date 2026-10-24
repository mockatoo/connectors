# Google

## Implemented flow

The mock implements the **OAuth 2.0 authorization code flow with OpenID Connect**:
authorization and consent, code exchange, signed ID tokens, discovery, JWKS and
userinfo. It supports PKCE, offline access and token refresh.

Google APIs such as Calendar and Drive are not served. Accepting their scopes
lets you test sign-in configuration; it does not make those APIs available or
validate your Google Cloud project's consent and verification settings.

Sources: [web server flow](https://developers.google.com/identity/protocols/oauth2/web-server),
[OIDC](https://developers.google.com/identity/openid-connect/openid-connect).

## Using the connector

```ts
// Better Auth: pass the same options you give socialProviders.google
import { mockGoogle } from "@mockatoo/connect-better-auth";
const google = { clientId: process.env.GOOGLE_CLIENT_ID!,
                 clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
                 accessType: "offline" as const };
export const auth = betterAuth({
  socialProviders: process.env.NODE_ENV === "production" ? { google } : {},
  plugins: process.env.NODE_ENV === "production" ? [] : [mockGoogle(google)],
});

// Auth.js
import Google from "next-auth/providers/google";
import { MockGoogle } from "@mockatoo/connect-authjs";
providers: [process.env.NODE_ENV === "production" ? Google() : MockGoogle()],
```

- Request `access_type=offline` for a refresh token. Each normal mock sign-in
  represents first consent; `+returning` represents a later sign-in with no
  refresh token unless you request `prompt=consent`.
- Published Google scopes are accepted, including API scopes. With
  `include_granted_scopes=true`, granted scopes accumulate for the user.
- `prompt=none` returns `interaction_required` because there is no remembered
  login session. Bad clients and invalid scopes stop at an error page; denial
  returns `access_denied` to your callback.
- Email verification, missing names and Workspace membership can be exercised
  with the special addresses below.

## Known differences
