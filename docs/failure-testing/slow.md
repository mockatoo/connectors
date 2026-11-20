---
description: "Test OAuth timeout with you+slow@example.com in Playwright."
---

# Slow token endpoint

Check whether your callback and test timeouts allow for a delayed response. Sign in as `you+slow@example.com` to exercise this provider behavior.

Use your own Mockatoo address with slow and your usual password. Combine tags with a dot, for example `you+slow.unverified@example.com`; see [Email tags](../email-tags.md).

See [OAuth failure testing](https://mockatoo.globalunderdog.com/learn/oauth-failure-testing) for the four steps where sign-in fails and how to test each one.

## What each provider returns

The token endpoint responds after a delay of 10 seconds by default.

<TagProviders tag="slow" />

<TagSpokes tag="slow" />

## Test it with Playwright

This test signs in with Google as `you+slow@example.com` and checks that sign-in completes. It reads MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD from the environment.

```ts
import { expect, test } from "@playwright/test";

const email = process.env.MOCKATOO_TEST_EMAIL ?? "";
const password = process.env.MOCKATOO_TEST_PASSWORD ?? "";

test("+slow: waits for sign-in to finish", async ({ page }) => {
	const address = email.replace("@", `+e2e-${crypto.randomUUID()}.slow@`);
	// A slow provider can still complete sign-in; no exact latency is assumed.
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
		JSON.parse((await page.locator("pre code").textContent()) ?? "").user.email,
	).toBe(address);
});
```

It runs in CI as [tests/tags/slow.spec.ts](https://github.com/mockatoo/examples/blob/main/better-auth-next/tests/tags/slow.spec.ts) in the Better Auth + Next.js example.
