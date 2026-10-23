# Apple

## Implemented flow

The mock implements the **Sign in with Apple web authorization code flow**:
authorize, return the code to your callback, exchange it for an access token,
refresh token and signed ID token, then refresh or revoke tokens. It publishes
discovery and signing keys. Apple has no userinfo endpoint in this flow.

Other Apple services and native Apple SDK interactions are not implemented.
The connector uses shared mock credentials in place of Apple's signed client
secret; successful mock sign-in cannot validate your Apple key or Services ID.

Sources: [Sign in with Apple REST API](https://developer.apple.com/documentation/signinwithapplerestapi),
[authorization response](https://developer.apple.com/documentation/signinwithapplerestapi/request-an-authorization-to-the-sign-in-with-apple-server).

## Using the connector

```ts
// Better Auth: pass the same options you give socialProviders.apple
import { mockApple } from "@oauth-mock/connect-better-auth";
const apple = { clientId: process.env.APPLE_CLIENT_ID!,
                clientSecret: process.env.APPLE_CLIENT_SECRET! };
export const auth = betterAuth({
  socialProviders: process.env.NODE_ENV === "production" ? { apple } : {},
  plugins: process.env.NODE_ENV === "production" ? [] : [mockApple(apple)],
});

// Auth.js
import Apple from "next-auth/providers/apple";
import { MockApple } from "@oauth-mock/connect-authjs";
providers: [process.env.NODE_ENV === "production" ? Apple() : MockApple()],
```

- With `name` or `email` scope, the callback uses **form POST**. Ensure your
  callback and state handling accept it.
- The name arrives in the separate `user` field, never in the ID token. Store
  it on first sign-in; `+returning` omits that field to exercise later sign-ins.
- Handle private relay addresses and boolean claims encoded as strings; use
  `+hidden` and `+strings` to exercise these cases.
- Refreshing does not return a replacement refresh token. Revocation is
  implemented for testing account deletion flows.
- Better Auth's connector adds the mock origin to trusted origins for local
  form callbacks. The mock accepts HTTP and localhost callbacks; real Apple
  requires an eligible HTTPS callback.

## Known differences
