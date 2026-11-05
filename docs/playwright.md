# Playwright

Backing Test: [`better-auth-next/tests/sign-in.spec.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-next/tests/sign-in.spec.ts)

## Prerequisites

Start your app and create a Mockatoo test account. Put the test credentials in
`.env.local`:

```sh
MOCK_EMAIL=<your Mockatoo test email>
MOCK_PASSWORD=<your Mockatoo test password>
```

Install Playwright's Chromium browser with `pnpm exec playwright install
chromium`.

## Sign in

After your app opens the provider's sign-in page, use the stable Mockatoo
selectors to complete the password login and authorize the request:

```ts
await page.locator("#email").fill(email as string);
await page.locator("#password").fill(password as string);
await page.getByRole("button", { name: "Log in with password" }).click();
await page.getByRole("button", { name: "Authorize" }).click();
await expect(
	page.getByRole("heading", { name: "Your session" }),
).toBeVisible();
```

The snippet is copied from the [backing test](https://github.com/mockatoo/examples/blob/main/better-auth-next/tests/sign-in.spec.ts).

## Distinct users per test

Give each test a distinct tagged address, such as
`you+playwright-1@example.com`. Tagged addresses use the password for the base
address and represent separate users. See [Email tags](email-tags.md) for the
other available tags.

## Full example

The [full Playwright example](https://github.com/mockatoo/examples/blob/main/better-auth-next/tests/sign-in.spec.ts)
starts the app, signs in with each provider, and checks the resulting session.
