---
description: "Test Google, GitHub, Apple and other OAuth sign-in in Nuxt with Mockatoo: Auth.js in a Nitro server route, Playwright tests and CI."
---

# Nuxt

Sign in through OAuth in a Nuxt 3 app with Auth.js, locally and in CI, with
any of the eight providers Mockatoo mocks.

You don't need a Nuxt auth module. One Nitro server route hands each request
to `@auth/core`, and `@mockatoo/connect-authjs` swaps each Auth.js provider
for one pointed at the mock. This guide covers Auth.js. There's no example
for nuxt-auth-utils yet.

**Example on GitHub:** [`mockatoo/examples/authjs-nuxt`](https://github.com/mockatoo/examples/tree/main/authjs-nuxt).
The connector setup is the same as in
[`authjs-next`](https://github.com/mockatoo/examples/tree/main/authjs-next)
and [`authjs-sveltekit`](https://github.com/mockatoo/examples/tree/main/authjs-sveltekit).

## How it works

1. Your sign-in button posts to `/api/auth/signin/<provider>`, and Auth.js
   redirects to the mock on the provider's real paths:
   `accounts.google.com/o/oauth2/v2/auth` becomes
   `app.mockatoo.globalunderdog.com/google/o/oauth2/v2/auth`.
2. You (or a test) fill in the login page and click **Authorize**.
3. The mock redirects back to `/api/auth/callback/<provider>`. Auth.js
   exchanges the code for provider-shaped tokens, checks the ID token or
   reads the profile, and sets the session cookie, as it would in production.

Your scopes, callbacks and session handling don't change. Only the provider
list does, and only when the mock is on.

## Prerequisites

- **Node.js 24**, with `nuxt` 3, `@auth/core`, `next-auth` 5 (for its
  provider imports) and `@mockatoo/connect-authjs`
  ([`package.json`](https://github.com/mockatoo/examples/blob/main/authjs-nuxt/package.json)).
- **A Mockatoo test account.** Sign up at
  [app.mockatoo.globalunderdog.com](https://app.mockatoo.globalunderdog.com),
  then copy the email and password from the dashboard.

## Mount Auth.js in a server route

[`server/api/auth/[...auth].ts`](https://github.com/mockatoo/examples/blob/main/authjs-nuxt/server/api/auth/%5B...auth%5D.ts)
converts the H3 event to a web `Request`, runs Auth.js, and sends its
`Response` back:

```ts
import { Auth } from "@auth/core";
import { authConfig } from "../../../lib/auth";

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig(event);
	const response = await Auth(
		toWebRequest(event),
		authConfig(config.mockatooForce || process.env.NODE_ENV !== "production"),
	);
	return sendWebResponse(event, response);
});
```

- The catch-all route serves every Auth.js endpoint under `/api/auth`:
  sign-in, callback, session, CSRF and sign-out.
- The mock is on outside production. The example's committed
  [`.env`](https://github.com/mockatoo/examples/blob/main/authjs-nuxt/.env)
  also sets `MOCKATOO_FORCE=true`, which
  [`nuxt.config.ts`](https://github.com/mockatoo/examples/blob/main/authjs-nuxt/nuxt.config.ts)
  reads into `runtimeConfig.mockatooForce` at build time, so its live demo runs
  on the mock. Delete that line in your app. Never ship it.

## Point the providers at the mock

[`lib/auth.ts`](https://github.com/mockatoo/examples/blob/main/authjs-nuxt/lib/auth.ts)
picks the mock helpers or the real providers with one switch:

```ts
import type { AuthConfig } from "@auth/core";
import { MockGitHub, MockGoogle } from "@mockatoo/connect-authjs";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { providers } from "./providers";

export function authConfig(useMock: boolean): AuthConfig {
	const options = (index: number) => ({
		authorization: { params: { scope: providers[index].scope } },
	});
	return {
		secret: process.env.AUTH_SECRET,
		basePath: "/api/auth",
		trustHost: true,
		pages: { signIn: "/", error: "/" },
		providers: useMock
			? [
					MockGoogle({ ...options(1) }),
					MockGitHub({ ...options(2) }),
					// …the other providers
				]
			: [
					Google({
						clientId: process.env.AUTH_GOOGLE_ID,
						clientSecret: process.env.AUTH_GOOGLE_SECRET,
						...options(1),
					}),
					// …the other providers
				],
	};
}
```

- Each helper wraps Auth.js's own provider and fills in the shared client,
  `mockatoo` / `mockatoo-secret`. It accepts any `http(s)` callback, so
  localhost and preview URLs need no provider setup.
- `options` sets each provider's scopes from
  [`lib/providers.ts`](https://github.com/mockatoo/examples/blob/main/authjs-nuxt/lib/providers.ts),
  which also lists the buttons.
- `basePath` must match the server route's path. `trustHost: true` stops
  Auth.js from rejecting the request's host with `UntrustedHost`.
- `pages` sends sign-in and errors back to `/`, where the page shows an error
  when the URL has `?error=`.

Already use Auth.js with real providers? Keep your list, and in development or
CI swap each provider for its `Mock*` helper. The example's
[README](https://github.com/mockatoo/examples/tree/main/authjs-nuxt#before-production)
lists every real provider's credentials and callback path.

## Sign in and read the session

[`app.vue`](https://github.com/mockatoo/examples/blob/main/authjs-nuxt/app.vue)
reads the session during server rendering, and signs in with a CSRF token and
a POST:

```ts
const { data: session } = await useFetch<Session | null>("/api/auth/session");

async function submit(provider?: string) {
	const { csrfToken } = await $fetch<{ csrfToken: string }>("/api/auth/csrf");
	const result = await $fetch<{ url: string }>(
		provider ? `/api/auth/signin/${provider}` : "/api/auth/signout",
		{
			method: "POST",
			headers: { "X-Auth-Return-Redirect": "1" },
			body: new URLSearchParams({ csrfToken, callbackUrl: "/" }),
		},
	);
	window.location.assign(result.url);
}
```

- `useFetch` forwards the request's cookies during server rendering, so the
  first render already knows the user.
- `X-Auth-Return-Redirect: 1` makes Auth.js return the redirect URL as JSON
  instead of a 302, so the page can navigate to it.
- With no provider, the same call signs out.

## Handle provider differences

| Provider | What Auth.js needs |
| --- | --- |
| Discord | `issuer: "https://discord.com"` on both the real and the mock provider: Discord sends `iss` on every sign-in, and Auth.js rejects it otherwise. `MockDiscord` swaps in the mock's issuer |
| Microsoft | A `profile` that skips the photo request: the provider fetches it from `graph.microsoft.com`, which the mock can't serve |
| X | The `users.read tweet.read` scope. X's OAuth 2.0 API has no email, so the session shows the name |
| Apple | Nothing with the mock. With the real provider, a signed client secret |

The Microsoft options, from the example:

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

See each provider's page, e.g. [Discord](providers/discord.md) or
[Microsoft](providers/microsoft.md), for its flow and known differences.

## Run it

Create `.env.local` with `AUTH_SECRET` set to the output of
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

[`playwright.config.ts`](https://github.com/mockatoo/examples/blob/main/authjs-nuxt/playwright.config.ts)
builds and starts the production server, or tests a deployed app when
`PLAYWRIGHT_BASE_URL` is set:

```ts
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
	testDir: "./tests",
	use: { baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000" },
	webServer: process.env.PLAYWRIGHT_BASE_URL
		? undefined
		: {
				command: "pnpm build && pnpm start",
				url: "http://localhost:3000",
				reuseExistingServer: !process.env.CI,
				timeout: 180000,
			},
});
```

[`tests/sign-in.spec.ts`](https://github.com/mockatoo/examples/blob/main/authjs-nuxt/tests/sign-in.spec.ts)
signs in and out with every provider, and declines consent with Google:

```ts
await page.goto("/");
await page
	.getByRole("button", { name: `Sign in with ${provider}` })
	.click();
await page.locator("#email").fill(email as string);
await page.locator("#password").fill(password as string);
await page.getByRole("button", { name: "Log in with password" }).click();
await page.getByRole("button", { name: decision }).click();
```

Add `MOCKATOO_TEST_EMAIL` and `MOCKATOO_TEST_PASSWORD` to `.env.local` or the
environment, then run:

```sh
pnpm exec playwright install chromium
pnpm test
```

The [Playwright guide](playwright.md) covers fresh users per test, edge-case
tags and token refresh. Those tests work the same against a Nuxt app.

## Run in CI

The example's
[workflow](https://github.com/mockatoo/examples/blob/main/.github/workflows/authjs-nuxt.yml)
type-checks, generates a secret, then runs the tests with the credentials as
secrets:

```yaml
- run: pnpm --dir authjs-nuxt typecheck
- name: Generate runtime secret
  run: echo "AUTH_SECRET=$(openssl rand -base64 32)" >> "$GITHUB_ENV"
- run: pnpm --dir authjs-nuxt exec playwright install --with-deps chromium
- run: pnpm --dir authjs-nuxt test
  env:
    MOCKATOO_TEST_EMAIL: ${{ secrets.MOCKATOO_TEST_EMAIL }}
    MOCKATOO_TEST_PASSWORD: ${{ secrets.MOCKATOO_TEST_PASSWORD }}
```

More in [Run in CI](ci.md).

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `AUTH_SECRET is required. Set it in .env.local or your deployment environment.` | Add a random secret to `.env.local`, or to the deployment's environment |
| The real provider's login page opens | The mock isn't on: run `pnpm dev`, or set `MOCKATOO_FORCE=true` in `.env` before `pnpm build`. Nuxt reads it at build time |
| `Set MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD in .env.local or the environment.` | Copy the test account's email and password from the dashboard |
| Login fails after a password change | Copy the new password from the dashboard into `.env.local` and your secrets |

## Next steps

- [All examples](https://github.com/mockatoo/examples): Auth.js, Better Auth, SvelteKit, Nuxt, Hono, Django, Flask, Laravel and Spring Boot
- [Playwright](playwright.md) · [SvelteKit](sveltekit.md) · [Email tags](email-tags.md) · [Account flow](account-flow.md) · [Run in CI](ci.md)
- Use Mockatoo only outside production, and never commit its credentials.
