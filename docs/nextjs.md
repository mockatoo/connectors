---
description: "Test Google, GitHub, Apple and other OAuth sign-in in Next.js with Mockatoo: Auth.js or Better Auth pointed at the mock, Playwright tests and CI."
title: "Test Next.js OAuth login: Auth.js, Better Auth · Mockatoo"
lastModified: 2026-11-24
---

# Next.js

Sign in through OAuth in a Next.js App Router app with Auth.js or Better
Auth, locally and in CI, with any of the eight providers Mockatoo mocks.

Each library has a connector package that swaps its providers for copies
pointed at the mock. Your routes, sign-in calls and session code stay the
same. Pick the section for the library you use.

**Examples on GitHub:** [`mockatoo/examples/authjs-next`](https://github.com/mockatoo/examples/tree/main/authjs-next)
and [`mockatoo/examples/better-auth-next`](https://github.com/mockatoo/examples/tree/main/better-auth-next).
Both run the same Playwright, Cypress and Selenium suites in CI.

## How it works

1. Your sign-in button starts the flow, and the library redirects to the mock
   on the provider's real paths: `accounts.google.com/o/oauth2/v2/auth`
   becomes `app.mockatoo.globalunderdog.com/google/o/oauth2/v2/auth`.
2. You (or a test) fill in the login page and click **Authorize**.
3. The mock redirects back to `/api/auth/callback/<provider>`. The library
   exchanges the code for provider-shaped tokens, checks the ID token or
   reads the profile, and sets its session cookie, as it would in production.

Both libraries use the same callback path, so the route handler doesn't
change. Only the provider list does, and only when the mock is on.

## Prerequisites

- **Node.js 24** and `next` 16, with either `next-auth` 5 and
  `@mockatoo/connect-authjs`
  ([`package.json`](https://github.com/mockatoo/examples/blob/main/authjs-next/package.json)),
  or `better-auth` and `@mockatoo/connect-better-auth`
  ([`package.json`](https://github.com/mockatoo/examples/blob/main/better-auth-next/package.json)).
- **A Mockatoo test account.** Sign up at
  [app.mockatoo.globalunderdog.com](https://app.mockatoo.globalunderdog.com),
  then copy the email and password from the dashboard.

## Point Auth.js at the mock

[`lib/auth.ts`](https://github.com/mockatoo/examples/blob/main/authjs-next/lib/auth.ts)
picks the `Mock*` helpers or the real providers with one switch:

```ts
const useMock =
	process.env.NODE_ENV !== "production" ||
	process.env.MOCKATOO_FORCE === "true";
const options = (index: number) => ({
	authorization: { params: { scope: providers[index].scope } },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
	trustHost: true,
	pages: { signIn: "/", error: "/" },
	providers: useMock
		? [
				MockApple({ ...options(0) }),
				MockGoogle({ ...options(1) }),
				MockGitHub({ ...options(2) }),
				// …the other providers
			]
		: [
				Apple(options(0)),
				Google(options(1)),
				GitHub(options(2)),
				// …the other providers
			],
});
```

- Each helper wraps Auth.js's own provider and fills in the shared client,
  `mockatoo` / `mockatoo-secret`. It accepts any `http(s)` callback, so
  localhost and preview URLs need no provider setup.
- `pages` sends sign-in and errors back to `/`, which shows a message for the
  `?error=` code.
- The example's committed
  [`.env`](https://github.com/mockatoo/examples/blob/main/authjs-next/.env)
  sets `MOCKATOO_FORCE=true` so its live demo runs on the mock. Delete that
  line in your app. Never ship it.

[`app/api/auth/[...nextauth]/route.ts`](https://github.com/mockatoo/examples/blob/main/authjs-next/app/api/auth/%5B...nextauth%5D/route.ts)
is the standard route handler:

```ts
import { handlers } from "../../../../lib/auth";

export const { GET, POST } = handlers;
```

## Sign in with Auth.js

[`app/page.tsx`](https://github.com/mockatoo/examples/blob/main/authjs-next/app/page.tsx)
reads the session in a server component, and each button is a form with a
server action:

```ts
const session = await auth();
// …
<form
	action={async () => {
		"use server";
		await signIn(provider.id, { redirectTo: "/" });
	}}
>
	<Button>
		<ProviderLogo id={provider.id} />
		{`Sign in with ${provider.name}`}
	</Button>
</form>
```

After **Deny**, Auth.js redirects to `/?error=OAuthCallbackError`, and the
page maps that code to "You may have declined the authorization request".

## Point Better Auth at the mock

Better Auth's built-in providers hardcode their endpoints, so
`@mockatoo/connect-better-auth` ships a plugin per provider that replaces the
built-in one with a copy pointed at the mock.
[`lib/auth.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-next/lib/auth.ts):

```ts
export const auth = betterAuth({
	baseURL: { allowedHosts: ["localhost:*", "*.vercel.app"] },
	secret,
	rateLimit: {
		// Allow parallel sign-ins when testing with Mockatoo.
		enabled: useMock ? false : undefined,
		customRules: {
			"/sign-in/social": { window: 10, max: 30 },
		},
	},
	socialProviders: useMock
		? {}
		: {
				google: {
					clientId: process.env.GOOGLE_CLIENT_ID ?? "",
					clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
					accessType: "offline",
				},
				// …the other providers
			},
	plugins: useMock
		? [
				mockApple(),
				mockGoogle(),
				mockGitHub(),
				// …the other providers
			]
		: [],
});
```

- `useMock` is the same switch as in the Auth.js example, with the same
  committed `MOCKATOO_FORCE=true` in
  [`.env`](https://github.com/mockatoo/examples/blob/main/better-auth-next/.env).
- `allowedHosts` lets Better Auth take its callback origin from the request,
  so localhost and Vercel previews work without a URL setting.
- The rate limit is off with the mock, so parallel test workers don't trip
  the `/sign-in/social` limit.

[`app/api/auth/[...all]/route.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-next/app/api/auth/%5B...all%5D/route.ts)
hands each request to Better Auth:

```ts
import { auth } from "../../../../lib/auth";
export const runtime = "nodejs";
export function GET(request: Request) {
	return auth.handler(request);
}
export function POST(request: Request) {
	return auth.handler(request);
}
```

## Sign in with Better Auth

The client call doesn't change with the mock
([`app/sign-in.tsx`](https://github.com/mockatoo/examples/blob/main/better-auth-next/app/sign-in.tsx)):

```ts
const result = await authClient.signIn.social({
	provider,
	callbackURL: "/",
	errorCallbackURL: "/",
});
```

[`app/page.tsx`](https://github.com/mockatoo/examples/blob/main/better-auth-next/app/page.tsx)
reads the session on the server:

```ts
const session = await auth.api.getSession({ headers: await headers() });
```

Failed sign-ins come back as `/?error=<code>`. The example shows a retry
message for `invalid_code`, which Better Auth reports for any failed token
exchange, and a cancel message for `access_denied`.
[Better Auth invalid_code](https://mockatoo.globalunderdog.com/blog/better-auth-invalid-code)
reproduces each cause with an email tag. A [Google `admin_policy_enforced` block](https://mockatoo.globalunderdog.com/blog/google-admin-policy-enforced)
never reaches the callback, so there's no `?error=` to handle.

## Handle provider differences

| Provider | Auth.js | Better Auth |
| --- | --- | --- |
| Discord | `issuer: "https://discord.com"` on both the real and the mock provider: Discord sends `iss` on every sign-in, and Auth.js rejects it otherwise | No extra option in the example |
| GitHub | The `read:user user:email` scope, so a private email is still found ([GitHub email null](https://mockatoo.globalunderdog.com/blog/github-email-null)) | No extra option in the example |
| Microsoft | A `profile` that skips the photo request to `graph.microsoft.com`, which the mock can't serve | `tenantId: "common"` for the real provider. `mockMicrosoft` also takes `tenantId` |
| X | The `users.read tweet.read` scope. X's OAuth 2.0 API has no email, so the session shows the name | The `twitter` provider ID |
| Apple | With the real provider, a signed client secret | Same |

The Auth.js Microsoft options, from
[`lib/auth.ts`](https://github.com/mockatoo/examples/blob/main/authjs-next/lib/auth.ts):

```ts
const microsoftOptions = {
	...options(6),
	profile: (profile: { sub: string; name?: string; email?: string }) => ({
		id: profile.sub,
		name: profile.name,
		email: profile.email,
		image: null,
	}),
};
const microsoft = useMock
	? MockMicrosoftEntraID(microsoftOptions)
	: MicrosoftEntraID(microsoftOptions);
```

See each provider's page, e.g. [Discord](providers/discord.md) or
[Microsoft](providers/microsoft.md), for its flow and known differences.

## Run it

Create `.env.local` with the library's secret, `AUTH_SECRET` for Auth.js or
`BETTER_AUTH_SECRET` for Better Auth, set to the output of
`openssl rand -base64 32`. Then run:

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000, pick a provider and sign in with your dashboard
email and password. To sign in as another user, add a tag to the email, e.g.
`you+alice@example.com` (see [Email tags](email-tags.md)).

## Test with Playwright

To cover failures after setting up sign-in, see [OAuth failure testing](https://mockatoo.globalunderdog.com/learn/oauth-failure-testing).

Both examples' `playwright.config.ts` build and start the production server
([`authjs-next/playwright.config.ts`](https://github.com/mockatoo/examples/blob/main/authjs-next/playwright.config.ts)):

```ts
export default defineConfig({
	testDir: "./tests",
	use: { baseURL: "http://localhost:3000" },
	webServer: {
		command: "pnpm build && pnpm start",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
		timeout: 120000,
	},
});
```

[`tests/sign-in.spec.ts`](https://github.com/mockatoo/examples/blob/main/authjs-next/tests/sign-in.spec.ts)
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

Both examples add one spec per edge-case tag in `tests/tags/`
([Auth.js](https://github.com/mockatoo/examples/tree/main/authjs-next/tests/tags),
[Better Auth](https://github.com/mockatoo/examples/tree/main/better-auth-next/tests/tags)),
such as `you+down@example.com` for a token endpoint outage.

Add `MOCKATOO_TEST_EMAIL` and `MOCKATOO_TEST_PASSWORD` to `.env.local` or the
environment, then run:

```sh
pnpm exec playwright install chromium
pnpm test
```

The [Playwright guide](playwright.md) covers fresh users per test, edge-case
tags and token refresh.
[Microsoft AADSTS50076](https://mockatoo.globalunderdog.com/blog/microsoft-aadsts50076)
shows what both libraries do when a refresh needs MFA.

## Test with Cypress or Selenium

Both examples carry the same sign-in tests for Cypress and Selenium:

| Runner | First-time setup | Run |
| --- | --- | --- |
| Playwright | `pnpm exec playwright install chromium` | `pnpm test` |
| Cypress | `pnpm exec cypress install` | `pnpm test:cypress` |
| Selenium | Install Google Chrome. Selenium Manager resolves ChromeDriver. | `pnpm test:selenium` |

Cypress runs each app behind a local HTTPS proxy on port 3443. Better Auth's
OAuth state cookie is Secure in production builds, and Cypress's cookie jar
drops Secure cookies on plain HTTP requests. The Auth.js
example also sets `AUTH_URL=https://localhost:3443` in its `test:cypress`
script, so Auth.js sends the same callback URL in the authorization request
and the token exchange. See the [Cypress](cypress.md) and
[Selenium](selenium.md) guides.

## Run in CI

The [workflow](https://github.com/mockatoo/examples/blob/main/.github/workflows/nextjs.yml)
runs both examples with all three runners, generating each library's secret
per job:

```yaml
strategy:
  fail-fast: false
  matrix:
    example: [better-auth-next, authjs-next]
    runner: [playwright, cypress, selenium]
    include:
      - example: better-auth-next
        secret_name: BETTER_AUTH_SECRET
      - example: authjs-next
        secret_name: AUTH_SECRET
      # …the script for each runner
steps:
  # …checkout, pnpm, Node.js 24 and install
  - name: Generate runtime secret
    run: echo "${{ matrix.secret_name }}=$(openssl rand -base64 32)" >> "$GITHUB_ENV"
  - run: pnpm --dir ${{ matrix.example }} ${{ matrix.script }}
    env:
      MOCKATOO_TEST_EMAIL: ${{ secrets.MOCKATOO_TEST_EMAIL }}
      MOCKATOO_TEST_PASSWORD: ${{ secrets.MOCKATOO_TEST_PASSWORD }}
```

More in [Run in CI](ci.md).

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `AUTH_SECRET is required. Set it in .env.local or your deployment environment.` | Add a random secret to `.env.local`, or to the deployment's environment |
| `BETTER_AUTH_SECRET is required. Set it in .env.local or your deployment environment.` | Same, with Better Auth's variable |
| The real provider's login page opens | The mock isn't on: run `pnpm dev`, or keep `MOCKATOO_FORCE=true` in `.env` for production builds |
| `Set MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD in .env.local or the environment.` | Copy the test account's email and password from the dashboard |
| Cypress or Selenium can't start the server | Stop `pnpm dev` first: each runner starts its own production build on port 3000 |
| Login fails after a password change | Copy the new password from the dashboard into `.env.local` and your secrets |

## Next steps

- [All examples](https://github.com/mockatoo/examples): Auth.js, Better Auth, SvelteKit, Nuxt, Hono, Django, Flask, Laravel and Spring Boot
- [Playwright](playwright.md) · [Cypress](cypress.md) · [Selenium](selenium.md) · [Nuxt](nuxt.md) · [Email tags](email-tags.md) · [Run in CI](ci.md)
- [Better Auth invalid_code](https://mockatoo.globalunderdog.com/blog/better-auth-invalid-code): reproduce a failed token exchange with an email tag
- Use Mockatoo only outside production, and never commit its credentials.
