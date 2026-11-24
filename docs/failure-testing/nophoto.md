---
description: "Test profiles without a photo: you+nophoto@example.com returns no LinkedIn picture claim and a silhouette Facebook profile picture."
lastModified: 2026-11-20
---

# Missing profile photo

Check that your app accepts a profile without a photo. Sign in as `you+nophoto@example.com` to exercise this provider behavior.

Use your own Mockatoo address with nophoto and your usual password. Combine tags with a dot, for example `you+nophoto.unverified@example.com`; see [Email tags](../email-tags.md).

See [OAuth failure testing](https://mockatoo.globalunderdog.com/learn/oauth-failure-testing) for the four steps where sign-in fails and how to test each one.

## What each provider returns

LinkedIn returns no picture claim in the ID token or userinfo response.

<TagProviders tag="nophoto" />

<TagSpokes tag="nophoto" />

## Test it with Playwright

This test signs in with LinkedIn as `you+nophoto@example.com` and checks that sign-in completes. It reads MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD from the environment.

[`nophoto.spec.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-next/tests/tags/nophoto.spec.ts)

```ts
import { expect, test } from "@playwright/test";

const email = process.env.MOCKATOO_TEST_EMAIL ?? "";
const password = process.env.MOCKATOO_TEST_PASSWORD ?? "";

test("+nophoto: signs in without a profile picture", async ({ page }) => {
	const address = email.replace("@", `+e2e-${crypto.randomUUID()}.nophoto@`);
	// A LinkedIn member without a photo is still a valid user.
	await page.goto("/");
	await page.getByRole("button", { name: "Sign in with LinkedIn" }).click();
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
	expect(user.image ?? null).toBeNull();
});
```
