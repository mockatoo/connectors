---
description: "Sign in with Google and other OAuth providers from a Cypress test, using cy.origin and Mockatoo's stable login selectors."
---

# Cypress

Backing Test: [`cypress/cypress/e2e/sign-in.cy.ts`](https://github.com/mockatoo/examples/blob/main/cypress/cypress/e2e/sign-in.cy.ts)

## Prerequisites

Start with the [Better Auth + Next.js example](https://github.com/mockatoo/examples/tree/main/better-auth-next/), then set the Mockatoo test credentials in the environment:

```sh
CYPRESS_MOCKATOO_TEST_EMAIL=<your Mockatoo test email>
CYPRESS_MOCKATOO_TEST_PASSWORD=<your Mockatoo test password>
```

This guide uses Cypress 16 or later. `cy.origin` is supported since Cypress
12, while `cy.env` and `Cypress.expose` require Cypress 16. `cy.origin` is
required because the Mockatoo login page has a different origin from the app
under test.

## Sign in with `cy.origin`

Use the stable selectors inside `cy.origin`, passing the credentials through
`args`:

```ts
type Credentials = { MOCKATOO_TEST_EMAIL?: string; MOCKATOO_TEST_PASSWORD?: string };
const credentialKeys = ["MOCKATOO_TEST_EMAIL", "MOCKATOO_TEST_PASSWORD"];

beforeEach(() => {
	cy.env<Credentials>(credentialKeys).then(({ MOCKATOO_TEST_EMAIL, MOCKATOO_TEST_PASSWORD }) => {
		if (!MOCKATOO_TEST_EMAIL || !MOCKATOO_TEST_PASSWORD)
			throw new Error("Set CYPRESS_MOCKATOO_TEST_EMAIL and CYPRESS_MOCKATOO_TEST_PASSWORD.");
	});
});

it("signs in with Google", () => {
	cy.visit("/");
	cy.contains("button", "Sign in with Google").click();
	cy.env<Credentials>(credentialKeys).then(({ MOCKATOO_TEST_EMAIL, MOCKATOO_TEST_PASSWORD }) => {
		const email = MOCKATOO_TEST_EMAIL as string;
		const password = MOCKATOO_TEST_PASSWORD as string;
		cy.origin(
			Cypress.expose("MOCKATOO_URL"),
			{ args: { email, password } },
			({ email, password }) => {
				cy.get("#email").type(email);
				cy.get("#password").type(`${password}{enter}`, { log: false });
				cy.contains("button", "Authorize").click();
			},
		);
	});
	cy.contains("h1", "Your session").should("be.visible");
});
```

The snippet is copied from the [backing test](https://github.com/mockatoo/examples/blob/main/cypress/cypress/e2e/sign-in.cy.ts).

## Distinct users per test

Give each test a distinct tagged address, such as
`you+cypress-1@example.com`. Tagged addresses use the password for the base
address and represent separate users. See [Email tags](email-tags.md) for
available tags.

## Full example

See the [full Cypress example](https://github.com/mockatoo/examples/blob/main/cypress/cypress/e2e/sign-in.cy.ts)
for the test and the [Cypress example README](https://github.com/mockatoo/examples/tree/main/cypress)
for setup and configuration.

## Serve the app over HTTPS in production mode

When your app runs a production build, Better Auth marks its OAuth state cookie `Secure`. Cypress's cookie jar drops `Secure` cookies from plain-HTTP origins, so a callback to `http://localhost` loses the state cookie and sign-in fails with `state_mismatch`. Serve the app over HTTPS — the example proxies `https://localhost:3443` to the app's HTTP port with [`local-ssl-proxy`](https://www.npmjs.com/package/local-ssl-proxy) — and both Chromium and Cypress's cookie jar carry the state cookie through the redirect. See [Why Cypress needs HTTPS](https://github.com/mockatoo/examples/blob/main/cypress/README.md#why-cypress-needs-https) in the example README.
