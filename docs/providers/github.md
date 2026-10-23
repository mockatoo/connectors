# GitHub

## Implemented flow

The mock implements the **OAuth 2.0 authorization code flow for OAuth Apps**:
authorize a user, exchange the code for an access token, then read `/user` and
`/user/emails` for the profile and email addresses. PKCE with S256 is supported.

It does not implement GitHub Apps: app installation, installation access tokens,
app JWT authentication, and GitHub App permissions are outside this flow. There
are no OIDC ID tokens or discovery. Repository and organization APIs are not served.

Sources: [OAuth App web flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#web-application-flow),
[OAuth Apps and GitHub Apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps),
[email API](https://docs.github.com/en/rest/users/emails#list-email-addresses-for-the-authenticated-user).

## Using the connector

```ts
// Better Auth: pass the same options you give socialProviders.github
import { mockGitHub } from "@oauth-mock/connect-better-auth";
const github = { clientId: process.env.GITHUB_CLIENT_ID!,
                 clientSecret: process.env.GITHUB_CLIENT_SECRET! };
export const auth = betterAuth({
  socialProviders: process.env.NODE_ENV === "production" ? { github } : {},
  plugins: process.env.NODE_ENV === "production" ? [] : [mockGitHub(github)],
});

// Auth.js
import GitHub from "next-auth/providers/github";
import { MockGitHub } from "@oauth-mock/connect-authjs";
providers: [process.env.NODE_ENV === "production" ? GitHub() : MockGitHub()],
```

- Normal sign-in issues a non-expiring `gho_` access token with no refresh token.
  The mock's `offline_access` extension issues expiring tokens and refresh tokens
  for testing refresh handling; it does not simulate a GitHub App registration.
- A private email is `null` in `/user`. Request `user:email` (or `user`) so the
  connector can load `/user/emails`; handle an unverified primary email.
- The API uses `/github/api/v3` so Auth.js can use its Enterprise URL option.
  This URL layout does not mean GitHub Enterprise features are implemented.
- Custom API requests need a `User-Agent`. Token errors can have HTTP 200;
  check the response body, and request JSON if your client expects it.

## Known differences
