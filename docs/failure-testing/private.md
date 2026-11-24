---
description: "Test a GitHub user with a private email: you+private@example.com gets email: null from /user, so your app must request user:email and read /user/emails."
lastModified: 2026-11-24
---

# Private GitHub email

Check how your app retrieves a private GitHub email. Sign in as `you+private@example.com` to exercise this provider behavior.

Use your own Mockatoo address with private and your usual password. Combine tags with a dot, for example `you+private.unverified@example.com`; see [Email tags](../email-tags.md).

See [OAuth failure testing](https://mockatoo.globalunderdog.com/learn/oauth-failure-testing) for the four steps where sign-in fails and how to test each one.

## What each provider returns

GitHub returns no email from /user; the app must request user:email and read /user/emails.

<TagProviders tag="private" />

<TagSpokes tag="private" />

## Test it with Playwright

This test signs in with GitHub as `you+private@example.com` and checks that sign-in completes. It reads MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD from the environment.

[`private.spec.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-next/tests/tags/private.spec.ts)

```ts
import { expect, test } from "@playwright/test";

const email = process.env.MOCKATOO_TEST_EMAIL ?? "";
const password = process.env.MOCKATOO_TEST_PASSWORD ?? "";

test("+private: signs in with a private GitHub email", async ({ page }) => {
	const address = email.replace("@", `+e2e-${crypto.randomUUID()}.private@`);
	// GitHub's public profile has no email; the connector still finds it using
	// the email permission, so the app gets a usable, verified address.
	await page.goto("/");
	await page.getByRole("button", { name: "Sign in with GitHub" }).click();
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
