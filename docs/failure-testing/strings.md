---
description: "Test string boolean claims with you+strings@example.com in Playwright."
title: "Test Apple boolean claims as strings · Mockatoo"
---

# Apple boolean claims as strings

Check how your app parses Apple boolean-like claims. Sign in as `you+strings@example.com` to exercise this provider behavior.

Use your own Mockatoo address with strings and your usual password. Combine tags with a dot, for example `you+strings.unverified@example.com`; see [Email tags](../email-tags.md).

## What each provider returns

Apple returns email_verified and is_private_email as the strings true and false.

<TagProviders tag="strings" />

## Test it with Playwright

This test signs in with Apple as `you+strings@example.com` and checks that sign-in completes. It reads MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD from the environment.

```ts
import { expect, test } from "@playwright/test";

const email = process.env.MOCKATOO_TEST_EMAIL ?? "";
const password = process.env.MOCKATOO_TEST_PASSWORD ?? "";

test("+strings: normalizes Apple's string verification flag", async ({
	page,
}) => {
	const address = email.replace("@", `+e2e-${crypto.randomUUID()}.strings@`);
	// Apple's string-valued claims still become a boolean in the app's session.
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
		email: address,
		emailVerified: true,
	});
});
```

It runs in CI as [tests/tags/strings.spec.ts](https://github.com/mockatoo/examples/blob/main/better-auth-next/tests/tags/strings.spec.ts) in the Better Auth + Next.js example.
