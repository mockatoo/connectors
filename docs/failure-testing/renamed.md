---
description: "Test changed email with you+renamed@example.com in Playwright."
---

# Changed provider email

Check account linking after a user changes their provider email. The provider returns the same user ID with a different email. Sign in as `you+renamed@example.com` and check how your app handles the returned profile.

Use your own Mockatoo address with renamed and your usual password. Combine tags with a dot, for example `you+renamed.unverified@example.com`; see [Email tags](../email-tags.md).

See [OAuth failure testing](https://mockatoo.globalunderdog.com/learn/oauth-failure-testing) for the four steps where sign-in fails and how to test each one.

## What each provider returns

The provider returns the same user ID with a different email.

<TagProviders tag="renamed" />

<TagSpokes tag="renamed" />

## Test it with Playwright

This test signs in with Google as `you+renamed@example.com` and checks that the session shows the changed email. It reads MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD from the environment.

[`renamed.spec.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-next/tests/tags/renamed.spec.ts)

```ts
import { expect, test } from "@playwright/test";

const email = process.env.MOCKATOO_TEST_EMAIL ?? "";
const password = process.env.MOCKATOO_TEST_PASSWORD ?? "";

test("+renamed: displays the user's changed email", async ({ page }) => {
	const address = email.replace("@", `+e2e-${crypto.randomUUID()}.renamed@`);
	// The provider sends the changed address, and the session shows it.
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
