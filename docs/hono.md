---
description: "Test Google, Apple, Microsoft and other OAuth sign-in in Hono with Mockatoo: oauth4webapi pointed at the mock's issuers, Playwright tests and CI."
title: "Test OAuth login in Hono with oauth4webapi · Mockatoo"
datePublished: 2026-11-21
lastModified: 2026-11-26
tested:
  oauth4webapi-hono: [hono@4.13.18, oauth4webapi@3.8.8, "@playwright/test@1.64.1"]
---

# Hono

Sign in through OAuth and OpenID Connect in a Hono app with oauth4webapi,
locally and in CI, with Google, Apple, Microsoft, Discord or LinkedIn.

There is no connector package for oauth4webapi. You don't need one: the app
reads each provider's endpoints from its discovery document, so changing the
issuer URL to the mock's is the whole switch. The authorize, token, user info
and JWKS URLs all follow from it.

**Example on GitHub:** [`mockatoo/examples/oauth4webapi-hono`](https://github.com/mockatoo/examples/tree/main/oauth4webapi-hono).

## How it works

1. Your sign-in form posts to `/sign-in`, which fetches the provider's
   discovery document from the mock and redirects to its authorization
   endpoint on the provider's real paths:
   `accounts.google.com/o/oauth2/v2/auth` becomes
   `app.mockatoo.globalunderdog.com/google/o/oauth2/v2/auth`.
2. You (or a test) fill in the login page and click **Authorize**.
3. The mock redirects back to `/callback/<provider>`. oauth4webapi checks the
   state, exchanges the code with PKCE, and validates the ID token's
   signature, issuer, audience, expiry and nonce, as it would in production.

Your routes, scopes and checks don't change. Only the issuer URLs and the
client credentials do, and only when the mock is on.

## Prerequisites

- **Node.js 24**, with `hono`, `@hono/node-server` and `oauth4webapi` 3
  ([`package.json`](https://github.com/mockatoo/examples/blob/main/oauth4webapi-hono/package.json)).
- **A Mockatoo test account.** Sign up at
  [app.mockatoo.globalunderdog.com](https://app.mockatoo.globalunderdog.com),
  then copy the email and password from the dashboard.

## Point the issuers at the mock

[`src/app.tsx`](https://github.com/mockatoo/examples/blob/main/oauth4webapi-hono/src/app.tsx)
lists each provider with its real issuer and its path at the mock. A single
switch picks one, with the shared client or the real credentials:

```ts
const useMock =
	process.env.NODE_ENV !== "production" ||
	process.env.MOCKATOO_FORCE === "true";
const origin =
	process.env.MOCKATOO_URL || "https://app.mockatoo.globalunderdog.com";
const providers = [
	{
		id: "google",
		name: "Google",
		path: "/google",
		issuer: "https://accounts.google.com",
		scope: "openid profile email",
		pkce: true,
	},
	// …Apple, Microsoft, Discord and LinkedIn
]
	.map((provider) => {
		const prefix = provider.id.toUpperCase();
		const issuer = useMock
			? new URL(provider.path, origin).href
			: process.env[`${prefix}_ISSUER`] || provider.issuer;
		const client: oauth.Client = {
			client_id: useMock
				? "mockatoo"
				: process.env[`${prefix}_CLIENT_ID`] || "",
		};
		const clientSecret = useMock
			? "mockatoo-secret"
			: process.env[`${prefix}_CLIENT_SECRET`] || "";
		return { ...provider, issuer, client, clientSecret };
	})
	.filter(
		(provider) =>
			provider.issuer && provider.client.client_id && provider.clientSecret,
	);
```

- `mockatoo` / `mockatoo-secret` is the shared client. It accepts any
  `http(s)` callback, so localhost and preview URLs need no provider setup.
- The mock's issuer for Google is `https://app.mockatoo.globalunderdog.com/google`,
  and its discovery document lives under it, like Google's.
- The filter drops any real provider without credentials, so you can ship
  with only the providers you've registered.
- The example's committed
  [`.env`](https://github.com/mockatoo/examples/blob/main/oauth4webapi-hono/.env)
  sets `MOCKATOO_FORCE=true` so its live demo runs on the mock. Delete that
  line in your app. Never ship it.

Each request reads the endpoints from discovery:

```ts
const metadata = async (issuer: string) => {
	const url = new URL(issuer);
	return oauth.processDiscoveryResponse(
		url,
		await oauth.discoveryRequest(url, options),
	);
};
```

`options` is empty against the hosted mock. It only allows plain HTTP for a
mock running on localhost.

## Sign in and read the user

The `/sign-in` route keeps the state, nonce and PKCE verifier in a signed
cookie, then redirects to the authorization endpoint from discovery:

```ts
const verifier = oauth.generateRandomCodeVerifier();
const state = oauth.generateRandomState();
const nonce = oauth.generateRandomNonce();
// …setSignedCookie(c, "transaction", …) with these and the provider ID
const url = new URL(server.authorization_endpoint);
url.search = new URLSearchParams({
	client_id: client.client_id,
	redirect_uri: new URL(`/callback/${provider.id}`, c.req.url).href,
	response_type: "code",
	scope: provider.scope,
	state,
	...(provider.id === "linkedin" ? {} : { nonce }),
	...(provider.pkce
		? {
				code_challenge: await oauth.calculatePKCECodeChallenge(verifier),
				code_challenge_method: "S256",
			}
		: {}),
	...(provider.id === "apple" ? { response_mode: "form_post" } : {}),
}).toString();
return c.redirect(url.href);
```

The `/callback/:provider` route checks the response against that cookie,
exchanges the code, and validates the ID token:

```ts
const parameters = oauth.validateAuthResponse(
	server,
	client,
	callback,
	transaction.state,
);
const response = await oauth.authorizationCodeGrantRequest(
	server,
	client,
	clientAuth(provider),
	parameters,
	new URL(`/callback/${provider.id}`, c.req.url).href,
	provider.pkce ? transaction.verifier : oauth.nopkce,
	options,
);
const tokens = await oauth.processAuthorizationCodeResponse(
	server,
	client,
	response,
	{
		expectedNonce:
			provider.id === "linkedin" ? undefined : transaction.nonce,
		requireIdToken: true,
	},
);
await oauth.validateApplicationLevelSignature(server, response, options);
const claims = oauth.getValidatedIdTokenClaims(tokens);
```

- For every provider but Apple, the route then calls `userInfoRequest` and
  `processUserInfoResponse` with `claims.sub`, so user info must belong to
  the same subject as the ID token.
- The email goes into a one-hour session cookie encrypted with AES-GCM
  ([`src/session.ts`](https://github.com/mockatoo/examples/blob/main/oauth4webapi-hono/src/session.ts)).
  No database is needed.
- Any failure redirects to `/?error=callback`, which the page shows as an
  alert.

## Handle provider differences

| Provider | What oauth4webapi needs |
| --- | --- |
| Apple | No PKCE, `response_mode=form_post`, and the client secret in the form body. The callback is a cross-site POST, so the transaction cookie is `SameSite=None; Secure`. There's no user info endpoint: the email comes from the validated ID token |
| LinkedIn | No PKCE and no nonce, and the client secret in the form body |
| Discord | `openid identify email`. The ID token has no email, so it comes from user info |
| Microsoft | A fixed tenant in the issuer path, so discovery and the token's issuer match exactly |

Apple and LinkedIn send the secret with `ClientSecretPost`, the others with
HTTP Basic:

```ts
const clientAuth = (provider: (typeof providers)[number]) =>
	provider.id === "apple" || provider.id === "linkedin"
		? oauth.ClientSecretPost(provider.clientSecret)
		: oauth.ClientSecretBasic(provider.clientSecret);
```

The callback route accepts GET and POST (`app.on(["GET", "POST"], …)`), and
rejects a POST from any provider but Apple, or a GET from Apple.

See each provider's page, e.g. [Apple](providers/apple.md) or
[Microsoft](providers/microsoft.md), for its flow and known differences.

## Revoke the token on sign-out

Google's and Apple's discovery documents advertise a `revocation_endpoint`.
For those, the session keeps the access token, and `/sign-out` revokes it at
the provider:

```ts
const server = await metadata(provider.issuer);
await oauth.processRevocationResponse(
	await oauth.revocationRequest(
		server,
		provider.client,
		clientAuth(provider),
		current.accessToken,
		options,
	),
);
return c.redirect(`/?revoked=${provider.id}`);
```

The mock serves the same endpoint, so the test can check that revocation
succeeded: the page shows "Signed out. Your Google access token was revoked."

## Run it

Create `.env.local` with `SESSION_SECRET` set to the output of
`openssl rand -base64 32`, then run:

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000, pick a provider and sign in with your dashboard
email and password. To sign in as another user, add a tag to the email, e.g.
`you+alice@example.com` (see [Email tags](email-tags.md)).

## Test with Playwright

To cover failures after setting up sign-in, see [OAuth failure testing](https://mockatoo.globalunderdog.com/learn/oauth-failure-testing).

[`playwright.config.ts`](https://github.com/mockatoo/examples/blob/main/oauth4webapi-hono/playwright.config.ts)
compiles the app and starts it:

```ts
export default defineConfig({
	testDir: "./tests",
	use: { baseURL: "http://localhost:3000" },
	webServer: {
		command: "pnpm build && pnpm start",
		url: "http://localhost:3000",
		timeout: 120000,
		reuseExistingServer: false,
	},
});
```

[`tests/sign-in.spec.ts`](https://github.com/mockatoo/examples/blob/main/oauth4webapi-hono/tests/sign-in.spec.ts)
authorizes and denies with all five providers. After a sign-in it reloads,
signs out, and checks the revocation message for Google and Apple:

```ts
await page.goto("/");
await page
	.getByRole("button", { name: `Sign in with ${provider}`, exact: true })
	.click();
await page.getByLabel("Email", { exact: true }).fill(email as string);
await page
	.getByLabel("Password", { exact: true })
	.fill(password as string);
await page.getByRole("button", { name: "Log in with password" }).click();
await page.getByRole("button", { name: decision, exact: true }).click();
```

Add `MOCKATOO_TEST_EMAIL` and `MOCKATOO_TEST_PASSWORD` to `.env.local` or the
environment, then run:

```sh
pnpm exec playwright install chromium
pnpm test
```

The [Playwright guide](playwright.md) covers fresh users per test, edge-case
tags and token refresh. Those tests work the same against a Hono app.

## Run in CI

The example's
[workflow](https://github.com/mockatoo/examples/blob/main/.github/workflows/oauth4webapi-hono.yml)
type-checks, generates a session secret, then runs the tests with the
credentials as secrets:

```yaml
- run: pnpm --dir oauth4webapi-hono typecheck
- name: Generate runtime secret
  run: echo "SESSION_SECRET=$(openssl rand -base64 32)" >> "$GITHUB_ENV"
- run: pnpm --dir oauth4webapi-hono exec playwright install --with-deps chromium
- run: pnpm --dir oauth4webapi-hono test
  env:
    MOCKATOO_TEST_EMAIL: ${{ secrets.MOCKATOO_TEST_EMAIL }}
    MOCKATOO_TEST_PASSWORD: ${{ secrets.MOCKATOO_TEST_PASSWORD }}
```

More in [Run in CI](ci.md).

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Set SESSION_SECRET to a random secret of at least 32 characters.` on startup | Add `SESSION_SECRET` to `.env.local` or the deployment's environment |
| `Configure provider credentials or set MOCKATOO_FORCE=true.` | The mock is off and no real provider has credentials. Set `MOCKATOO_FORCE=true`, or add a provider's `<PROVIDER>_CLIENT_ID` and `<PROVIDER>_CLIENT_SECRET` |
| `Invalid origin` (403) from `/sign-in` or `/sign-out` | The POST's `Origin` header must match the app's origin. Post from the app's own page |
| Apple sign-in ends on `/?error=callback` over plain HTTP | The transaction cookie is `SameSite=None; Secure`. Use HTTPS, or Chromium on `localhost`, which treats it as secure |
| `Set MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD in .env.local or the environment.` | Copy the test account's email and password from the dashboard |
| Login fails after a password change | Copy the new password from the dashboard into `.env.local` and your secrets |

## Next steps

- [All examples](https://github.com/mockatoo/examples): Hono, Auth.js, Better Auth, SvelteKit, Nuxt, Django, Flask, Laravel and Spring Boot
- [Playwright](playwright.md) · [Email tags](email-tags.md) · [Account flow](account-flow.md) · [Run in CI](ci.md)
- [Let your coding agent sign in](https://mockatoo.globalunderdog.com/learn/coding-agent-sign-in): have Claude Code, Codex or Cursor set up sign-in and verify it with a passing test
- [OAuth on localhost, previews and CI](https://mockatoo.globalunderdog.com/learn/oauth-localhost-preview-ci): why each new URL needs a registered redirect URI, and how to sign in without one
- Use Mockatoo only outside production, and never commit its credentials.
