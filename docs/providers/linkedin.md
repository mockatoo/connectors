# LinkedIn

## Implemented flow

The mock implements **Sign In with LinkedIn using OpenID Connect** through the
web authorization code flow: authorization, code exchange, signed ID tokens,
discovery, keys and `/v2/userinfo`.

The shared client models self-serve sign-in products. Approved Marketing partner
refresh tokens, native PKCE authorization and LinkedIn's broader APIs are not
implemented. `w_member_social` can be requested, but publishing posts is not served.

Sources: [Sign In with LinkedIn using OIDC](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2),
[authorization code flow](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow),
[partner refresh tokens](https://learn.microsoft.com/en-us/linkedin/shared/authentication/programmatic-refresh-tokens).

## Using the connector

```ts
// Better Auth: pass the same options you give socialProviders.linkedin
import { mockLinkedIn } from "@oauth-mock/connect-better-auth";
const linkedin = { clientId: process.env.LINKEDIN_CLIENT_ID!,
                   clientSecret: process.env.LINKEDIN_CLIENT_SECRET! };
export const auth = betterAuth({
  socialProviders: process.env.NODE_ENV === "production" ? { linkedin } : {},
  plugins: process.env.NODE_ENV === "production" ? [] : [mockLinkedIn(linkedin)],
});

// Auth.js
import LinkedIn from "next-auth/providers/linkedin";
import { MockLinkedIn } from "@oauth-mock/connect-authjs";
providers: [process.env.NODE_ENV === "production" ? LinkedIn() : MockLinkedIn()],
```

- The shared client accepts `openid`, `profile`, `email` and `w_member_social`.
  This does not validate the products approved for your real application.
- There are no refresh tokens. Plan for another sign-in when access expires.
- The web flow ignores `nonce` and `prompt`. A PKCE challenge is accepted, but
  sending a `code_verifier` makes token exchange fail; do not enable PKCE for
  this connector.
- Email can be absent. `email_verified` is a string in the ID token and a
  boolean in userinfo; account linking must handle those representations.
- The mock always shows consent. Photos use mock URLs, while real LinkedIn photo URLs expire. Use `you+nophoto@example.com` to test a member whose ID token and userinfo omit `picture`.

## Known differences
