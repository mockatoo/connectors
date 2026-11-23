---
description: "Test Google, GitHub, Apple and other OAuth sign-in in SvelteKit with Mockatoo: Better Auth or Auth.js on the mock in dev, Playwright tests and CI."
title: "Test SvelteKit OAuth login: Better Auth, Auth.js · Mockatoo"
---

# SvelteKit

Sign in through OAuth in a SvelteKit app with Better Auth or Auth.js, locally
and in CI, with any of the eight providers Mockatoo mocks.

Each library has a connector that swaps its providers for ones pointed at the
mock: `@mockatoo/connect-better-auth` adds Better Auth plugins, and
`@mockatoo/connect-authjs` wraps Auth.js providers. One switch on SvelteKit's
`dev` turns the mock on, so `pnpm dev` signs in through Mockatoo and a
production build uses the real providers.

**Examples on GitHub:** [`mockatoo/examples/better-auth-sveltekit`](https://github.com/mockatoo/examples/tree/main/better-auth-sveltekit)
and [`mockatoo/examples/authjs-sveltekit`](https://github.com/mockatoo/examples/tree/main/authjs-sveltekit).
The Better Auth setup is the same as in
[`better-auth-next`](https://github.com/mockatoo/examples/tree/main/better-auth-next),
and the Auth.js setup as in
[`authjs-next`](https://github.com/mockatoo/examples/tree/main/authjs-next) and
[`authjs-nuxt`](https://github.com/mockatoo/examples/tree/main/authjs-nuxt).

## How it works

1. Your sign-in button calls the library's sign-in endpoint
   (`/api/auth/sign-in/social` for Better Auth, `/auth/signin/<provider>` for
   Auth.js), which sends the browser to the mock on the provider's real paths:
   `accounts.google.com/o/oauth2/v2/auth` becomes
   `app.mockatoo.globalunderdog.com/google/o/oauth2/v2/auth`.
2. You (or a test) fill in the login page and click **Authorize**.
3. The mock redirects back to `/api/auth/callback/<provider>` (Better Auth) or
   `/auth/callback/<provider>` (Auth.js). The library exchanges the code for
   provider-shaped tokens, reads the profile or the ID token, and sets the
   session cookie, as it would in production.

Your routes, buttons and session handling don't change. Only the provider
list does, and only when the mock is on.

## Prerequisites

- **Node.js 24 and SvelteKit 3** (`@sveltejs/kit` 3.2 or later). The examples
  import `dev` from `$app/env` and secrets from `$app/env/private`. On
  SvelteKit 2, import them from `$app/environment` and `$env/dynamic/private`.
- **Better Auth:** `better-auth` 1.7.25 and `@mockatoo/connect-better-auth`
  ([`package.json`](https://github.com/mockatoo/examples/blob/main/better-auth-sveltekit/package.json)).
- **Auth.js:** `@auth/core` 0.41.3 and `@mockatoo/connect-authjs`
  ([`package.json`](https://github.com/mockatoo/examples/blob/main/authjs-sveltekit/package.json)).
- **A Mockatoo test account, with its credentials in `.env.local`**
  (git-ignored). `npx -y @mockatoo/mockatoo@latest init` installs the
  matching connector and writes `MOCKATOO_TEST_EMAIL` and
  `MOCKATOO_TEST_PASSWORD` there. Or sign up at
  [app.mockatoo.globalunderdog.com](https://app.mockatoo.globalunderdog.com)
  and copy the email and password from the dashboard.

## Start a new app with the Svelte CLI

On a SvelteKit app with no auth yet, the
[`@mockatoo/sv`](https://github.com/mockatoo/sv) add-on sets up Better Auth
with GitHub sign-in on the mock in one command:

```sh
npx sv add @mockatoo
```

It pulls in the official `better-auth` add-on with its GitHub demo (and
Drizzle, if the app has no database), adds `@mockatoo/connect-better-auth`,
and gates GitHub on `dev`. The [add-on's README](https://github.com/mockatoo/sv#readme)
shows the exact diff and how to try the demo at `/demo/better-auth/login`. It
works on SvelteKit 2 and 3, and its CI signs in on a fresh app. On an app
that already has auth, it changes nothing and points you to the examples on
this page.

The sections below set up all eight providers by hand, in an existing app.

## Set up Better Auth

### Point the providers at the mock

[`src/lib/auth.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-sveltekit/src/lib/auth.ts)
registers the mock plugins when the mock is on, and the real providers
otherwise:

```ts
import { mockGitHub, mockGoogle } from "@mockatoo/connect-better-auth";
import { betterAuth } from "better-auth";
import { dev } from "$app/env";
import * as env from "$app/env/private";

// …the BETTER_AUTH_SECRET check

// Your app would switch on dev, so production uses the real providers:
//   const useMock = dev;   // import { dev } from "$app/env";
// This demo also runs the mock in production on Vercel, where dev is
// always false, so its committed .env sets MOCKATOO_FORCE=true.
// Delete that line from .env before you ship.
const useMock = dev || __MOCKATOO_FORCE__;

export const auth = betterAuth({
	secret: env.BETTER_AUTH_SECRET,
	// …baseURL, account linking and rate limits
	socialProviders: useMock
		? {}
		: {
				github: {
					clientId: process.env.GITHUB_CLIENT_ID ?? "",
					clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
				},
				// …the other providers
			},
	plugins: useMock
		? [
				mockGoogle(),
				mockGitHub(),
				// …the other providers
			]
		: [],
});
```

- Each mock plugin registers the provider under its real id (`github`,
  `google`), so `signIn.social({ provider: "github" })` works either way. The
  plugins fill in the shared client, `mockatoo` / `mockatoo-secret`, which
  accepts any `http(s)` callback, so localhost and preview URLs need no
  provider setup.
- `__MOCKATOO_FORCE__` comes from `MOCKATOO_FORCE=true` in the example's
  committed [`.env`](https://github.com/mockatoo/examples/blob/main/better-auth-sveltekit/.env),
  which [`vite.config.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-sveltekit/vite.config.ts)
  reads at build time so the live demo runs on the mock. In your app, use
  `dev` alone. Never ship the flag.
- [`src/env.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-sveltekit/src/env.ts)
  declares `BETTER_AUTH_SECRET` with `defineEnvVars`, so `$app/env/private`
  reads it at runtime.

### Mount the handler

[`src/routes/api/auth/[...all]/+server.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-sveltekit/src/routes/api/auth/%5B...all%5D/%2Bserver.ts)
hands every request under `/api/auth` to Better Auth:

```ts
import { auth } from "../../../../lib/auth";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ request }) => auth.handler(request);
export const POST: RequestHandler = ({ request }) => auth.handler(request);
```

### Sign in and read the session

[`src/lib/SignIn.svelte`](https://github.com/mockatoo/examples/blob/main/better-auth-sveltekit/src/lib/SignIn.svelte)
signs in with Better Auth's Svelte client:

```ts
const result = await authClient.signIn.social({
	provider,
	callbackURL: "/",
	errorCallbackURL: "/",
});
```

`errorCallbackURL` sends a failed sign-in, such as denied consent, back to `/`
with `?error=`.
[`src/routes/+page.server.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-sveltekit/src/routes/%2Bpage.server.ts)
reads the session and that error during server rendering:

```ts
export const load: PageServerLoad = async ({ request, url }) => ({
	mockatooUrl: MOCKATOO_URL,
	session: await auth.api.getSession({ headers: request.headers }),
	error: url.searchParams.get("error"),
});
```

## Set up Auth.js

### Point the providers at the mock

[`src/lib/auth.server.ts`](https://github.com/mockatoo/examples/blob/main/authjs-sveltekit/src/lib/auth.server.ts)
picks the mock helpers or the real providers with the same switch:

```ts
import type { AuthConfig } from "@auth/core";
import GitHub from "@auth/core/providers/github";
import { MockGitHub } from "@mockatoo/connect-authjs";
import { dev } from "$app/env";
import * as env from "$app/env/private";
import { providers } from "./providers";

const useMock = dev || __MOCKATOO_FORCE__;

export function authConfig(): AuthConfig {
	// …the AUTH_SECRET check
	const options = (index: number) => ({
		authorization: { params: { scope: providers[index].scope } },
	});
	// …the Microsoft options (see Handle provider differences)
	return {
		secret: env.AUTH_SECRET,
		trustHost: true,
		basePath: "/auth",
		pages: { signIn: "/", error: "/" },
		providers: useMock
			? [
					MockGitHub({ ...options(2) }),
					// …the other providers
				]
			: [
					GitHub({
						clientId: process.env.AUTH_GITHUB_ID,
						clientSecret: process.env.AUTH_GITHUB_SECRET,
						...options(2),
					}),
					// …the other providers
				],
	};
}
```

- Each `Mock*` helper wraps Auth.js's own provider and fills in the shared
  client.
- `options` sets each provider's scopes from
  [`src/lib/providers.ts`](https://github.com/mockatoo/examples/blob/main/authjs-sveltekit/src/lib/providers.ts),
  which also lists the buttons.
- `trustHost: true` stops Auth.js from rejecting the request's host with
  `UntrustedHost`.
- The example sets `useMock` the same way as the Better Auth one: use `dev`
  alone in your app.

### Mount Auth.js

[`src/routes/auth/[...auth]/+server.ts`](https://github.com/mockatoo/examples/blob/main/authjs-sveltekit/src/routes/auth/%5B...auth%5D/%2Bserver.ts)
passes each request to `@auth/core`. Its path must match `basePath`:

```ts
import { Auth } from "@auth/core";
import { authConfig } from "#lib/auth.server.ts";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ request }) => Auth(request, authConfig());
export const POST = GET;
```

### Sign in and read the session

[`src/routes/+page.svelte`](https://github.com/mockatoo/examples/blob/main/authjs-sveltekit/src/routes/%2Bpage.svelte)
fetches a CSRF token and posts to the sign-in endpoint:

```ts
const csrf = await fetch("/auth/csrf");
if (!csrf.ok) throw new Error("Could not load CSRF token");
const { csrfToken } = await csrf.json();
const response = await fetch(provider ? `/auth/signin/${provider}` : "/auth/signout", {
	method: "POST",
	headers: { "X-Auth-Return-Redirect": "1" },
	body: new URLSearchParams({ csrfToken, callbackUrl: "/" }),
});
if (!response.ok) throw new Error("Auth action failed");
const { url } = await response.json();
window.location.assign(url);
```

- `X-Auth-Return-Redirect: 1` makes Auth.js return the redirect URL as JSON
  instead of a 302, so the page can navigate to it.
- With no provider, the same call signs out.
- [`src/routes/+page.server.ts`](https://github.com/mockatoo/examples/blob/main/authjs-sveltekit/src/routes/%2Bpage.server.ts)
  reads the session with `fetch("/auth/session")`, which SvelteKit sends with
  the request's cookies.

## Trust Apple's callback

Apple returns to the callback with a cross-site form POST
(`response_mode=form_post`). SvelteKit rejects it with
`Cross-site POST form submissions are forbidden` before your auth library sees
the request. `pnpm dev` skips this check, so the error shows up only in
`pnpm build` output and deployments.
[`vite.config.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-sveltekit/vite.config.ts)
trusts the origin that sends the POST:

```ts
sveltekit({
	preprocess: vitePreprocess(),
	adapter: adapter({ runtime: "nodejs24.x" }),
	// Apple sends its OAuth callback as a cross-site form POST.
	csrf: {
		trustedOrigins: [
			MOCKATOO_FORCE === "true"
				? new URL(MOCKATOO_URL).origin
				: "https://appleid.apple.com",
		],
	},
}),
```

With the mock on, Mockatoo's origin sends the POST. With real providers, it's
Apple's.

## Handle provider differences

| Provider | What your library needs |
| --- | --- |
| Apple | The trusted origin above. With Auth.js in `pnpm dev`, HTTPS: run `HTTPS=true pnpm dev` and open `https://localhost:3000` (the example adds `@vitejs/plugin-basic-ssl`). With the real provider, a signed client secret |
| Discord | Auth.js: `issuer: "https://discord.com"` on both the real and the mock provider, because Discord sends `iss` on every sign-in. `MockDiscord` swaps in the mock's issuer |
| Microsoft | Auth.js: a `profile` that skips the photo request to `graph.microsoft.com`, which the mock can't serve. Better Auth: `tenantId: "common"` on the real provider |
| X | Auth.js: the `users.read tweet.read` scope. X's OAuth 2.0 API has no email, so the session shows the name |

The Microsoft options, from
[`src/lib/auth.server.ts`](https://github.com/mockatoo/examples/blob/main/authjs-sveltekit/src/lib/auth.server.ts):

```ts
const microsoft = {
	...options(6),
	profile: (profile: { sub: string; name?: string; email?: string }) => ({
		id: profile.sub,
		name: profile.name,
		email: profile.email,
		image: null,
	}),
};
```

Both `MockMicrosoftEntraID(microsoft)` and the real `MicrosoftEntraID` get
these options. See each provider's page, e.g. [Apple](providers/apple.md) or
[Microsoft](providers/microsoft.md), for its flow and known differences.

## Run it

Create `.env.local` with the secret your library reads (`BETTER_AUTH_SECRET`
or `AUTH_SECRET`) set to the output of `openssl rand -base64 32`, then run:

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000, pick a provider and sign in with your dashboard
email and password. To sign in as another user, add a tag to the email, e.g.
`you+alice@example.com` (see [Email tags](email-tags.md)).

## Test with Playwright

To cover failures after setting up sign-in, see [OAuth failure testing](https://mockatoo.globalunderdog.com/learn/oauth-failure-testing).

[`playwright.config.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-sveltekit/playwright.config.ts)
loads `.env.local` with Vite's `loadEnv`, then builds and previews the app:

```ts
Object.assign(process.env, loadEnv("development", process.cwd(), ""));

export default defineConfig({
	testDir: "./tests",
	// …parallelism, reporter, trace and projects
	use: {
		baseURL: "http://localhost:3000",
	},
	webServer: {
		command: "pnpm build && pnpm preview",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
		timeout: 180_000,
	},
});
```

The tests run a production build, where `dev` is false. The examples keep
the mock on with `MOCKATOO_FORCE=true` in `.env`. After you delete that line,
run the tests with `MOCKATOO_FORCE=true pnpm test`.

[`tests/sign-in.spec.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-sveltekit/tests/sign-in.spec.ts)
signs in, checks the email, and signs out:

```ts
await page.goto("/");
await page.getByRole("button", { name: "Sign in", exact: true }).click();
await page.locator("#email").fill(email as string);
await page.locator("#password").fill(password as string);
await page.getByRole("button", { name: "Log in with password" }).click();
await page.getByRole("button", { name: "Authorize" }).click();
await expect(
	page.getByRole("heading", { name: "Your session" }),
).toBeVisible();
await expect(page.locator(".email")).toHaveText(email as string);
```

The Auth.js example's
[spec](https://github.com/mockatoo/examples/blob/main/authjs-sveltekit/tests/sign-in.spec.ts)
runs the same flow for all eight providers over HTTPS, and declines consent
with Google. With `MOCKATOO_TEST_EMAIL` and `MOCKATOO_TEST_PASSWORD` in
`.env.local` or the environment, run:

```sh
pnpm exec playwright install chromium
pnpm test
```

The [Playwright guide](playwright.md) covers fresh users per test, edge-case
tags and token refresh. Those tests work the same against a SvelteKit app.

## Run in CI

The example's
[workflow](https://github.com/mockatoo/examples/blob/main/.github/workflows/better-auth-sveltekit.yml)
type-checks, generates a secret, then runs the tests with the credentials as
secrets:

```yaml
- run: pnpm --dir better-auth-sveltekit typecheck
- name: Generate runtime secret
  run: echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" >> "$GITHUB_ENV"
- run: pnpm --dir better-auth-sveltekit exec playwright install --with-deps chromium
- run: pnpm --dir better-auth-sveltekit test
  env:
    MOCKATOO_TEST_EMAIL: ${{ secrets.MOCKATOO_TEST_EMAIL }}
    MOCKATOO_TEST_PASSWORD: ${{ secrets.MOCKATOO_TEST_PASSWORD }}
```

More in [Run in CI](ci.md).

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `BETTER_AUTH_SECRET is required. Set it in .env.local or your deployment environment.` | Add a random secret to `.env.local`, or to the deployment's environment |
| `AUTH_SECRET is required. Set it in .env.local or your deployment environment.` | The same, for Auth.js |
| `Cross-site POST form submissions are forbidden` on the Apple callback | Add the sending origin to `csrf.trustedOrigins` (see [Trust Apple's callback](#trust-apples-callback)) |
| The real provider's login page opens | The mock isn't on: `dev` is false in `pnpm build`. Run `pnpm dev`, or set `MOCKATOO_FORCE=true` before building. Vite reads it at build time |
| Better Auth redirects back with `state_mismatch` | Open the app on the same host as its configured origin (`ORIGIN` in an app made with `sv`): `localhost` and `127.0.0.1` keep separate cookies, so the state cookie is missing at the callback |
| `Set MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD in .env.local or the environment.` | Copy the test account's email and password from the dashboard |

## Next steps

- [All examples](https://github.com/mockatoo/examples): Auth.js, Better Auth, SvelteKit, Nuxt, Hono, Django, Flask, Laravel and Spring Boot
- [`@mockatoo/sv`](https://github.com/mockatoo/sv) · [Playwright](playwright.md) · [Nuxt](nuxt.md) · [Run in CI](ci.md) · [Email tags](email-tags.md) · [Account flow](account-flow.md) · [Apple](providers/apple.md)
- [OAuth failure testing](https://mockatoo.globalunderdog.com/learn/oauth-failure-testing): test what your app does when sign-in fails
- Use Mockatoo only outside production, and never commit its credentials.
