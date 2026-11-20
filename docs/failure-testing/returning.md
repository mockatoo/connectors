---
description: "Test returning user with you+returning@example.com in Playwright."
title: "Test Returning provider account · Mockatoo"
---

# Returning provider account

Check repeat sign-in behavior and refresh token handling. Sign in as `you+returning@example.com` to exercise this provider behavior.

Use your own Mockatoo address with returning and your usual password. Combine tags with a dot, for example `you+returning.unverified@example.com`; see [Email tags](../email-tags.md).

## What each provider returns

Google may omit the refresh token on repeat authorization unless the app sends prompt=consent.

<TagProviders tag="returning" />

## Test it with Playwright

This test signs in with Apple as `you+returning@example.com` and checks that sign-in completes. It reads MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD from the environment.

```ts
import { expect, test } from "@playwright/test";

const email = process.env.MOCKATOO_TEST_EMAIL ?? "";
const password = process.env.MOCKATOO_TEST_PASSWORD ?? "";

test("+returning: signs in an Apple user without a first-time name", async ({
	page,
}) => {
	const address = email.replace("@", `+e2e-${crypto.randomUUID()}.returning@`);
	const originalAddress = address.replace(".returning@", "@");
	// Apple sends the name only on first consent. A returning user keeps their
	// original email. Start with a fresh app account so no saved name can hide
	// the missing name in this sign-in.
	await page.goto("/");
	await page.getByRole("button", { name: "Sign in with Apple" }).click();
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
		email: originalAddress,
		name: "",
	});
});
```

It runs in CI as [tests/tags/returning.spec.ts](https://github.com/mockatoo/examples/blob/main/better-auth-next/tests/tags/returning.spec.ts) in the Better Auth + Next.js example.
