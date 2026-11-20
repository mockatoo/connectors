---
description: "Test refresh token invalid_grant with you+revoked@example.com in Playwright."
---

# Revoked provider access

Check how your app responds when a refresh token stops working. Sign in as `you+revoked@example.com` to exercise this provider behavior.

Use your own Mockatoo address with revoked and your usual password. Combine tags with a dot, for example `you+revoked.unverified@example.com`; see [Email tags](../email-tags.md).

See [OAuth failure testing](https://mockatoo.globalunderdog.com/learn/oauth-failure-testing) for the four steps where sign-in fails and how to test each one.

## What each provider returns

Sign-in succeeds, but every refresh returns invalid_grant, as if access was revoked.

<TagProviders tag="revoked" />

<TagSpokes tag="revoked" />

## Test it with Playwright

This test signs in with Microsoft as `you+revoked@example.com` and checks that sign-in succeeds, token refresh fails, and the app session remains active. It reads MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD from the environment.

```ts
import { expect, test } from "@playwright/test";

const email = process.env.MOCKATOO_TEST_EMAIL ?? "";
const password = process.env.MOCKATOO_TEST_PASSWORD ?? "";

test("+revoked: reports a refresh failure after successful sign-in", async ({
	page,
}) => {
	const address = email.replace("@", `+e2e-${crypto.randomUUID()}.revoked@`);
	// Revoked access affects refresh, not initial sign-in. Better Auth reports
	// a refresh failure to the app without exposing Microsoft's provider error.
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
	// Exercise the app's public auth API with the browser's session cookies.
	const response = await page.request.post("/api/auth/refresh-token", {
		data: { useAccountCookie: true },
		headers: { Origin: new URL(page.url()).origin },
	});
	expect(response.status()).toBe(400);
	expect(await response.json()).toMatchObject({
		code: "FAILED_TO_REFRESH_ACCESS_TOKEN",
		message: "Failed to refresh access token",
	});
	// Refresh failure alone does not end the app's cookie session.
	await page.reload();
	await expect(page.getByRole("heading", { name: "Your session" })).toBeVisible(
		{ timeout: 15_000 },
	);
	expect(
		JSON.parse((await page.locator("pre code").textContent()) ?? "").user.email,
	).toBe(address);
});
```

It runs in CI as [tests/tags/revoked.spec.ts](https://github.com/mockatoo/examples/blob/main/better-auth-next/tests/tags/revoked.spec.ts) in the Better Auth + Next.js example.
