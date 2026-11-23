---
description: "Test a Microsoft user outside your tenant: a single-tenant app refuses you+outsider@example.com with AADSTS50020, as for a user who isn't a member or guest."
---

# Microsoft user outside the tenant

Check how your tenant configuration treats Microsoft users outside an organization. Sign in as `you+outsider@example.com` to exercise this provider behavior.

Use your own Mockatoo address with outsider and your usual password. Combine tags with a dot, for example `you+outsider.unverified@example.com`; see [Email tags](../email-tags.md).

See [OAuth failure testing](https://mockatoo.globalunderdog.com/learn/oauth-failure-testing) for the four steps where sign-in fails and how to test each one.

## What each provider returns

A single-tenant app refuses the user with AADSTS50020 because they are not a member or guest.

<TagProviders tag="outsider" />

<TagSpokes tag="outsider" />

## Test it with Playwright

This test signs in with Microsoft as `you+outsider@example.com` and checks that sign-in completes with this example’s common-tenant configuration. It reads MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD from the environment.

[`outsider.spec.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-next/tests/tags/outsider.spec.ts)

```ts
import { expect, test } from "@playwright/test";

const email = process.env.MOCKATOO_TEST_EMAIL ?? "";
const password = process.env.MOCKATOO_TEST_PASSWORD ?? "";

test("+outsider: accepts a Microsoft user outside an organization", async ({
	page,
}) => {
	const address = email.replace("@", `+e2e-${crypto.randomUUID()}.outsider@`);
	// Outsiders are rejected by single-tenant apps. This app uses common, so
	// there is no organization membership restriction to reject this user.
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
