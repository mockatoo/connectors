---
description: "Test Google, GitHub, Apple and other OAuth sign-in with Playwright: all 8 providers, a fresh user per test, edge-case tags and token refresh, locally and in CI."
title: "Mock OAuth login in Playwright tests · Mockatoo"
datePublished: 2026-11-05
lastModified: 2026-11-25
---

# Playwright

Sign in through OAuth from a Playwright test, locally and in CI, with any of the
eight providers Mockatoo mocks.

**Example on GitHub:** [`mockatoo/examples/better-auth-next`](https://github.com/mockatoo/examples/tree/main/better-auth-next/tests).
Every other example (Auth.js, SvelteKit, Nuxt, Hono) has the same suite.

## Why real providers break Playwright tests

| With the real provider | With Mockatoo |
| --- | --- |
| Bot checks, CAPTCHAs and MFA block headless browsers | No bot checks, and the form labels never change |
| A developer app, client secret and redirect URI for every environment and preview URL | One shared client (`mockatoo` / `mockatoo-secret`) that accepts any `http(s)` callback |
| Rate limits on repeated logins | Bursts of sign-ins are allowed |
| A real account whose password you can't share | A generated password that's safe to give to CI and agents |

Playwright isn't the problem. The live provider login is.

## How it works

1. Your app's sign-in button redirects to the mock, on the provider's real
   paths: `accounts.google.com/o/oauth2/v2/auth` becomes
   `app.mockatoo.globalunderdog.com/google/o/oauth2/v2/auth`.
2. The test fills in the login page and clicks **Authorize** on the consent page.
3. The mock redirects back to your callback with a code. Your app exchanges
   it for provider-shaped tokens and a signed ID token, as it would in production.

The connector is your framework's real provider with the mock's base URL, so
your auth code doesn't change.

## Prerequisites

- **`@playwright/test` 1.56 or later**, and its Chromium browser:
  `pnpm exec playwright install chromium`.
- **An app wired to Mockatoo** behind a non-production check. Run
  `npx -y @mockatoo/mockatoo@latest init`, or see the
  [Better Auth example](https://github.com/mockatoo/examples/tree/main/better-auth-next/).
- **A Mockatoo test account.** Sign up at
  [app.mockatoo.globalunderdog.com](https://app.mockatoo.globalunderdog.com),
  then copy the email and password from the dashboard.
- **The credentials in `.env.local`** (git-ignored) or the environment:

```sh
MOCKATOO_TEST_EMAIL=<your Mockatoo test email>
MOCKATOO_TEST_PASSWORD=<your Mockatoo test password>
```

## Configure Playwright

[`playwright.config.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-next/playwright.config.ts):

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./tests",
	use: { baseURL: "http://localhost:3000" },
	webServer: {
		command: "pnpm build && pnpm start",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
```

- `webServer` builds and starts the app before the tests, and reuses a running
  one locally.
- It tests a production build, so the connector must stay on the mock there
  (the example sets `MOCKATOO_FORCE` in its committed `.env`).

## Sign in

Playwright follows the redirect to the mock like any other page, so the login
steps need no cross-origin wrapper. The labels don't change between providers,
so one loop tests all eight.
[`sign-in.spec.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-next/tests/sign-in.spec.ts):

```ts
import nextEnv from "@next/env";
import { expect, test } from "@playwright/test";

nextEnv.loadEnvConfig(process.cwd());
const email = process.env.MOCKATOO_TEST_EMAIL;
const password = process.env.MOCKATOO_TEST_PASSWORD;

test.beforeEach(() => {
	if (!email || !password)
		throw new Error(
			"Set MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD in .env.local or the environment.",
		);
});

for (const provider of [
	"Apple",
	"Google",
	"GitHub",
	"Discord",
	"Facebook",
	"LinkedIn",
	"Microsoft",
	"X",
] as const) {
	test(`sign in with ${provider}`, async ({ page }) => {
		await page.goto("/");
		await page
			.getByRole("button", { name: `Sign in with ${provider}` })
			.click();
		await page.locator("#email").fill(email as string);
		await page.locator("#password").fill(password as string);
		await page.getByRole("button", { name: "Log in with password" }).click();
		await page.getByRole("button", { name: "Authorize" }).click();
		await expect(
			page.getByRole("heading", { name: "Your session" }),
		).toBeVisible();
	});
}
```

The login and consent pages are the same for every provider:

| Element | Locator |
| --- | --- |
| Email field | `#email` or `getByLabel("Email", { exact: true })` |
| Password field | `#password` or `getByLabel("Password", { exact: true })` |
| Submit login | `getByRole("button", { name: "Log in with password" })` |
| Consent | `getByRole("button", { name: "Authorize" })` or `"Deny"` |

- `@next/env` loads `.env.local` the way Next.js does. The other examples use
  `process.loadEnvFile(".env.local")` (Nuxt, Hono) or Vite's `loadEnv` (SvelteKit).

## Reuse it: `signIn()`

Move the flow into helpers, so each test needs one line.
[`tests/helpers.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-next/tests/helpers.ts):

```ts
export async function logIn(page: Page, provider: Provider, address: string) {
	await page.goto("/");
	await page.getByRole("button", { name: `Sign in with ${provider}` }).click();
	await page.getByLabel("Email", { exact: true }).fill(address);
	await page.getByLabel("Password", { exact: true }).fill(password);
	await page.getByRole("button", { name: "Log in with password" }).click();
}

export async function signIn(page: Page, provider: Provider, address: string) {
	await logIn(page, provider, address);
	await page.getByRole("button", { name: "Authorize" }).click();
}
```

- `logIn` stops at the consent page, for tests that never reach it (see
  `+blocked` [below](#test-edge-cases)).
- `address` is the email to sign in as. Create it with
  [`createAddress()`](#a-fresh-user-per-test).

`sessionUser()` reads the session the example app displays, so tests can
assert on the user without decoding cookies or tokens:

```ts
export async function sessionUser(page: Page): Promise<User> {
	await expect(page.getByRole("heading", { name: "Your session" })).toBeVisible(
		{
			timeout: 15_000,
		},
	);
	// Read the session the app displays, without decoding cookies or provider tokens.
	return JSON.parse((await page.locator("pre code").textContent()) ?? "").user;
}
```

## A fresh user per test

The email address is the only test state. `you+e2e-1@example.com` is a
separate, stable user with the same password, so there's nothing to seed or
clean up. `createAddress()` adds a random tag, so every test, worker and run
gets its own user:

```ts
export function createAddress(tag = ""): string {
	if (!email || !password)
		throw new Error(
			"Set MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD in .env.local or the environment.",
		);
	// An ordinary tag isolates each app account, including across repeated runs.
	return email.replace("@", `+e2e-${randomUUID()}${tag ? `.${tag}` : ""}@`);
}
```

- Pass a [special tag](#test-edge-cases) to append it, e.g.
  `you+e2e-<uuid>.unverified@example.com`.
- Because no two tests share a user, `fullyParallel: true` is safe
  (the SvelteKit example turns it on).
- See [Email tags](email-tags.md) for how tagged addresses work.

## Test edge cases

[OAuth failure testing](https://mockatoo.globalunderdog.com/learn/oauth-failure-testing) explains which sign-in failures to cover. The [Better Auth `invalid_code` walkthrough](https://mockatoo.globalunderdog.com/blog/better-auth-invalid-code) tests a Google outage and checks the retry message.

Special tags change what the provider does. The example has one self-contained
spec per tag in [`tests/tags`](https://github.com/mockatoo/examples/tree/main/better-auth-next/tests/tags).
For example, [`unverified.spec.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-next/tests/tags/unverified.spec.ts)
signs in with the tagged address and checks that the session marks the email unverified:

```ts
const email = process.env.MOCKATOO_TEST_EMAIL ?? "";
const password = process.env.MOCKATOO_TEST_PASSWORD ?? "";

test("+unverified: keeps an unverified email unverified", async ({ page }) => {
	const address = email.replace("@", `+e2e-${crypto.randomUUID()}.unverified@`);
	// Sign-in is allowed, but an app must not treat this address as verified.
	await page.goto("/");
	await page.getByRole("button", { name: "Sign in with Google" }).click();
	await page.getByLabel("Email", { exact: true }).fill(address);
	await page.getByLabel("Password", { exact: true }).fill(password);
	await page.getByRole("button", { name: "Log in with password" }).click();
	await page.getByRole("button", { name: "Authorize" }).click();
	await expect(page.getByRole("heading", { name: "Your session" })).toBeVisible(
		{ timeout: 15_000 },
	);
	expect(
		JSON.parse((await page.locator("pre code").textContent()) ?? "").user,
	).toMatchObject({
		email: address,
		emailVerified: false,
	});
});
```

[`down.spec.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-next/tests/tags/down.spec.ts)
checks that a token endpoint outage returns the browser with `?error=invalid_code`:

```ts
	await page.getByRole("button", { name: "Authorize" }).click();
	await expect(page).toHaveURL(
		(url) =>
			url.pathname === "/" && url.searchParams.get("error") === "invalid_code",
	);
```

Clicking **Deny** returns `access_denied` with the original `state`, as the real
providers do. From `sign-in.spec.ts`:

```ts
	await page.getByRole("button", { name: "Log in with password" }).click();
	await page.getByRole("button", { name: "Deny" }).click();
	await expect(
		page.getByRole("alert").filter({ hasText: /^Sign-in failed/ }),
	).toBeVisible();
```

Some other tags the example tests:

| Tag | Behavior |
| --- | --- |
| `+returning` | A returning Apple user, without the name Apple sends only on first consent |
| `+blocked` | An admin blocks consent, so there's no **Authorize** button and no session (Google `admin_policy_enforced`) |
| `+slow` | A slow token endpoint, to check your timeouts and loading states |
| `+private` | A GitHub user whose `/user` email is null |
| `+hd` | A Google Workspace account (`hd` claim) |
| `+revoked`, `+mfa` | A refresh token the provider rejects ([below](#test-token-refresh)), such as Microsoft's `AADSTS50076` when MFA is newly required |

Each provider supports its own tags. See its page, e.g.
[Google](providers/google.md), for the full list.

## Test token refresh

`page.request` sends the browser's cookies, so a test can call your app's
API as the signed-in user. With `+revoked`, sign-in succeeds but the refresh
fails. [`revoked.spec.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-next/tests/tags/revoked.spec.ts)
signs in, then asks the app to refresh the token:

```ts
	const address = email.replace("@", `+e2e-${crypto.randomUUID()}.revoked@`);
	// Revoked access affects refresh, not initial sign-in. Better Auth reports
	// a refresh failure to the app without exposing Microsoft's provider error.
	await page.goto("/");
	await page.getByRole("button", { name: "Sign in with Microsoft" }).click();
	await page.getByLabel("Email", { exact: true }).fill(address);
	await page.getByLabel("Password", { exact: true }).fill(password);
	await page.getByRole("button", { name: "Log in with password" }).click();
	await page.getByRole("button", { name: "Authorize" }).click();
	await expect(page.getByRole("heading", { name: "Your session" })).toBeVisible(
		{ timeout: 15_000 },
	);
	expect(
		JSON.parse((await page.locator("pre code").textContent()) ?? "").user.email,
	).toBe(address);
	// Exercise the app's public auth API with the browser's session cookies.
	const response = await page.request.post("/api/auth/refresh-token", {
		data: { useAccountCookie: true },
		headers: { Origin: new URL(page.url()).origin },
	});
	expect(response.status()).toBe(400);
	expect(await response.json()).toMatchObject({
		code: "FAILED_TO_REFRESH_ACCESS_TOKEN",
		message: "Failed to refresh access token",
	});
```

`/api/auth/refresh-token` is Better Auth's refresh endpoint. Use your
framework's own.

## Test a deployed app

The Nuxt example skips `webServer` when `PLAYWRIGHT_BASE_URL` is set, so the
same suite runs against a preview deployment.
[`authjs-nuxt/playwright.config.ts`](https://github.com/mockatoo/examples/blob/main/authjs-nuxt/playwright.config.ts):

```ts
	use: { baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000" },
	webServer: process.env.PLAYWRIGHT_BASE_URL
		? undefined
		: {
				command: "pnpm build && pnpm start",
				url: "http://localhost:3000",
				reuseExistingServer: !process.env.CI,
				timeout: 180000,
			},
```

The shared client accepts any `http(s)` callback, so preview URLs need no
provider setup.

## Run in CI

Store the dashboard credentials as `MOCKATOO_TEST_EMAIL` and
`MOCKATOO_TEST_PASSWORD` secrets. From the example's
[workflow](https://github.com/mockatoo/examples/blob/main/.github/workflows/better-auth-next.yml):

```yaml
- name: Generate runtime secret
  run: echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" >> "$GITHUB_ENV"
- run: pnpm --dir better-auth-next exec playwright install --with-deps chromium
- run: pnpm --dir better-auth-next test
  env:
    MOCKATOO_TEST_EMAIL: ${{ secrets.MOCKATOO_TEST_EMAIL }}
    MOCKATOO_TEST_PASSWORD: ${{ secrets.MOCKATOO_TEST_PASSWORD }}
```

- The workflow's `ci` script runs Playwright, then Cypress and Selenium. The
  Auth.js example's workflow sets `AUTH_SECRET` instead.
- `webServer` builds and starts the app, so the workflow only installs
  dependencies and Chromium.
- `reuseExistingServer: !process.env.CI` starts a fresh server in CI.
- Regenerating the password on the dashboard ends other password sessions.
  Update the secrets right after.
- More in [Run in CI](ci.md).

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Set MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD …` | Add both to `.env.local`, or pass the CI secrets as `env` |
| `Executable doesn't exist` | Run `pnpm exec playwright install chromium` (`--with-deps` in CI) |
| The real provider's login page opens | The production build isn't using the mock: check your non-production check (e.g. `MOCKATOO_FORCE`) |
| `webServer` times out | Raise its `timeout`; it includes the production build |
| A test times out with `+slow` | Raise the timeout on the assertion that waits for the session |
| Login fails after a password change | Copy the new password from the dashboard into `.env.local` and your secrets |

## Next steps

- [All examples](https://github.com/mockatoo/examples): Auth.js, Better Auth, SvelteKit, Nuxt and Hono, each with a Playwright suite
- [Cypress](cypress.md) · [Selenium](selenium.md) · [Next.js](nextjs.md) · [Nuxt](nuxt.md) · [Remix](remix.md) · [SvelteKit](sveltekit.md) · [Hono](hono.md) · [Email tags](email-tags.md) · [Account flow](account-flow.md) · [Run in CI](ci.md)
- Use Mockatoo only outside production, and never commit its credentials.
