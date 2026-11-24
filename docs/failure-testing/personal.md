---
description: "Test personal Microsoft accounts: you+personal@example.com signs in with the consumer tenant ID, which an organizations or single-tenant app refuses."
lastModified: 2026-11-20
---

# Personal Microsoft account

Check how your app handles personal Microsoft accounts. Sign in as `you+personal@example.com` to exercise this provider behavior.

Use your own Mockatoo address with personal and your usual password. Combine tags with a dot, for example `you+personal.unverified@example.com`; see [Email tags](../email-tags.md).

See [OAuth failure testing](https://mockatoo.globalunderdog.com/learn/oauth-failure-testing) for the four steps where sign-in fails and how to test each one.

## What each provider returns

The account is personal. An organization-only tenant refuses it unless it is also tagged guest.

<TagProviders tag="personal" />

<TagSpokes tag="personal" />

## Test it with Playwright

This test signs in with Microsoft as `you+personal@example.com` and checks that sign-in completes. It reads MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD from the environment.

[`personal.spec.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-next/tests/tags/personal.spec.ts)

```ts
import { expect, test } from "@playwright/test";

const email = process.env.MOCKATOO_TEST_EMAIL ?? "";
const password = process.env.MOCKATOO_TEST_PASSWORD ?? "";

test("+personal: accepts a personal Microsoft account", async ({ page }) => {
	const address = email.replace("@", `+e2e-${crypto.randomUUID()}.personal@`);
	// The common tenant accepts personal accounts as well as work accounts.
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
});
```
