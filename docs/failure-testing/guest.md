---
description: "Test how your app handles an invited Microsoft guest: you+guest@example.com signs in with tid naming your tenant and idp naming their home tenant."
datePublished: 2026-11-20
lastModified: 2026-11-24
---

# Microsoft guest account

Check how your app handles an invited Microsoft guest. Sign in as `you+guest@example.com` to exercise this provider behavior.

Use your own Mockatoo address with guest and your usual password. Combine tags with a dot, for example `you+guest.unverified@example.com`; see [Email tags](../email-tags.md).

See [OAuth failure testing](https://mockatoo.globalunderdog.com/learn/oauth-failure-testing) for the four steps where sign-in fails and how to test each one.

## What each provider returns

The account is a guest in the app tenant, with a separate home identity provider.

<TagProviders tag="guest" />

<TagSpokes tag="guest" />

## Test it with Playwright

This test signs in with Microsoft as `you+guest@example.com` and checks that sign-in completes. It reads MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD from the environment.

[`guest.spec.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-next/tests/tags/guest.spec.ts)

```ts
import { expect, test } from "@playwright/test";

const email = process.env.MOCKATOO_TEST_EMAIL ?? "";
const password = process.env.MOCKATOO_TEST_PASSWORD ?? "";

test("+guest: accepts a Microsoft guest", async ({ page }) => {
	const address = email.replace("@", `+e2e-${crypto.randomUUID()}.guest@`);
	// This app uses the common tenant. It accepts guests without requiring
	// membership in a particular organization's tenant.
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
