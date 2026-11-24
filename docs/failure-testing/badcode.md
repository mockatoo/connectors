---
description: "Test how your app handles a rejected OAuth authorization code (invalid_grant) in Playwright by signing in as you+badcode@example.com with Mockatoo."
lastModified: 2026-11-24
---

# Rejected authorization code

Sign in as `you+badcode@example.com` and the provider rejects the authorization
code when your server exchanges it for tokens. Login and consent work as usual,
so the failure happens in your callback route, the same place it happens in
production. Use it to check that your app shows a retry instead of a 500.

Use your own Mockatoo address with `+badcode` and your usual password. You can
combine tags, as in `you+badcode.unverified@example.com`. See
[Email tags](../email-tags.md).

See [OAuth failure testing](https://mockatoo.globalunderdog.com/learn/oauth-failure-testing) for the four steps where sign-in fails and how to test each one.

## What each provider returns

Every provider rejects the code with its own error:

<TagProviders tag="badcode" />

## When it happens in production

A code is rejected in production when it was already used, for example after
the user reloaded the callback page, or when it expired.

<TagSpokes tag="badcode" />

## Test it with Playwright

This test signs in with Google as `you+badcode@example.com` and checks that the
app shows a retry message. It reads your test account from the
`MOCKATOO_TEST_EMAIL` and `MOCKATOO_TEST_PASSWORD` environment variables. Change
the button name and the message to match your app.

[`badcode.spec.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-next/tests/tags/badcode.spec.ts)

```ts
import { expect, test } from "@playwright/test";

const email = process.env.MOCKATOO_TEST_EMAIL ?? "";
const password = process.env.MOCKATOO_TEST_PASSWORD ?? "";

test("+badcode: tells the user to retry when sign-in cannot finish", async ({
	page,
}) => {
	const address = email.replace("@", `+e2e-${crypto.randomUUID()}.badcode@`);
	// Better Auth reports a rejected authorization code as invalid_code.
	// The app shows a retry message and leaves the user signed out.
	await page.goto("/");
	await page.getByRole("button", { name: "Sign in with Google" }).click();
	await page.getByLabel("Email", { exact: true }).fill(address);
	await page.getByLabel("Password", { exact: true }).fill(password);
	await page.getByRole("button", { name: "Log in with password" }).click();
	await page.getByRole("button", { name: "Authorize" }).click();
	await expect(page).toHaveURL(
		(url) =>
			url.pathname === "/" && url.searchParams.get("error") === "invalid_code",
	);
	await expect(
		page.getByRole("alert").filter({
			hasText: "Sign-in failed before it finished. Try again in a minute.",
		}),
	).toHaveText("Sign-in failed before it finished. Try again in a minute.");
	await expect(
		page.getByRole("button", { name: "Sign in with Google" }),
	).toBeVisible();
	await expect(page.getByText("You are logged in")).toBeHidden();
});
```
