---
description: "Test Workspace domain claim with you+hd@example.com in Playwright."
title: "Test Google Workspace account · Mockatoo"
---

# Google Workspace account

Check your domain restrictions against a Google Workspace account. Workspace account with the hd domain claim. Sign in as `you+hd@example.com` and check how your app handles the returned profile.

Use your own Mockatoo address with hd and your usual password. Combine tags with a dot, for example `you+hd.unverified@example.com`; see [Email tags](../email-tags.md).

## What each provider returns

Workspace account with the hd domain claim.

<TagProviders tag="hd" />

## Test it with Playwright

This test signs in with Google as `you+hd.unverified@example.com` and checks that sign-in completes. It reads MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD from the environment.

```ts
import { expect, test } from "@playwright/test";

const email = process.env.MOCKATOO_TEST_EMAIL ?? "";
const password = process.env.MOCKATOO_TEST_PASSWORD ?? "";

test("+hd: signs in a Google Workspace user", async ({ page }) => {
	const address = email.replace("@", `+e2e-${crypto.randomUUID()}.hd@`);
	// Workspace membership does not restrict this app; it accepts the user's email.
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
		emailVerified: true,
	});
});
```

It runs in CI as [tests/tags/hd.spec.ts](https://github.com/mockatoo/examples/blob/main/better-auth-next/tests/tags/hd.spec.ts) in the Better Auth + Next.js example.
