---
description: "Test changed email with you+renamed@example.com in Playwright."
title: "Test Changed provider email · Mockatoo"
---

# Changed provider email

Check account linking after a user changes their provider email. The provider returns the same user ID with a different email. Sign in as `you+renamed@example.com` and check how your app handles the returned profile.

Use your own Mockatoo address with renamed and your usual password. Combine tags with a dot, for example `you+renamed.unverified@example.com`; see [Email tags](../email-tags.md).

## What each provider returns

The provider returns the same user ID with a different email.

<TagProviders tag="renamed" />

## Test it with Playwright

This test signs in with Google as `you+renamed.unverified@example.com` and checks that your app completes sign in. It reads MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD from the environment.

```ts
import { expect, test } from "@playwright/test";

const email = process.env.MOCKATOO_TEST_EMAIL ?? "";
const password = process.env.MOCKATOO_TEST_PASSWORD ?? "";

test("+renamed: displays the user's changed email", async ({ page }) => {
	const address = email.replace("@", `+e2e-${crypto.randomUUID()}.renamed@`);
	const originalAddress = address.replace(".renamed@", "@");
	// Start with the changed address so a previously saved profile cannot hide it.
	// Signing in again without +renamed must reach the same app account.
	await page.goto("/");
	await page.getByRole("button", { name: "Sign in with Google" }).click();
	await page.getByLabel("Email", { exact: true }).fill(address);
	await page.getByLabel("Password", { exact: true }).fill(password);
	await page.getByRole("button", { name: "Log in with password" }).click();
	await page.getByRole("button", { name: "Authorize" }).click();
	await expect(page.getByRole("heading", { name: "Your session" })).toBeVisible(
		{ timeout: 15_000 },
	);
	const renamed = JSON.parse(
		(await page.locator("pre code").textContent()) ?? "",
	).user;
	expect(renamed.email).toBe(address);
	await page.getByRole("button", { name: "Sign out" }).click();
	await expect(
		page.getByRole("button", { name: "Sign in with Google" }),
	).toBeVisible();
	await page.goto("/");
	await page.getByRole("button", { name: "Sign in with Google" }).click();
	await page.getByLabel("Email", { exact: true }).fill(originalAddress);
	await page.getByLabel("Password", { exact: true }).fill(password);
	await page.getByRole("button", { name: "Log in with password" }).click();
	await page.getByRole("button", { name: "Authorize" }).click();
	await expect(page.getByRole("heading", { name: "Your session" })).toBeVisible(
		{ timeout: 15_000 },
	);
	expect(
		JSON.parse((await page.locator("pre code").textContent()) ?? "").user.id,
	).toBe(renamed.id);
});
```

It runs in CI as [tests/tags/renamed.spec.ts](https://github.com/mockatoo/examples/blob/main/better-auth-next/tests/tags/renamed.spec.ts) in the Better Auth + Next.js example.
