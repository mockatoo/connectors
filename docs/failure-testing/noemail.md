---
description: "Test sign-in without an email: you+noemail@example.com gets none from Microsoft, Discord, LinkedIn, X or Facebook, even with the email scope."
lastModified: 2026-11-24
---

# Provider account without email

Check what your app does when a provider returns no email. Sign in as `you+noemail@example.com` to exercise this provider behavior.

Use your own Mockatoo address with noemail and your usual password. Combine tags with a dot, for example `you+noemail.unverified@example.com`; see [Email tags](../email-tags.md).

See [OAuth failure testing](https://mockatoo.globalunderdog.com/learn/oauth-failure-testing) for the four steps where sign-in fails and how to test each one.

## What each provider returns

Discord returns no email even when the app requests the email scope.

<TagProviders tag="noemail" />

<TagSpokes tag="noemail" />

## Test it with Playwright

This test signs in with Discord as `you+noemail@example.com` and checks that Better Auth returns the user to sign-in with its email_not_found error. It reads MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD from the environment.

[`noemail.spec.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-next/tests/tags/noemail.spec.ts)

```ts
import { expect, test } from "@playwright/test";

const email = process.env.MOCKATOO_TEST_EMAIL ?? "";
const password = process.env.MOCKATOO_TEST_PASSWORD ?? "";

test("+noemail: reports that sign-in needs an email", async ({ page }) => {
	const address = email.replace("@", `+e2e-${crypto.randomUUID()}.noemail@`);
	// A Discord account registered by phone can lack an email. Better Auth
	// cannot create this app's session and returns the user to sign-in.
	await page.goto("/");
	await page.getByRole("button", { name: "Sign in with Discord" }).click();
	await page.getByLabel("Email", { exact: true }).fill(address);
	await page.getByLabel("Password", { exact: true }).fill(password);
	await page.getByRole("button", { name: "Log in with password" }).click();
	await page.getByRole("button", { name: "Authorize" }).click();
	await expect(page).toHaveURL(
		(url) =>
			url.pathname === "/" &&
			url.searchParams.get("error") === "email_not_found",
	);
	await expect(
		page
			.getByRole("alert")
			.filter({ hasText: "Sign-in failed. Please try again." }),
	).toHaveText("Sign-in failed. Please try again.");
	await expect(
		page.getByRole("button", { name: "Sign in with Google" }),
	).toBeVisible();
	await expect(page.getByText("You are logged in")).toBeHidden();
});
```
