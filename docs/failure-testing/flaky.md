---
description: "Test OAuth 503 retry with you+flaky@example.com in Playwright."
---

# Intermittent token endpoint failure

Check how your app handles a temporary token exchange failure. Sign in as `you+flaky@example.com` to exercise this provider behavior.

Use your own Mockatoo address with flaky and your usual password. Combine tags with a dot, for example `you+flaky.unverified@example.com`; see [Email tags](../email-tags.md).

See [OAuth failure testing](https://mockatoo.globalunderdog.com/learn/oauth-failure-testing) for the four steps where sign-in fails and how to test each one.

## What each provider returns

The first code exchange returns 503; retrying with the same code succeeds.

<TagProviders tag="flaky" />

<TagSpokes tag="flaky" />

## Test it with Playwright

This test signs in with Google as `you+flaky@example.com` and checks the app's retry response after code exchange fails. It reads MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD from the environment.

[`flaky.spec.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-next/tests/tags/flaky.spec.ts)

```ts
import { expect, test } from "@playwright/test";

const email = process.env.MOCKATOO_TEST_EMAIL ?? "";
const password = process.env.MOCKATOO_TEST_PASSWORD ?? "";

test("+flaky: tells the user to retry when sign-in cannot finish", async ({
	page,
}) => {
	const address = email.replace("@", `+e2e-${crypto.randomUUID()}.flaky@`);
	// Better Auth does not retry a failed code exchange. Even though a retry
	// could succeed, the app sees invalid_code and asks the user to try again.
	await page.goto("/");
	await page.getByRole("button", { name: "Sign in with Google" }).click();
	await page.getByLabel("Email", { exact: true }).fill(address);
	await page.getByLabel("Password", { exact: true }).fill(password);
	await page.getByRole("button", { name: "Log in with password" }).click();
	await page.getByRole("button", { name: "Authorize" }).click();
	await expect(page).toHaveURL(
		(url) =>
			url.pathname === "/" && url.searchParams.get("error") === "invalid_code",
	);
	await expect(
		page.getByRole("alert").filter({
			hasText: "Sign-in failed before it finished. Try again in a minute.",
		}),
	).toHaveText("Sign-in failed before it finished. Try again in a minute.");
	await expect(
		page.getByRole("button", { name: "Sign in with Google" }),
	).toBeVisible();
	await expect(page.getByText("You are logged in")).toBeHidden();
});
```
