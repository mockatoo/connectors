---
description: "Test Google, GitHub, Apple and other OAuth sign-in in Remix with Mockatoo: Auth.js in a resource route, Playwright tests and CI."
title: "Test OAuth login in Remix with Auth.js · Mockatoo"
datePublished: 2026-11-21
lastModified: 2026-11-26
tested:
  authjs-remix: ["@remix-run/node@2.17.5", "@auth/core@0.41.3", "@mockatoo/connect-authjs@0.2.1", "@playwright/test@1.64.1"]
---

# Remix

Sign in through OAuth in a Remix 2 app with Auth.js, locally and in CI, with
any of the eight providers Mockatoo mocks.

There's no Auth.js adapter package for Remix, and you don't need one. A
resource route hands each request to `@auth/core`, and
`@mockatoo/connect-authjs` swaps each Auth.js provider for one pointed at the
mock. The example runs Remix 2.17 with Vite. There's no example yet for
React Router 7, Remix's successor.

**Example on GitHub:** [`mockatoo/examples/authjs-remix`](https://github.com/mockatoo/examples/tree/main/authjs-remix).
The connector setup is the same as in
[`authjs-nuxt`](https://github.com/mockatoo/examples/tree/main/authjs-nuxt)
and [`authjs-sveltekit`](https://github.com/mockatoo/examples/tree/main/authjs-sveltekit).

## How it works

1. Your sign-in form posts to `/api/auth/signin/<provider>`, and Auth.js
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

- **Node.js 24**, with `@remix-run/node` 2, `@auth/core` and
  `@mockatoo/connect-authjs`
  ([`package.json`](https://github.com/mockatoo/examples/blob/main/authjs-remix/package.json)).
- **A Mockatoo test account.** Sign up at
  [app.mockatoo.globalunderdog.com](https://app.mockatoo.globalunderdog.com),
  then copy the email and password from the dashboard.

## Mount Auth.js in a resource route

[`app/routes/api.auth.$.ts`](https://github.com/mockatoo/examples/blob/main/authjs-remix/app/routes/api.auth.%24.ts)
is a splat route with no component, so Remix returns Auth.js's `Response` as
is:

```ts
import { Auth } from "@auth/core";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { authConfig } from "../auth.server";

export function loader({ request }: LoaderFunctionArgs) {
	return Auth(request, authConfig());
}

export function action({ request }: ActionFunctionArgs) {
	return Auth(request, authConfig());
}
```

- The `$` segment matches every Auth.js endpoint under `/api/auth`: sign-in,
  callback, session, CSRF and sign-out.
- `loader` serves the GET endpoints, and `action` the POSTs, including
  Apple's `form_post` callback.

## Point the providers at the mock

[`app/auth.server.ts`](https://github.com/mockatoo/examples/blob/main/authjs-remix/app/auth.server.ts)
picks the mock helpers or the real providers with one switch:

```ts
import type { AuthConfig } from "@auth/core";
import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";
import { MockGitHub, MockGoogle } from "@mockatoo/connect-authjs";
import { json } from "@remix-run/node";
import { providers } from "./providers";

const secret = process.env.AUTH_SECRET;
if (!secret) throw new Error("Set AUTH_SECRET before starting the app.");

const useMock =
	import.meta.env.DEV || import.meta.env.MOCKATOO_FORCE === "true";

export function authConfig(): AuthConfig {
	// Remix 2's Node adapter can install a Response implementation without this
	// static method, which Auth.js uses when handling provider discovery.
	Response.json ??= json;

	const options = (index: number) => ({
		authorization: { params: { scope: providers[index].scope } },
	});
	return {
		secret,
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
- `useMock` is fixed at build time. `import.meta.env.DEV` is true under
  `pnpm dev`, and
  [`vite.config.ts`](https://github.com/mockatoo/examples/blob/main/authjs-remix/vite.config.ts)
  adds `MOCKATOO_FORCE` to `envPrefix`, so Vite exposes it as
  `import.meta.env.MOCKATOO_FORCE`:

  ```ts
  export default defineConfig({
  	envPrefix: ["VITE_", "MOCKATOO_FORCE"],
  	plugins: [remix({ presets: process.env.VERCEL ? [vercelPreset()] : [] })],
  });
  ```

- The example's committed
  [`.env`](https://github.com/mockatoo/examples/blob/main/authjs-remix/.env)
  sets `MOCKATOO_FORCE=true` so its live demo runs on the mock. Delete that
  line in your app. Never ship it.
- `Response.json ??= json` restores the static `Response.json`, which Auth.js
  uses when handling provider discovery. Remix 2's Node adapter can install a
  `Response` without it. Keep the line with real providers too.
- `basePath` must match the resource route's path. `trustHost: true` stops
  Auth.js from rejecting the request's host with `UntrustedHost`.

Already use Auth.js with real providers? Keep your list, and in development or
CI swap each provider for its `Mock*` helper. The example's
[README](https://github.com/mockatoo/examples/tree/main/authjs-remix#before-production)
lists every real provider's credentials and callback path.

## Sign in and read the session

[`app/root.tsx`](https://github.com/mockatoo/examples/blob/main/authjs-remix/app/root.tsx)
calls Auth.js's session and CSRF endpoints in-process from the loader, so the
page renders with the user and a form token in one request:

```ts
export async function loader({ request }: LoaderFunctionArgs) {
	const config = authConfig();
	const [sessionResponse, csrfResponse] = await Promise.all(
		["session", "csrf"].map((action) =>
			Auth(
				new Request(new URL(`/api/auth/${action}`, request.url), {
					headers: request.headers,
				}),
				config,
			),
		),
	);
	// …throw either response if it isn't ok
	const session: Session | null = await sessionResponse.json();
	const { csrfToken } = await csrfResponse.json();
	// Auth.js can issue a CSRF cookie in both responses. Send the cookie
	// generated for the form token last so it takes precedence.
	const headers = new Headers(sessionResponse.headers);
	csrfResponse.headers.forEach((value, name) => {
		if (name === "set-cookie") headers.append(name, value);
	});
	return json({ session, csrfToken, mockatooUrl: MOCKATOO_URL }, { headers });
}
```

Each sign-in button is a plain HTML form, so it works before the JavaScript
loads (trimmed to the form fields):

```ts
<form method="post" action={`/api/auth/signin/${provider.id}`}>
	<input type="hidden" name="csrfToken" value={csrfToken} />
	<input type="hidden" name="callbackUrl" value="/" />
	<button type="submit">Sign in with {provider.name}</button>
</form>
```

- Forwarding `request.headers` passes the session and CSRF cookies to
  Auth.js.
- The `set-cookie` merge sends the CSRF cookie that matches the form's token
  last, so the browser keeps that one.
- Sign-out is the same form posting to `/api/auth/signout`.

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

[`playwright.config.ts`](https://github.com/mockatoo/examples/blob/main/authjs-remix/playwright.config.ts)
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

[`tests/sign-in.spec.ts`](https://github.com/mockatoo/examples/blob/main/authjs-remix/tests/sign-in.spec.ts)
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
tags and token refresh. Those tests work the same against a Remix app.

## Run in CI

The example's
[workflow](https://github.com/mockatoo/examples/blob/main/.github/workflows/authjs-remix.yml)
type-checks, generates a secret, then runs the tests with the credentials as
secrets:

```yaml
- run: pnpm --dir authjs-remix typecheck
- name: Generate runtime secret
  run: echo "AUTH_SECRET=$(openssl rand -base64 32)" >> "$GITHUB_ENV"
- run: pnpm --dir authjs-remix exec playwright install --with-deps chromium
- run: pnpm --dir authjs-remix test
  env:
    MOCKATOO_TEST_EMAIL: ${{ secrets.MOCKATOO_TEST_EMAIL }}
    MOCKATOO_TEST_PASSWORD: ${{ secrets.MOCKATOO_TEST_PASSWORD }}
```

More in [Run in CI](ci.md).

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Set AUTH_SECRET before starting the app.` | Add a random secret to `.env.local`, or to the deployment's environment |
| The real provider's login page opens | The mock isn't on: run `pnpm dev`, or set `MOCKATOO_FORCE=true` in `.env` before `pnpm build`. Vite reads it at build time |
| `Set MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD in .env.local or the environment.` | Copy the test account's email and password from the dashboard |
| Login fails after a password change | Copy the new password from the dashboard into `.env.local` and your secrets |

## Next steps

- [All examples](https://github.com/mockatoo/examples): Auth.js, Better Auth, SvelteKit, Nuxt, Remix, Hono, Django, Flask, Laravel and Spring Boot
- [Playwright](playwright.md) · [Nuxt](nuxt.md) · [Email tags](email-tags.md) · [Account flow](account-flow.md) · [Run in CI](ci.md)
- [Let your coding agent sign in](https://mockatoo.globalunderdog.com/learn/coding-agent-sign-in): have Claude Code, Codex or Cursor set up sign-in and verify it with a passing test
- [OAuth on localhost, previews and CI](https://mockatoo.globalunderdog.com/learn/oauth-localhost-preview-ci): why each new URL needs a registered redirect URI, and how to sign in without one
- Use Mockatoo only outside production, and never commit its credentials.
