---
description: "Test Google, GitHub, Apple and other OAuth sign-in with Cypress: cy.origin, cached sessions, all 8 providers, email tags and edge cases, locally and in CI."
---

# Cypress

Sign in through OAuth from a Cypress test, locally and in CI, with any of the
eight providers Mockatoo mocks.

**Example on GitHub:** [`mockatoo/examples/better-auth-next`](https://github.com/mockatoo/examples/tree/main/better-auth-next).

## Why real providers break Cypress tests

| With the real provider | With Mockatoo |
| --- | --- |
| Bot checks, CAPTCHAs and MFA block headless browsers | No bot checks, and the form labels never change |
| A developer app, client secret and redirect URI for every environment and preview URL | One shared client (`mockatoo` / `mockatoo-secret`) that accepts any `http(s)` callback |
| Rate limits on repeated logins | Bursts of sign-ins are allowed |
| A real account whose password you can't share | A generated password that's safe to give to CI and agents |

Cypress isn't the problem. The live provider login is.

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

- **Cypress 16 or later.** `cy.origin` exists since Cypress 12, but `cy.env`
  needs 16.
- **An app wired to Mockatoo** behind a non-production check. Run
  `npx -y @mockatoo/mockatoo@latest init`, or see the
  [Better Auth example](https://github.com/mockatoo/examples/tree/main/better-auth-next/).
- **A Mockatoo test account.** Sign up at
  [app.mockatoo.globalunderdog.com](https://app.mockatoo.globalunderdog.com),
  then copy the email and password from the dashboard.
- **The credentials in the environment**:

```sh
MOCKATOO_TEST_EMAIL=<your Mockatoo test email>
MOCKATOO_TEST_PASSWORD=<your Mockatoo test password>
```

## Configure Cypress

[`cypress.config.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-next/cypress.config.ts):

```ts
import { MOCKATOO_URL } from "@mockatoo/connect-better-auth";
import nextEnv from "@next/env";
import { defineConfig } from "cypress";

nextEnv.loadEnvConfig(process.cwd());

export default defineConfig({
	defaultCommandTimeout: 10000,
	expose: { mockatooUrl: MOCKATOO_URL },
	env: {
		MOCKATOO_TEST_EMAIL: process.env.MOCKATOO_TEST_EMAIL,
		MOCKATOO_TEST_PASSWORD: process.env.MOCKATOO_TEST_PASSWORD,
	},
	e2e: {
		baseUrl: "https://localhost:3443",
		supportFile: "cypress/support/e2e.ts",
	},
});
```

- `baseUrl` is HTTPS on purpose. See [Serve the app over HTTPS](#serve-the-app-over-https).

## Sign in with `cy.origin`

The login page is on a different origin from your app, so its commands run
inside `cy.origin`. Values reach that callback only through `args`.
The Cypress config imports `MOCKATOO_URL` from the app’s connector and exposes the public URL to the browser tests. The Auth.js example uses `@mockatoo/connect-authjs` in its config.

[`sign-in.cy.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-next/cypress/e2e/sign-in.cy.ts):

```ts
const mockatooUrl: string = Cypress.expose("mockatooUrl");

type Credentials = { MOCKATOO_TEST_EMAIL?: string; MOCKATOO_TEST_PASSWORD?: string };
const credentialKeys = ["MOCKATOO_TEST_EMAIL", "MOCKATOO_TEST_PASSWORD"];

beforeEach(() => {
	cy.env<Credentials>(credentialKeys).then(({ MOCKATOO_TEST_EMAIL, MOCKATOO_TEST_PASSWORD }) => {
		if (!MOCKATOO_TEST_EMAIL || !MOCKATOO_TEST_PASSWORD)
			throw new Error("Set MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD in .env.local or the environment.");
	});
});

it("signs in with Google", () => {
	cy.visit("/");
	cy.contains("button", "Sign in with Google").click();
	cy.env<Credentials>(credentialKeys).then(({ MOCKATOO_TEST_EMAIL, MOCKATOO_TEST_PASSWORD }) => {
		const email = MOCKATOO_TEST_EMAIL as string;
		const password = MOCKATOO_TEST_PASSWORD as string;
		cy.origin(
			mockatooUrl,
			{ args: { email, password } },
			({ email, password }) => {
				cy.get("#email").type(email, { log: false, parseSpecialCharSequences: false });
				cy.get("#password").type(password, { log: false, parseSpecialCharSequences: false });
				cy.contains("button", "Log in with password").click();
				cy.contains("button", "Authorize").click();
			},
		);
	});
	cy.contains("h1", "Your session").should("be.visible");
});
```

The login and consent pages are the same for every provider:

| Element | Selector |
| --- | --- |
| Email field | `#email` (label **Email**) |
| Password field | `#password` (label **Password**) |
| Submit login | **Log in with password** |
| Consent | **Authorize** or **Deny** |

- `{ log: false }` keeps the password out of the command log, screenshots and videos.

## Reuse it: `cy.mockatooSignIn()`

Move the flow into a custom command, so each spec needs one line.
[`support/commands.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-next/cypress/support/commands.ts):

```ts
const mockatooUrl: string = Cypress.expose("mockatooUrl");

Cypress.Commands.add(
	"mockatooSignIn",
	(provider: Provider, { tag, consent = "Authorize" }: SignInOptions = {}) =>
		cy
			.env<Credentials>(credentialKeys)
			.then(
				({ MOCKATOO_TEST_EMAIL: email, MOCKATOO_TEST_PASSWORD: password }) => {
					if (!email || !password)
						throw new Error(
							"Set MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD in .env.local or the environment.",
						);
					const address = tag ? email.replace("@", `+${tag}@`) : email;
					cy.visit("/");
					cy.contains("button", `Sign in with ${provider}`).click();
					cy.origin(
						mockatooUrl,
						{ args: { address, password, consent } },
						({ address, password, consent }) => {
							cy.get("#email").type(address, { log: false, parseSpecialCharSequences: false });
							cy.get("#password").type(password, { log: false, parseSpecialCharSequences: false });
							cy.contains("button", "Log in with password").click();
							cy.contains("button", consent).click();
						},
					);
					return cy.wrap(address, { log: false });
				},
			),
);
```

- `tag` signs in as a separate user (see [Separate users with email tags](#separate-users-with-email-tags)).
- `consent` picks **Authorize** or **Deny**.
- The command yields the address it used, so tests can assert on it.
- The file also declares the command's types and a `cy.sessionUser()` helper
  that reads the session the example app displays.

## Sign in once with `cy.session`

`cy.session` caches the cookies after the first sign-in and restores them
before each later test, so a suite signs in once per user instead of once per test.
[`session.cy.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-next/cypress/e2e/session.cy.ts):

```ts
// Signs in once, then restores the cached cookies before each later test.
beforeEach(() => {
	cy.mockatooSession("Google", "cypress-session");
});

it("starts signed in", () => {
	cy.visit("/");
	cy.contains("h1", "Your session").should("be.visible");
});
```

`cy.mockatooSession()` wraps `cy.mockatooSignIn()` in `cy.session` and
validates the cached session with your app's session endpoint:

```ts
Cypress.Commands.add("mockatooSession", (provider: Provider, tag?: string) => {
	cy.session(
		[provider, tag],
		() => {
			cy.mockatooSignIn(provider, { tag });
			cy.contains("h1", "Your session").should("be.visible");
		},
		{
			validate() {
				cy.request("/api/auth/get-session").its("body").should("not.be.null");
			},
		},
	);
});
```

`/api/auth/get-session` is Better Auth's session endpoint. Use your framework's
own (Auth.js uses `/api/auth/session`).

## Test every provider with one loop

The labels don't change between providers, so only the button text does.
[`all-providers.cy.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-next/cypress/e2e/all-providers.cy.ts):

```ts
const providers: Provider[] = [
	"Apple",
	"Google",
	"GitHub",
	"Discord",
	"Facebook",
	"LinkedIn",
	"Microsoft",
	"X",
];

// Every provider shows the same login and consent pages, so one command signs in with all of them.
for (const provider of providers) {
	it(`signs in with ${provider}`, () => {
		cy.mockatooSignIn(provider);
		cy.contains("h1", "Your session").should("be.visible");
	});
}
```

## Separate users with email tags

The email address is the only test state. `you+cypress-1@example.com` is a
separate, stable user with the same password, so there's nothing to seed or clean up.

```ts
it("signs in as a tagged address", () => {
	cy.mockatooSignIn("Google", { tag: "cypress-1" }).then((address) => {
		cy.sessionUser().its("email").should("equal", address);
	});
});
```

- Use one tag per spec, or per machine when you run Cypress in parallel.
- See [Email tags](email-tags.md) for how tagged addresses work.

## Test edge cases

[OAuth failure testing](https://mockatoo.globalunderdog.com/learn/oauth-failure-testing) explains which sign-in failures to test and what your app should do for each.

Special tags change what the provider does. Combine them with dots, e.g.
`you+2.unverified@example.com`.
[`edge-cases.cy.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-next/cypress/e2e/edge-cases.cy.ts):

```ts
it("+unverified: keeps an unverified email unverified", () => {
	cy.mockatooSignIn("Google", { tag: "unverified" }).then((address) => {
		cy.sessionUser().should("include", {
			email: address,
			emailVerified: false,
		});
	});
});

it("+down: shows a retry message when the token endpoint is down", () => {
	cy.mockatooSignIn("Google", { tag: "down" });
	cy.location("search").should("contain", "error=invalid_code");
	cy.contains(
		"[role=alert]",
		"Sign-in failed before it finished. Try again in a minute.",
	);
});
```

Clicking **Deny** returns `access_denied` with the original `state`, as the real providers do:

```ts
it("Deny: returns access_denied to the app", () => {
	cy.mockatooSignIn("Google", { consent: "Deny" });
	cy.location("search").should("contain", "error=access_denied");
	cy.contains("[role=alert]", "Sign-in failed because you cancelled it.");
});
```

Some other tags to try:

| Tag | Tests |
| --- | --- |
| `+returning` | A returning user, e.g. Apple's missing name after the first consent |
| `+revoked` | A refresh token that the provider rejects as revoked |
| `+slow` | A slow token endpoint, to check your timeouts and loading states |
| `+hd` | A Google Workspace account (`hd` claim) |

Each provider supports its own tags. See its page, e.g.
[Google](providers/google.md), for the full list.

## Serve the app over HTTPS

When your app runs a production build, Better Auth marks its OAuth state
cookie `Secure`. Cypress's cookie jar drops `Secure` cookies on plain-HTTP
origins, even `localhost`, so the callback loses the state cookie and sign-in fails
with `state_mismatch`.

Fix: put a local HTTPS proxy in front of the app. The example's
[`package.json`](https://github.com/mockatoo/examples/blob/main/better-auth-next/package.json)
builds and starts the app, proxies `https://localhost:3443` to it with
[`local-ssl-proxy`](https://www.npmjs.com/package/local-ssl-proxy), and runs Cypress:

```sh
START_SERVER_AND_TEST_INSECURE=1 start-server-and-test \
  'pnpm build && PORT=3000 pnpm start' http://localhost:3000 \
  'local-ssl-proxy --source 3443 --target 3000' https://localhost:3443 \
  'cypress run'
```

Details: [Why Cypress needs HTTPS](https://github.com/mockatoo/examples/blob/main/better-auth-next/README.md#why-cypress-needs-https).

## Run in CI

Store the dashboard credentials as `MOCKATOO_TEST_EMAIL` and
`MOCKATOO_TEST_PASSWORD` secrets. Cypress reads them through the example’s config.
From the examples'
[Cypress workflow](https://github.com/mockatoo/examples/blob/main/.github/workflows/nextjs.yml):

```yaml
- run: pnpm --dir better-auth-next exec cypress install
- run: pnpm --dir better-auth-next test:cypress
  env:
    MOCKATOO_TEST_EMAIL: ${{ secrets.MOCKATOO_TEST_EMAIL }}
    MOCKATOO_TEST_PASSWORD: ${{ secrets.MOCKATOO_TEST_PASSWORD }}
```

- Regenerating the password on the dashboard ends other password sessions.
  Update the secrets right after.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `state_mismatch`, `auth state cookie not found` | Serve the app over HTTPS ([above](#serve-the-app-over-https)) |
| `Set MOCKATOO_TEST_EMAIL and …` | Set both variables in `.env.local`, your shell, or the CI test step |
| `cy.origin` times out on the login page | Make sure the url matches the origin your app redirects to |
| A test times out with `+slow` | Raise `defaultCommandTimeout` for that test |
| Login fails after a password change | Copy the new password from the dashboard into your env and secrets |

## Next steps

- [All examples](https://github.com/mockatoo/examples): Auth.js, Better Auth, SvelteKit, Nuxt and Hono, each with a Playwright suite
- [Playwright](playwright.md) · [Selenium](selenium.md) · [Email tags](email-tags.md) · [Account flow](account-flow.md) · [Run in CI](ci.md)
- Use Mockatoo only outside production, and never commit its credentials.
