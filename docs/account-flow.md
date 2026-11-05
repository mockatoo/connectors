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

See the [Playwright guide](playwright.md) for a complete provider flow after your app starts OAuth.
