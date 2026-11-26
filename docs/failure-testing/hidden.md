---
description: "Test Sign in with Apple's Hide My Email: you+hidden@example.com returns a stable @privaterelay.appleid.com address with is_private_email set to true."
datePublished: 2026-11-20
lastModified: 2026-11-26
tested:
  better-auth-next: [better-auth@1.7.25, next@16.4.6, "@playwright/test@1.64.1"]
---

# Apple private relay address

Check that your app accepts Apple relay addresses. Apple returns a stable private relay address. Sign in as `you+hidden@example.com` and check how your app handles the returned profile.

Use your own Mockatoo address with hidden and your usual password. Combine tags with a dot, for example `you+hidden.unverified@example.com`; see [Email tags](../email-tags.md).

See [OAuth failure testing](https://mockatoo.globalunderdog.com/learn/oauth-failure-testing) for the four steps where sign-in fails and how to test each one.

## What each provider returns

Apple returns a stable private relay address.

<TagProviders tag="hidden" />

<TagSpokes tag="hidden" />

## Test it with Playwright

This test signs in with Apple as `you+hidden.unverified@example.com` and checks that your app completes sign in. It reads MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD from the environment.

[`hidden.spec.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-next/tests/tags/hidden.spec.ts)

```ts
import { expect, test } from "@playwright/test";

const email = process.env.MOCKATOO_TEST_EMAIL ?? "";
const password = process.env.MOCKATOO_TEST_PASSWORD ?? "";

test("+hidden: accepts Apple's stable private relay address", async ({
	page,
}) => {
	const address = email.replace("@", `+e2e-${crypto.randomUUID()}.hidden@`);
	// Hide My Email gives the app a relay address instead of the user's real one.
	await page.goto("/");
	await page.getByRole("button", { name: "Sign in with Apple" }).click();
	await page.getByLabel("Email", { exact: true }).fill(address);
	await page.getByLabel("Password", { exact: true }).fill(password);
	await page.getByRole("button", { name: "Log in with password" }).click();
	await page.getByRole("button", { name: "Authorize" }).click();
	await expect(page.getByRole("heading", { name: "Your session" })).toBeVisible(
		{ timeout: 15_000 },
	);
	const user = JSON.parse(
		(await page.locator("pre code").textContent()) ?? "",
	).user;
	expect(user.email).toMatch(/@privaterelay\.appleid\.com$/);
	expect(user.emailVerified).toBe(true);
	await page.getByRole("button", { name: "Sign out" }).click();
	await expect(
		page.getByRole("button", { name: "Sign in with Apple" }),
	).toBeVisible();
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
		JSON.parse((await page.locator("pre code").textContent()) ?? "").user.email,
	).toBe(user.email);
});
```
