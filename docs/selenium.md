---
description: "Test OAuth sign-in with Selenium and Mockatoo. Cover eight providers, reuse browser sessions, and test email tags and denied consent locally and in CI."
---

# Selenium

Use Selenium WebDriver to test OAuth sign-in, sign-out, and denied consent from a browser.

[Better Auth + Next.js example](https://github.com/mockatoo/examples/tree/main/better-auth-next/selenium) · [Auth.js + Next.js example](https://github.com/mockatoo/examples/tree/main/authjs-next/selenium)

## Why real providers break Selenium tests

| With the real provider | With Mockatoo |
| --- | --- |
| Bot checks, CAPTCHAs, and MFA block headless browsers | The login fields and consent buttons have stable labels |
| Each app needs a client secret and registered redirect URIs | The shared Mockatoo client accepts any HTTP(S) callback |
| Repeated sign-ins can hit rate limits | Mockatoo allows bursts of sign-ins |
| A personal account password has to be shared with CI | A test account has its own generated password |

## How it works

1. The test clicks your app's sign-in button. Your connector redirects the browser to the matching Mockatoo provider.
2. WebDriver fills in the login form and clicks **Authorize**.
3. Mockatoo returns the browser to your app. The app exchanges the authorization code for tokens and renders the signed-in session.

WebDriver follows the browser through both origins. Use explicit waits for the fields and buttons that appear after each redirect.

## Prerequisites

- The examples use Node.js 24, pnpm 10, and Google Chrome. Selenium Manager resolves the matching ChromeDriver.
- Connect your app to Mockatoo, or use one of the two Next.js examples.
- Create a test account and copy its email and generated password from your dashboard. [Mockatoo dashboard](https://app.mockatoo.globalunderdog.com)
- Set `MOCKATOO_TEST_EMAIL` and `MOCKATOO_TEST_PASSWORD` in your shell or the example's ignored `.env.local`. Set the app's runtime secret there too, using `BETTER_AUTH_SECRET` for Better Auth or `AUTH_SECRET` for Auth.js. Generate it with `openssl rand -base64 32`.

Install the example's dependencies with `pnpm install` in its directory.

## Start a headless browser

The example uses Node's test runner. The helper starts Chrome, then registers a cleanup hook to close it even when an assertion fails.

```ts
import nextEnv from "@next/env";
import { Builder, By, until, type WebDriver } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";

nextEnv.loadEnvConfig(process.cwd());
export const appUrl = "http://localhost:3000";
export const timeout = 15_000;
export const button = (label: string) =>
	By.xpath(`//button[normalize-space(.)="${label}"]`);

export async function openBrowser(t: {
	after(cleanup: () => Promise<void>): void;
}) {
	const options = new chrome.Options();
	options.addArguments("--headless");
	const driver = await new Builder()
		.forBrowser("chrome")
		.setChromeOptions(options)
		.build();
	t.after(() => driver.quit());
	return driver;
}
```

[selenium/helpers.ts](https://github.com/mockatoo/examples/blob/main/better-auth-next/selenium/helpers.ts)

## Sign in with Google

The reusable `signIn()` helper reads credentials from the environment, clicks the provider button, and waits for the login and consent screens. The `tag` option selects a separate user, and `consent` picks **Authorize** or **Deny**.

```ts
export async function signIn(
	driver: WebDriver,
	provider: string,
	{
		tag,
		consent = "Authorize",
	}: { tag?: string; consent?: "Authorize" | "Deny" } = {},
) {
	const email = process.env.MOCKATOO_TEST_EMAIL;
	const password = process.env.MOCKATOO_TEST_PASSWORD;
	if (!email || !password) {
		throw new Error(
			"Set MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD in .env.local or the environment.",
		);
	}

	const address = tag ? email.replace("@", `+${tag}@`) : email;
	await driver.get(appUrl);
	await driver
		.wait(until.elementLocated(button(`Sign in with ${provider}`)), timeout)
		.click();
	await driver
		.wait(until.elementLocated(By.id("email")), timeout)
		.sendKeys(address);
	await driver.findElement(By.id("password")).sendKeys(password);
	await driver.findElement(button("Log in with password")).click();
	await driver.wait(until.elementLocated(button(consent)), timeout).click();
	return address;
}
```

The same controls appear for all eight providers.

| Element | Selector |
| --- | --- |
| Email field | `#email` |
| Password field | `#password` |
| Submit login | Button labeled **Log in with password** |
| Consent | Button labeled **Authorize** or **Deny** |

The example checks the email shown in the app's session, signs out, and waits for the Google sign-in button to return.

```ts
test("signs in with Google and signs out", async (t) => {
	const driver = await openBrowser(t);
	const address = await signIn(driver, "Google");
	const user = await sessionUser(driver);
	assert.ok(
		user.email === address,
		"Expected the signed-in email in the session",
	);

	await driver.findElement(button("Sign out")).click();
	await driver.wait(
		until.elementLocated(button("Sign in with Google")),
		timeout,
	);
});
```

[selenium/sign-in.test.ts](https://github.com/mockatoo/examples/blob/main/better-auth-next/selenium/sign-in.test.ts)

## Sign in once and restore cookies

After the app shows an authenticated session, save its cookies in memory. Start a fresh browser for each test, navigate to the app origin so WebDriver can add its cookies, then reload to pick up the restored session.

```ts
let cookies: IWebDriverOptionsCookie[];

before(async () => {
	const driver = await openBrowser({ after });
	await signIn(driver, "Google", { tag: "selenium-session" });
	await waitForSession(driver);
	cookies = await driver.manage().getCookies();
});

async function restoreSession(t: TestContext) {
	const driver = await openBrowser(t);
	// WebDriver can only add cookies for the current domain.
	await driver.get(appUrl);
	for (const cookie of cookies) {
		await driver.manage().addCookie(cookie);
	}
	await driver.navigate().refresh();
	return driver;
}
```

The session spec confirms that the restored browser starts signed in and shows the same tagged user.

[selenium/session.test.ts](https://github.com/mockatoo/examples/blob/main/better-auth-next/selenium/session.test.ts)

## Test every provider with one loop

Use a fresh browser for each provider. The same helper drives every login and consent form.

```ts
const providers = [
	"Apple",
	"Google",
	"GitHub",
	"Discord",
	"Facebook",
	"LinkedIn",
	"Microsoft",
	"X",
];

for (const provider of providers) {
	test(`signs in with ${provider}`, async (t) => {
		const driver = await openBrowser(t);
		await signIn(driver, provider);
		await waitForSession(driver);
	});
}
```

[selenium/all-providers.test.ts](https://github.com/mockatoo/examples/blob/main/better-auth-next/selenium/all-providers.test.ts)

## Separate users with email tags

`you+selenium-1@example.com` signs in as a stable user with the same password as the base account. Give parallel workers distinct tags if the app stores user-specific data. [Email tags](email-tags.md)

```ts
test("signs in as a tagged address", async (t) => {
	const driver = await openBrowser(t);
	const address = await signIn(driver, "Google", { tag: "selenium-1" });
	const user = await sessionUser(driver);
	assert.ok(user.email === address, "Expected the tagged email in the session");
});
```

## Test edge cases

[OAuth failure testing](https://mockatoo.globalunderdog.com/learn/oauth-failure-testing) explains which sign-in failures to test and what your app should do for each.

Use `+unverified` to check how the app handles an unverified email. Use `+down` to simulate a failing token endpoint and check that the app shows a retry message.

```ts
test("+unverified: keeps an unverified email unverified", async (t) => {
	const driver = await openBrowser(t);
	const address = await signIn(driver, "Google", { tag: "unverified" });
	const user = await sessionUser(driver);
	assert.ok(
		user.email === address,
		"Expected the unverified email in the session",
	);
	assert.equal(user.emailVerified, false);
});

test("+down: shows a retry message when the token endpoint is down", async (t) => {
	const driver = await openBrowser(t);
	await signIn(driver, "Google", { tag: "down" });
	await expectSignInError(
		driver,
		"invalid_code",
		"Sign-in failed before it finished. Try again in a minute.",
	);
});
```

Click **Deny** to exercise the provider's `access_denied` response. The example checks the error in the callback URL and the message the app displays.

```ts
test("Deny: returns access_denied to the app", async (t) => {
	const driver = await openBrowser(t);
	await signIn(driver, "Google", { consent: "Deny" });
	await expectSignInError(
		driver,
		"access_denied",
		"Sign-in failed because you cancelled it.",
	);
});
```

[selenium/edge-cases.test.ts](https://github.com/mockatoo/examples/blob/main/better-auth-next/selenium/edge-cases.test.ts)

## Run locally

Run `pnpm test:selenium` from the example directory. The command builds and starts the app on port 3000, waits for it to respond, runs the specs, and stops the app. Chrome handles Secure cookies on `http://localhost:3000` during the OAuth redirect.

## Run in CI

Create GitHub Actions secrets named `MOCKATOO_TEST_EMAIL` and `MOCKATOO_TEST_PASSWORD`. The examples workflow generates the runtime secret separately in each job and runs Selenium with Chrome on the Ubuntu runner. [Run in CI](ci.md) · [Next.js workflow](https://github.com/mockatoo/examples/blob/main/.github/workflows/nextjs.yml)

```yaml
- run: pnpm --dir better-auth-next test:selenium
  env:
    MOCKATOO_TEST_EMAIL: ${{ secrets.MOCKATOO_TEST_EMAIL }}
    MOCKATOO_TEST_PASSWORD: ${{ secrets.MOCKATOO_TEST_PASSWORD }}
```

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Selenium Manager cannot find Chrome or ChromeDriver | Install Chrome and allow Selenium Manager to download the matching driver |
| The app fails to start | Set the runtime secret and free port 3000 |
| WebDriver times out waiting for the login form | Check that the app's sign-in button redirects to Mockatoo |
| Login fails after a password change | Update the password in your local environment and CI secrets |

## Next steps

- [Cypress](cypress.md) · [Playwright](playwright.md) · [Account flow](account-flow.md) · [Run in CI](ci.md)
