---
name: mockatoo
description: Use when adding, configuring, or testing OAuth sign-in in a development or test consumer app; replacing an external provider with a deterministic hosted provider for local work or E2E tests; wiring Better Auth or Auth.js OAuth; or when the user explicitly asks for Mockatoo. Follow the relevant Better Auth or Auth.js branch, then verify the complete browser flow.
---

# Mockatoo

Use Mockatoo as a hosted OAuth provider for development and automated tests. Keep it
strictly outside production. The canonical documentation starts at
<https://mockatoo.globalunderdog.com/docs/overview>; use its account-flow and provider
pages for current behavior rather than copying documentation into the repository.

## Safety boundary

Mockatoo is a test dependency. Configure it only in local, preview, CI, or other
explicitly non-production environments. Do not point production traffic at Mockatoo,
put production users or credentials into it, or commit its credentials. Add an
explicit environment guard in the consumer app so a production build cannot select the
Mockatoo origin or connector by accident. The hosted service uses the shared client
shown below; use a local or self-hosted origin only when that is the intentional test
setup.

## Package map

| Consumer | Package | Generic connector |
| --- | --- | --- |
| Better Auth | `@mockatoo/connect-better-auth` | `createMockatooPlugin()` / `mockatooPlugin` |
| Auth.js | `@mockatoo/connect-authjs` | `MockatooProvider()` |

Install the package matching the consumer framework. Both generic connectors use the
single Mockatoo provider and fixed client credentials, and derive or accept the
consumer callback URL. Provider-specific helpers are also exported when a test needs a
Google, Microsoft, GitHub, Apple, Discord, LinkedIn, X/Twitter, or Facebook-shaped
provider; see the corresponding provider page in the canonical docs before choosing
one.

## Configure the consumer

1. Identify whether the app uses Better Auth or Auth.js. Keep the two integrations
   separate; do not combine their configuration APIs.
2. Install the matching package in the consumer app:

   ```sh
   pnpm add @mockatoo/connect-better-auth
   # or
   pnpm add @mockatoo/connect-authjs
   ```

3. Add the generic connector to the app's development/test auth configuration. Use the
   documented `origin` override only for a local or self-hosted provider. Keep callback
   URLs, state, and PKCE enabled according to the framework's normal configuration.
4. Start the OAuth flow from the consumer app's sign-in control. Do not begin by
   navigating directly to an authorization endpoint: the consumer must create the
   state, PKCE verifier, and callback URL first.
5. Exchange the returned code through the consumer's normal callback and confirm that
   the app creates its expected session/user.

### Better Auth branch

Use `createMockatooPlugin()` when options are needed, or `mockatooPlugin` for the
shared defaults. Register the returned Better Auth plugin in the Better Auth config,
then start OAuth through the app's Better Auth sign-in action. The connector uses the
`mockatoo` provider ID, scopes `openid profile email`, and PKCE.

### Auth.js branch

Use `MockatooProvider()` in the Auth.js provider list. Let Auth.js derive the callback
URL from the app configuration and start OAuth through the app's Auth.js sign-in
action. The connector uses the `mockatoo` provider ID, scopes `openid profile email`,
and checks `pkce` and `state`.

## Credentials and browser flow

Create or use a dedicated test account in Mockatoo. Treat the email and generated
password as secrets: pass them through test environment variables or the test secret
store, never source-control them, print them, or send them to a production system.
Use the account-flow documentation for account creation, magic-link behavior, session
lifetime, and password regeneration.

After the consumer app starts OAuth, complete the hosted account flow with the stable
labels documented at
<https://mockatoo.globalunderdog.com/docs/account-flow>:

```ts
await page.getByLabel("Email", { exact: true }).fill(process.env.MOCK_EMAIL!);
await page.getByLabel("Password", { exact: true }).fill(process.env.MOCK_PASSWORD!);
await page.getByRole("button", { name: "Log in with password", exact: true }).click();
await page.getByRole("button", { name: "Authorize", exact: true }).click();
await page.waitForURL("**/your-app-callback**");
```

To test rejection, click the exact `Deny` button instead of `Authorize`, then assert
that the consumer callback receives `error=access_denied` and the original `state`.

## Completion criteria

The integration is complete only when all of these are true:

- the connector is installed and selected only in a non-production environment;
- the consumer starts OAuth and returns to its configured callback without manually
  visiting the provider endpoint;
- the dedicated test account completes the exact `Email`, `Password`, and `Log in
  with password` steps and the consent `Authorize` step;
- the consumer verifies the callback, exchanges the code, and exposes the expected
  authenticated session/user; and
- a separate denial run clicks `Deny` and verifies `access_denied` plus the preserved
  `state`.

If a step differs from these instructions, consult the canonical overview, account-flow,
and provider pages before changing the integration.
