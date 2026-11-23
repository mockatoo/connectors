---
description: "Test that your app keeps the email verification status: you+unverified@example.com reports the email as unverified for Google, GitHub, Discord and LinkedIn."
---

# Unverified email address

Check that your app preserves the provider verification status. Email is reported as unverified. Sign in as `you+unverified@example.com` and check how your app handles the returned profile.

Use your own Mockatoo address with unverified and your usual password. Combine tags with a dot, for example `you+unverified.noname@example.com`; see [Email tags](../email-tags.md).

See [OAuth failure testing](https://mockatoo.globalunderdog.com/learn/oauth-failure-testing) for the four steps where sign-in fails and how to test each one.

## What each provider returns

Email is reported as unverified.

<TagProviders tag="unverified" />

<TagSpokes tag="unverified" />

## Test it with Playwright

This test signs in with Google as `you+unverified.unverified@example.com` and checks that your app completes sign in. It reads MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD from the environment.

[`unverified.spec.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-next/tests/tags/unverified.spec.ts)

```ts
import { expect, test } from "@playwright/test";

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
