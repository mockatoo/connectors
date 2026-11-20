---
description: "Test missing name with you+noname@example.com in Playwright."
---

# Missing profile name

Check that your app accepts profiles without a name. No name, given_name, or family_name claims are sent. Sign in as `you+noname@example.com` and check how your app handles the returned profile.

Use your own Mockatoo address with noname and your usual password. Combine tags with a dot, for example `you+noname.unverified@example.com`; see [Email tags](../email-tags.md).

See [OAuth failure testing](https://mockatoo.globalunderdog.com/learn/oauth-failure-testing) for the four steps where sign-in fails and how to test each one.

## What each provider returns

No name, given_name, or family_name claims are sent.

<TagProviders tag="noname" />

<TagSpokes tag="noname" />

## Test it with Playwright

This test signs in with Google as `you+noname.unverified@example.com` and checks that your app completes sign in. It reads MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD from the environment.

```ts
import { expect, test } from "@playwright/test";

const email = process.env.MOCKATOO_TEST_EMAIL ?? "";
const password = process.env.MOCKATOO_TEST_PASSWORD ?? "";

test("+noname: signs in without a display name", async ({ page }) => {
	const address = email.replace("@", `+e2e-${crypto.randomUUID()}.noname@`);
	// Better Auth represents Google's missing name as an empty string.
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
		JSON.parse((await page.locator("pre code").textContent()) ?? "").user,
	).toMatchObject({
		email: address,
		name: "",
	});
});
```

It runs in CI as [tests/tags/noname.spec.ts](https://github.com/mockatoo/examples/blob/main/better-auth-next/tests/tags/noname.spec.ts) in the Better Auth + Next.js example.
