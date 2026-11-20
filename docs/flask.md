---
description: "Test Google, GitHub, Apple and other OAuth sign-in in Flask with Mockatoo: Authlib clients pointed at the mock, Playwright tests and CI."
---

# Flask

Sign in through OAuth in a Flask app, locally and in CI, with any of the
eight providers Mockatoo mocks.

**Example on GitHub:** [`mockatoo/examples/authlib-flask`](https://github.com/mockatoo/examples/tree/main/authlib-flask).

## How it works

1. Your sign-in route calls Authlib's `authorize_redirect`, which sends the
   browser to the mock on the provider's real paths:
   `accounts.google.com/o/oauth2/v2/auth` becomes
   `app.mockatoo.globalunderdog.com/google/o/oauth2/v2/auth`.
2. You (or a test) fill in the login page and click **Authorize**.
3. The mock redirects back to `/auth/<provider>/callback`. Authlib's
   `authorize_access_token` exchanges the code for provider-shaped tokens and
   validates the signed ID token, as it would in production.

Your routes, scopes and callbacks don't change. Only the client credentials
and the provider URLs do, and only when the mock is on.

## Prerequisites

- **Python 3.12**, with `Authlib`, `Flask` and `requests`
  ([`pyproject.toml`](https://github.com/mockatoo/examples/blob/main/authlib-flask/pyproject.toml)).
- **A Mockatoo test account.** Sign up at
  [app.mockatoo.globalunderdog.com](https://app.mockatoo.globalunderdog.com),
  then copy the email and password from the dashboard.

## Register the providers

[`providers.py`](https://github.com/mockatoo/examples/blob/main/authlib-flask/providers.py)
registers one Authlib client per provider. A single switch picks the real or
the mock URLs and credentials:

```python
use_mock = os.getenv("MOCKATOO_FORCE") == "true"
origin = os.getenv("MOCKATOO_URL") or "https://app.mockatoo.globalunderdog.com"

oauth.register(
    name="google",
    client_id="mockatoo" if use_mock else os.getenv("GOOGLE_CLIENT_ID"),
    client_secret="mockatoo-secret" if use_mock else os.getenv("GOOGLE_CLIENT_SECRET"),
    # OpenID Connect providers: swap the discovery document.
    server_metadata_url=(f"{origin}/google" if use_mock else "https://accounts.google.com")
    + "/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

github = f"{origin}/github" if use_mock else "https://github.com"
oauth.register(
    name="github",
    # …the same client ID and secret switch
    # OAuth-only providers: swap the three endpoints.
    authorize_url=f"{github}/login/oauth/authorize",
    access_token_url=f"{github}/login/oauth/access_token",
    api_base_url=f"{origin}/github/api/v3/" if use_mock else "https://api.github.com/",
    client_kwargs={"scope": "read:user user:email"},
)
```

- `mockatoo` / `mockatoo-secret` is the shared client. It accepts any
  `http(s)` callback, so localhost and preview URLs need no provider setup.
- For Google, Microsoft, Apple and LinkedIn, Authlib fetches discovery and
  signing keys from the mock. For GitHub, Discord, X and Facebook, list the
  mock's paths. Copy the URLs for all eight from `providers.py`.
- Microsoft takes any tenant ID. Use a concrete one, as the example does, so
  the issuer matches the ID token.
- The example's committed
  [`.env`](https://github.com/mockatoo/examples/blob/main/authlib-flask/.env)
  sets `MOCKATOO_FORCE=true` so its live demo works. In your app, turn the
  mock on only outside production. Never ship it.

Already have Authlib clients? Keep them, and in development or CI override
the client ID, secret and URLs with the mock's. The example's
[README](https://github.com/mockatoo/examples/tree/main/authlib-flask#point-an-existing-integration-at-mockatoo)
lists every provider's discovery URL and endpoint paths.

## Sign in and read the user

[`app.py`](https://github.com/mockatoo/examples/blob/main/authlib-flask/app.py)
uses the same two Authlib calls for every provider, real or mock (error
handling trimmed):

```python
@app.post("/sign-in")
def sign_in():
    provider = request.form.get("provider")
    client = oauth.create_client(provider)
    return client.authorize_redirect(
        url_for("callback", provider=provider, _external=True)
    )


@app.get("/auth/<provider>/callback")
def callback(provider):
    client = oauth.create_client(provider)
    token = client.authorize_access_token()
    subject, email = get_identity(provider, client, token)
    session["user"] = {"provider": provider, "sub": str(subject), "email": email}
    return redirect(url_for("index"))
```

`get_identity` in `providers.py` reads the ID token's claims for the OpenID
Connect providers and calls the user API for the others. Build the callback
URL from the request, as `url_for(..., _external=True)` does, so each
localhost port and preview deployment uses its own.

## Handle provider differences

These settings match the real providers, so they belong in your app whether or
not you use the mock. The example handles them in `providers.py` and `app.py`:

| Provider | What Authlib needs |
| --- | --- |
| Apple | `response_mode=form_post`, a CSRF-exempt `POST /auth/apple/callback`, and a `SameSite=None; Secure` session cookie while the sign-in is pending |
| LinkedIn | A client class that skips the `nonce` check: LinkedIn doesn't return it |
| X | `code_challenge_method: S256`, and the profile unwrapped from `data` |
| GitHub | A fallback to `user/emails` for the primary verified email |

The LinkedIn client, from the example:

```python
class LinkedInOAuth(FlaskOAuth2App):
    def parse_id_token(self, token, nonce, **kwargs):
        # LinkedIn does not return the nonce. Authlib still validates the signed
        # ID token and ties the authorization code to this browser using state.
        return super().parse_id_token(token, nonce=None, **kwargs)
```

See each provider's page, e.g. [Apple](providers/apple.md) or
[LinkedIn](providers/linkedin.md), for its flow and known differences.

## Run it

Create `.env.local` with `FLASK_SECRET_KEY` set to the output of
`openssl rand -base64 32`, then run:

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000, pick a provider, and sign in with your dashboard
email and password. To sign in as another user, add a tag to the email, e.g.
`you+alice@example.com` (see [Email tags](email-tags.md)).

## Test with Playwright

To cover failures after setting up sign-in, see [OAuth failure testing](https://mockatoo.globalunderdog.com/learn/oauth-failure-testing).

The example tests the Flask app with Playwright, which only needs a running
server. [`playwright.config.ts`](https://github.com/mockatoo/examples/blob/main/authlib-flask/playwright.config.ts)
installs the app and starts it with Gunicorn:

```ts
export default defineConfig({
	testDir: "./tests",
	use: { baseURL: "http://localhost:3000" },
	webServer: {
		command: "pnpm build && pnpm start",
		url: "http://localhost:3000",
		timeout: 120000,
	},
});
```

`pnpm build` runs `uv sync` and `pnpm start` runs Gunicorn
([`package.json`](https://github.com/mockatoo/examples/blob/main/authlib-flask/package.json)).
[`tests/sign-in.spec.ts`](https://github.com/mockatoo/examples/blob/main/authlib-flask/tests/sign-in.spec.ts)
signs in, checks the session, signs out, and declines consent with every provider:

```ts
await page.goto("/");
await page
	.getByRole("button", { name: `Sign in with ${provider}`, exact: true })
	.click();
await page.getByLabel("Email", { exact: true }).fill(email);
await page.getByLabel("Password", { exact: true }).fill(password);
await page.getByRole("button", { name: "Log in with password" }).click();
await page.getByRole("button", { name: decision, exact: true }).click();
```

Add `MOCKATOO_TEST_EMAIL` and `MOCKATOO_TEST_PASSWORD` to `.env.local` or the
environment, then run:

```sh
pnpm exec playwright install chromium
pnpm test
```

The [Playwright guide](playwright.md) covers fresh users per test, edge-case
tags and token refresh. Those tests work the same against a Flask app.

## Run in CI

The example's
[workflow](https://github.com/mockatoo/examples/blob/main/.github/workflows/authlib-flask.yml)
sets up uv and Node.js, generates a session secret, then runs the tests with
the credentials as secrets:

```yaml
- uses: astral-sh/setup-uv@v7
  with:
    python-version: "3.12"
- name: Generate runtime secret
  run: echo "FLASK_SECRET_KEY=$(openssl rand -base64 32)" >> "$GITHUB_ENV"
- run: pnpm --dir authlib-flask exec playwright install --with-deps chromium
- run: pnpm --dir authlib-flask test
  env:
    MOCKATOO_TEST_EMAIL: ${{ secrets.MOCKATOO_TEST_EMAIL }}
    MOCKATOO_TEST_PASSWORD: ${{ secrets.MOCKATOO_TEST_PASSWORD }}
```

More in [Run in CI](ci.md).

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| The real provider's login page opens | The mock isn't on: set `MOCKATOO_FORCE=true` in `.env` or the environment |
| `Configure provider credentials or set MOCKATOO_FORCE=true.` | Same cause: without the mock, the example expects the real credentials |
| `Set FLASK_SECRET_KEY …` on startup | Add a random secret of at least 32 characters to `.env.local` |
| Apple sign-in ends on `/?error=sign-in` | Keep the CSRF exemption and the `SameSite=None; Secure` cookie for Apple, and use HTTPS or Chromium's localhost |
| LinkedIn sign-in ends on `/?error=sign-in` | Skip the `nonce` check for LinkedIn ([above](#handle-provider-differences)) |
| Login fails after a password change | Copy the new password from the dashboard into `.env.local` and your secrets |

## Next steps

- [All examples](https://github.com/mockatoo/examples): Flask, Laravel, Django, Spring Boot, Auth.js, Better Auth, SvelteKit, Nuxt and Hono
- [Playwright](playwright.md) · [Email tags](email-tags.md) · [Account flow](account-flow.md) · [Run in CI](ci.md)
- Use Mockatoo only outside production, and never commit its credentials.
