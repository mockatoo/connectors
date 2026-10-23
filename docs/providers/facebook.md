# Facebook

## Implemented flow

The mock implements **classic Facebook Login's web authorization code flow**:
authorization, code exchange, `/me` profile lookup, `debug_token` inspection and
permission revocation.

It does not issue ID tokens, including when `openid` is requested. Limited Login,
implicit login, long-lived token exchange and app access tokens are not
implemented. Graph API support is limited to the endpoints used for sign-in;
other profile fields and broader Graph features are not served.

Sources: [manual web login flow](https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow/),
[Limited Login](https://developers.facebook.com/docs/facebook-login/limited-login/),
[long-lived tokens](https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived/).

## Using the connector

```ts
// Better Auth: pass the same options you give socialProviders.facebook
import { mockFacebook } from "@oauth-mock/connect-better-auth";
const facebook = { clientId: process.env.FACEBOOK_CLIENT_ID!,
                   clientSecret: process.env.FACEBOOK_CLIENT_SECRET! };
export const auth = betterAuth({
  socialProviders: process.env.NODE_ENV === "production" ? { facebook } : {},
  plugins: process.env.NODE_ENV === "production" ? [] : [mockFacebook(facebook)],
});

// Auth.js
import Facebook from "next-auth/providers/facebook";
import { MockFacebook } from "@oauth-mock/connect-authjs";
providers: [process.env.NODE_ENV === "production" ? Facebook() : MockFacebook()],
```

- No refresh token is issued. Token exchange for long-lived access is also
  unavailable, so test that path separately against Facebook.
- `/me` supplies ID, name, email and picture. It has no `email_verified`, so
  neither connector marks email verified. `+noemail` exercises a user declining
  the email permission.
- Known permissions are granted without App Review, but granting them does not
  add unsupported fields or API features. This cannot validate your app approval.
- Photos use mock URLs, while real Facebook photo URLs expire. Use `you+nophoto@example.com` to test a user whose picture is a silhouette (`is_silhouette: true`).
- Facebook's callback includes the `#_=_` fragment. The mock preserves it.

## Known differences
