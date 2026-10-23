# X

## Implemented flow

The mock implements the **OAuth 2.0 authorization code flow with PKCE for a
confidential X Web App**: authorization, code exchange, `/2/users/me`, refresh
and revocation. Both `S256` and `plain` PKCE are supported; PKCE and `state` are
required.

OAuth 1.0a, public Native/SPA clients, app-only authentication and OIDC are not
implemented. Posts, timelines and other X APIs are not served.

Sources: [OAuth 2.0 authorization code flow](https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code),
[current user lookup](https://docs.x.com/x-api/users/get-me).

## Using the connector

```ts
// Better Auth: pass the same options you give socialProviders.twitter
import { mockTwitter } from "@oauth-mock/connect-better-auth";
const twitter = { clientId: process.env.TWITTER_CLIENT_ID!,
                  clientSecret: process.env.TWITTER_CLIENT_SECRET! };
export const auth = betterAuth({
  socialProviders: process.env.NODE_ENV === "production" ? { twitter } : {},
  plugins: process.env.NODE_ENV === "production" ? [] : [mockTwitter(twitter)],
});

// Auth.js
import Twitter from "next-auth/providers/twitter";
import { MockTwitter } from "@oauth-mock/connect-authjs";
providers: [process.env.NODE_ENV === "production" ? Twitter() : MockTwitter()],
```

- Both `tweet.read` and `users.read` are needed for `/2/users/me`. Email also
  needs `users.email` and the `confirmed_email` field. Auth.js does not request
  it by default; Better Auth substitutes a placeholder if it is absent.
- A new sign-in invalidates the user's earlier tokens. Because the mock has a
  shared client, this affects other apps using the same mock and test identity.
- Request `offline.access` for refresh tokens. Refresh tokens work once, and
  refreshing invalidates the old access token. Store the replacement token.
- Codes expire after 30 seconds. Send client credentials with Basic auth when
  redeeming codes, refreshing or revoking tokens.
- Every profile uses the default avatar and synthetic metrics. Rate limits and
  billing are not simulated.

## Known differences
