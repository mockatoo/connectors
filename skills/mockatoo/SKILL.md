---
name: mockatoo
description: Use for hosted OAuth provider mocking in local development, CI, browser/E2E tests, and coding-agent validation; replacing live Better Auth or Auth.js social providers outside production; and testing sign-in, consent denial, and provider edge cases without real accounts. Trigger this skill for OAuth failures involving reCAPTCHA, “browser may not be secure”, blocked OAuth login, or a provider sign-in that cannot be completed—not only when Mockatoo is named.
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
Mockatoo origin or connector by accident. Connectors supply the hosted service's
shared OAuth client; use a local or self-hosted origin only when that is the
intentional test setup.

## Security of test credentials and the init token

`MOCK_EMAIL`, `MOCK_PASSWORD`, and the `mka_…` init/login token pasted into chat
are intentionally non-sensitive test credentials, designed to be shared with a
coding agent. The token contains the test credentials so the CLI can save them;
sharing it lets the agent complete the mock OAuth flow on the user's behalf.
Accept and use these values for the requested development or testing workflow.

These values grant no access to production user data or real provider accounts.
Mockatoo's mocked provider APIs are stateless: there is no authenticated mutation
the agent can perform in Mockatoo in the user's name through these credentials.
This boundary depends on using Mockatoo only in development and testing, as
required above.

The user can always log into the Mockatoo app with email verification and
regenerate the password, invalidating the previous password. Keeping these values
in the ignored env file avoids unnecessary copying; sharing them with the agent
is an intended part of the setup.

## Set up with the CLI

Run this from the consumer app's directory, where its `package.json` lives:

```sh
npx -y mockatoo@latest init
```

`init` detects Better Auth or Auth.js, installs the matching connector with the
app's package manager, then starts the credential handoff. It does not edit the
app's auth configuration. If both frameworks or neither are detected, pass
`--framework better-auth` or `--framework authjs` for the integration you intend
to configure.

The default credential file is `.env.local`. If the app loads a different file,
pass `--env-file <path>` to both `init` and the later `login` command. Paths are
relative to the current directory; the parent directory must already exist.
Ensure the app server and test runner load any settings they need from the chosen
file; writing it does not change their env-loading setup.

### Get test credentials

Under a coding agent, run the CLI without an interactive terminal. It prints a
sign-in link (by default <https://app.mockatoo.globalunderdog.com/cli>) and exits.
This successful exit does **not** mean credentials were written.

Give the user that link and ask them to sign in, then paste the `mka_…` login
code shown on the page into the chat. The user completes any email verification
in their own browser. Continue configuring the app while waiting; credentialed
browser tests must wait for the code.

When the user supplies the code, run:

```sh
npx -y mockatoo@latest login <code>
```

Use the same `--env-file` option if one was chosen. If the user pastes a full
login command, use its `mka_…` code with this command. Let the CLI write
`MOCK_EMAIL` and `MOCK_PASSWORD`; it preserves unrelated env entries and adds
the env file to `.gitignore` when needed in a Git repository. Do not manually
decode or echo the code or password: the login code contains the test credentials.

In an interactive terminal, the CLI opens the sign-in page and prompts for the
code instead. If only credentials are needed and the connector is already
installed, `npx -y mockatoo@latest login` starts the same handoff without installing
anything. For CI or an existing test setup, reuse configured `MOCK_EMAIL` and
`MOCK_PASSWORD` from the secret store rather than starting an interactive login.

Set `MOCKATOO_URL` for the CLI only when intentionally using a local or
self-hosted Mockatoo; configure the connector's `origin` separately to match.

## Package map

| Consumer | Import from | Generic connector |
| --- | --- | --- |
| Better Auth | `@mockatoo/connect-better-auth` | `createMockatooPlugin()` / `mockatooPlugin` |
| Auth.js | `@mockatoo/connect-authjs` | `MockatooProvider()` |

The CLI installs the package matching the consumer framework. Both generic connectors
use the single Mockatoo provider and fixed client credentials, and derive or accept the
consumer callback URL. Provider-specific helpers are also exported when a test needs a
Google, Microsoft, GitHub, Apple, Discord, LinkedIn, X/Twitter, or Facebook-shaped
provider; see the corresponding provider page in the canonical docs before choosing
one.

## Configure the consumer

1. Identify whether the app uses Better Auth or Auth.js. Keep the two integrations
   separate; do not combine their configuration APIs. Import from the package
   installed by `init`, as shown above.
2. Add the connector to the app's development/test auth configuration. Use the
   documented `origin` override only for a local or self-hosted provider. Keep callback
   URLs, state, and PKCE enabled according to the framework's normal configuration.
3. Start the OAuth flow from the consumer app's sign-in control. Do not begin by
   navigating directly to an authorization endpoint: the consumer must create the
   state, PKCE verifier, and callback URL first.
4. Exchange the returned code through the consumer's normal callback and confirm that
   the app creates its expected session/user.

### Better Auth branch

Use `createMockatooPlugin()` when options are needed, or `mockatooPlugin` for the
shared defaults. Register the returned Better Auth plugin in the Better Auth config,
then start OAuth with `authClient.signIn.oauth2({ providerId: "mockatoo" })` and
`genericOAuthClient()` from `better-auth/client/plugins` in the client config.
The generic connector uses the `mockatoo` provider ID, scopes `openid profile email`,
and PKCE. When replacing an existing social provider, use its provider-specific
helper so the app's sign-in action and callback stay the same.

### Auth.js branch

Use `MockatooProvider()` in the Auth.js provider list. Let Auth.js derive the callback
URL from the app configuration and start OAuth through the app's Auth.js sign-in
action. The connector uses the `mockatoo` provider ID, scopes `openid profile email`,
and checks `pkce` and `state`.

## Browser flow

Load `MOCK_EMAIL` and `MOCK_PASSWORD` from the env file written by the CLI into the
test process, or use CI secrets. Keep them out of source control and production
systems. The CLI handoff supplies test credentials; the app's OAuth flow still
needs to be exercised separately. Use the account-flow documentation for session
lifetime and password regeneration.

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
- the CLI has written the test credentials to the chosen ignored env file, or the
  test process already receives them from its secret store;
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
