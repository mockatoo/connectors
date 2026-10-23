# Account flow

Visit `/signup` to receive a magic link via Resend. After verification, `/`
displays your email and generated password. `/login` supports both magic links
and email/password login. All signed-in sessions can view and regenerate the
password. Regeneration invalidates other password sessions.

Password logins have no usage cap for now.
Sessions last one day; magic links expire after 10 minutes and work once.

Every new OAuth sign-in shows the login form, even with an existing provider
session. After password or magic-link verification, the consent screen appears.

The login form has stable **Email**, **Password**, and **Log in with password**
labels. OAuth consent has **Authorize** and **Deny** buttons. Denial returns
`access_denied` and the original `state` to your callback.

A Playwright test can complete the provider flow after your app starts OAuth:

```ts
await page.getByLabel("Email", { exact: true }).fill(process.env.MOCK_EMAIL!);
await page.getByLabel("Password", { exact: true }).fill(process.env.MOCK_PASSWORD!);
await page.getByRole("button", { name: "Log in with password", exact: true }).click();
await page.getByRole("button", { name: "Authorize", exact: true }).click();
await page.waitForURL("**/your-app-callback**");
```
