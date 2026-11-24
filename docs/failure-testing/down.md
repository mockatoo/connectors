---
description: "Test your OAuth callback when the token endpoint is down: you+down@example.com makes the code exchange return 503 Service Unavailable for every provider."
datePublished: 2026-11-20
lastModified: 2026-11-24
---

# Token endpoint outage

Check your callback behavior when the token endpoint is unavailable. Sign in as `you+down@example.com` to exercise this provider behavior.

Use your own Mockatoo address with down and your usual password. Combine tags with a dot, for example `you+down.unverified@example.com`; see [Email tags](../email-tags.md).

See [OAuth failure testing](https://mockatoo.globalunderdog.com/learn/oauth-failure-testing) for the four steps where sign-in fails and how to test each one.

## What each provider returns

The token endpoint returns 503 Service Unavailable during code exchange.

<TagProviders tag="down" />

<TagSpokes tag="down" />

## Test it with Playwright

This test signs in with Google as `you+down@example.com` and checks the app's retry response after code exchange fails. It reads MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD from the environment.

[`down.spec.ts`](https://github.com/mockatoo/examples/blob/main/better-auth-next/tests/tags/down.spec.ts)

```ts
import { expect, test } from "@playwright/test";

const email = process.env.MOCKATOO_TEST_EMAIL ?? "";
const password = process.env.MOCKATOO_TEST_PASSWORD ?? "";

test("+down: tells the user to retry when sign-in cannot finish", async ({
	page,
}) => {
	const address = email.replace("@", `+e2e-${crypto.randomUUID()}.down@`);
	// A provider outage also becomes invalid_code in Better Auth. The app
	// cannot distinguish it from a bad code, so it offers the same retry advice.
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
