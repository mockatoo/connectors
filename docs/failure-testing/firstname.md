---
description: "Test sign-in with a Google profile that has a first name but no family name: you+firstname@example.com sends name and given_name without family_name."
datePublished: 2026-11-20
lastModified: 2026-11-24
---

# First name without family name

Check that your app handles a profile with only a first name. Sign in as `you+firstname@example.com` to exercise this provider behavior.

Use your own Mockatoo address with firstname and your usual password. Combine tags with a dot, for example `you+firstname.unverified@example.com`; see [Email tags](../email-tags.md).

See [OAuth failure testing](https://mockatoo.globalunderdog.com/learn/oauth-failure-testing) for the four steps where sign-in fails and how to test each one.

## What each provider returns

Google returns a first name but no family name.

<TagProviders tag="firstname" />

<TagSpokes tag="firstname" />

## Test it with Playwright

This test signs in with Google as `you+firstname@example.com` and checks that sign-in completes. It reads MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD from the environment.

[`firstname.spec.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-next/tests/tags/firstname.spec.ts)

```ts
import { expect, test } from "@playwright/test";

const email = process.env.MOCKATOO_TEST_EMAIL ?? "";
const password = process.env.MOCKATOO_TEST_PASSWORD ?? "";

test("+firstname: displays a name without a surname", async ({ page }) => {
	const address = email.replace("@", `+e2e-${crypto.randomUUID()}.firstname@`);
	// The app must accept a profile with only a first name.
	await page.goto("/");
	await page.getByRole("button", { name: "Sign in with Google" }).click();
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
	expect(user.email).toBe(address);
	expect(user.name.trim().split(/\s+/)).toHaveLength(1);
	expect(user.name).not.toBe("");
});
```
