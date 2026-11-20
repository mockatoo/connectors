---
description: "Test admin_policy_enforced with you+blocked@example.com in Playwright."
---

# Provider admin policy blocks sign-in

Check what users see when an organization blocks your app. Sign in as `you+blocked@example.com` to exercise this provider behavior.

Use your own Mockatoo address with blocked and your usual password. Combine tags with a dot, for example `you+blocked.unverified@example.com`; see [Email tags](../email-tags.md).

See [OAuth failure testing](https://mockatoo.globalunderdog.com/learn/oauth-failure-testing) for the four steps where sign-in fails and how to test each one.

## What each provider returns

Google shows an Access blocked page with admin_policy_enforced instead of consent.

<TagProviders tag="blocked" />

<TagSpokes tag="blocked" />

## Test it with Playwright

This test signs in with Google as `you+blocked@example.com` and checks that Google blocks access before consent and the app has no session. It reads MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD from the environment.

[`blocked.spec.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-next/tests/tags/blocked.spec.ts)

```ts
import { expect, test } from "@playwright/test";

const email = process.env.MOCKATOO_TEST_EMAIL ?? "";
const password = process.env.MOCKATOO_TEST_PASSWORD ?? "";

test("+blocked: does not create an app session when an admin blocks consent", async ({
	page,
}) => {
	const address = email.replace("@", `+e2e-${crypto.randomUUID()}.blocked@`);
	// Admin policy stops the user at Google before they can authorize the app.
	await page.goto("/");
	await page.getByRole("button", { name: "Sign in with Google" }).click();
	await page.getByLabel("Email", { exact: true }).fill(address);
	await page.getByLabel("Password", { exact: true }).fill(password);
	await page.getByRole("button", { name: "Log in with password" }).click();
	await expect(
		page.getByRole("heading", { name: /Access blocked/ }),
	).toBeVisible();
	await expect(page.getByRole("button", { name: "Authorize" })).toBeHidden();
	// Returning to the app still shows sign-in, because no callback succeeded.
	await page.goto("/");
	await expect(
		page.getByRole("button", { name: "Sign in with Google" }),
	).toBeVisible();
	await expect(page.getByText("You are logged in")).toBeHidden();
});
```
