---
description: "Test Google, GitHub, Apple and other OAuth sign-in in Django with Mockatoo: allauth providers pointed at the mock, Playwright tests and CI."
title: "Test django-allauth social login in Django · Mockatoo"
datePublished: 2026-11-19
lastModified: 2026-11-24
---

# Django

Sign in through OAuth in a Django app with django-allauth, locally and in CI,
with any of the eight providers Mockatoo mocks.

There is no connector package for Django. You don't need one: each allauth
provider reads its endpoints from an adapter class, so a small subclass that
points those endpoints at the mock does the connector's job.

**Example on GitHub:** [`mockatoo/examples/allauth-django`](https://github.com/mockatoo/examples/tree/main/allauth-django).

## How it works

1. Your sign-in button posts to allauth's `/accounts/<provider>/login/`,
   which redirects to the mock on the provider's real paths:
   `accounts.google.com/o/oauth2/v2/auth` becomes
   `app.mockatoo.globalunderdog.com/google/o/oauth2/v2/auth`.
2. You (or a test) fill in the login page and click **Authorize**.
3. The mock redirects back to `/accounts/<provider>/login/callback/`. Allauth
   exchanges the code for provider-shaped tokens, reads the profile or the
   signed ID token, and signs the Django user in, as it would in production.

Your providers, scopes and templates don't change. Only the client
credentials and the provider classes do, and only when the mock is on.

## Prerequisites

- **Python 3.12**, with `Django` and `django-allauth[socialaccount]`
  ([`pyproject.toml`](https://github.com/mockatoo/examples/blob/main/allauth-django/pyproject.toml)).
- **A Mockatoo test account.** Sign up at
  [app.mockatoo.globalunderdog.com](https://app.mockatoo.globalunderdog.com),
  then copy the email and password from the dashboard.

## Point the providers at the mock

[`provider_adapters.py`](https://github.com/mockatoo/examples/blob/main/allauth-django/example/provider_adapters.py)
subclasses each allauth adapter with the mock's URLs, and each provider to use
that adapter:

```python
from allauth.socialaccount.providers.google.provider import GoogleProvider
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from django.conf import settings


class MockGoogleAdapter(GoogleOAuth2Adapter):
    base_url = f"{settings.MOCK_ORIGIN}/google"
    authorize_url = f"{base_url}/o/oauth2/v2/auth"
    access_token_url = f"{base_url}/token"
    identity_url = f"{base_url}/v1/userinfo"


class MockGoogleProvider(GoogleProvider):
    package = GoogleProvider.get_package()
    oauth2_adapter_class = MockGoogleAdapter
```

GitHub, Discord, Facebook, Apple and X follow the same pattern. Copy all of
them from `provider_adapters.py`.

[`providers.py`](https://github.com/mockatoo/examples/blob/main/allauth-django/example/providers.py)
builds `SOCIALACCOUNT_PROVIDERS`. A single switch picks the shared client and
the mock classes:

```python
use_mock = os.getenv("MOCKATOO_FORCE") == "true"

SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "SCOPE": ["profile", "email"],
        "OAUTH_PKCE_ENABLED": True,
        "APPS": [{
            "client_id": "mockatoo" if use_mock else os.getenv("GOOGLE_CLIENT_ID"),
            "secret": "mockatoo-secret" if use_mock else os.getenv("GOOGLE_CLIENT_SECRET"),
        }],
        # Only with the mock on:
        "provider_class": "example.provider_adapters.MockGoogleProvider",
    },
    # …the other providers
}
```

- `mockatoo` / `mockatoo-secret` is the shared client. It accepts any
  `http(s)` callback, so localhost and preview URLs need no provider setup.
- `provider_class` swaps the class allauth uses to build the login URL. Set
  it only when the mock is on, so production keeps allauth's own providers.
- Allauth signs in to LinkedIn through its generic OpenID Connect provider,
  so the example registers LinkedIn as an `openid_connect` app. The mock subclass
  changes its `server_url`, and allauth reads the endpoints and signing keys
  from the mock's discovery document.
- The example's committed
  [`.env`](https://github.com/mockatoo/examples/blob/main/allauth-django/.env)
  sets `MOCKATOO_FORCE=true` so its demo works. In your app, turn the mock on
  only outside production. Never ship it.

Already use allauth with real providers? Keep your settings, and in
development or CI add the mock classes and the shared client. The example's
[README](https://github.com/mockatoo/examples/tree/main/allauth-django#use-real-providers)
lists every real provider's credentials and callback path.

## Bind the callbacks

Allauth binds each provider's callback view to its built-in adapter when the
module loads, so `provider_class` alone sends the code to the real token
endpoint. [`urls.py`](https://github.com/mockatoo/examples/blob/main/allauth-django/example/urls.py)
registers the same callback paths with the mock adapters, ahead of
`allauth.urls`:

```python
account_patterns = []
if settings.USE_MOCK:
    for route, adapter in (
        ("google/login/callback/", MockGoogleAdapter),
        ("github/login/callback/", MockGitHubAdapter),
        # …Apple, Discord, Facebook and X
    ):
        account_patterns.append(path(route, OAuth2CallbackView.adapter_view(adapter)))

urlpatterns = [
    path("", home, name="home"),
    path("accounts/", include(account_patterns)),
    path("accounts/", include("allauth.urls")),
]
```

The `openid_connect` apps read their endpoints from the provider at request
time, so they need no extra route.

## Sign in and read the user

The template posts to each provider's login URL, which allauth builds from the
configured class
([`views.py`](https://github.com/mockatoo/examples/blob/main/allauth-django/example/views.py)):

```python
adapter = get_adapter(request)
provider = adapter.get_provider(request, "google")
login_url = provider.get_login_url(request)
```

After the callback, `request.user` is a regular Django user, and allauth
stores the linked account in the database. The example reads the provider,
ID and email in a `user_logged_in` receiver, and a `SocialAccountAdapter`
sends failed or declined sign-ins to `/?error=sign-in`.

With the mock on, the example sets `email_authentication` on each app, so the
same Mockatoo email signs in to one Django user from every provider button.
That relies on the mock having checked the email's owner. Keep it off for
real providers.

## Handle provider differences

| Provider | What allauth needs |
| --- | --- |
| Apple | With the mock, a client that sends `mockatoo-secret` instead of a signed JWT, and an ID token check against the mock's issuer. The callback is `apple/login/callback/finish/` |
| Facebook | With the mock, `GRAPH_API_URL` set to the mock's Graph base: allauth uses it for the token exchange and the profile |
| LinkedIn | An `openid_connect` app with `fetch_userinfo: False`: the ID token has the claims |
| X | Allauth's `twitter_oauth2` provider ID. With the mock, the `users.email` scope and `confirmed_email` read as the verified email |

The Apple adapter, from the example:

```python
class MockAppleClient(AppleOAuth2Client):
    def generate_client_secret(self):
        return self.consumer_secret


class MockAppleAdapter(AppleOAuth2Adapter):
    issuer = f"{settings.MOCK_ORIGIN}/apple"
    authorize_url = f"{issuer}/auth/authorize"
    access_token_url = f"{issuer}/auth/token"
    public_key_url = f"{issuer}/auth/keys"
    client_class = MockAppleClient

    def parse_token(self, data):
        token = OAuth2Adapter.parse_token(self, data)
        token._verified_identity_data = jwtkit.verify_and_decode(
            credential=data["id_token"],
            keys_url=self.public_key_url,
            issuer=self.issuer,
            audience=self.get_provider().get_auds(),
            lookup_kid=jwtkit.lookup_kid_jwk,
        )
        return token
```

See each provider's page, e.g. [Apple](providers/apple.md) or
[X](providers/x.md), for its flow and known differences.

## Run it

Create `.env.local` with `DJANGO_SECRET_KEY` set to the output of
`openssl rand -base64 48`, then run:

```sh
pnpm install
pnpm dev
```

`pnpm dev` applies the migrations to `db.sqlite3` and starts Django on
http://localhost:3000. Pick a provider and sign in with your dashboard email
and password. To sign in as another user, add a tag to the email, e.g.
`you+alice@example.com` (see [Email tags](email-tags.md)).

## Test with Playwright

To cover failures after setting up sign-in, see [OAuth failure testing](https://mockatoo.globalunderdog.com/learn/oauth-failure-testing).

The example tests the Django app with Playwright, which only needs a running
server. [`playwright.config.ts`](https://github.com/mockatoo/examples/blob/main/allauth-django/playwright.config.ts)
installs the app and starts it:

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

`pnpm build` runs `uv sync` and `pnpm start` migrates the database and runs
the server
([`package.json`](https://github.com/mockatoo/examples/blob/main/allauth-django/package.json)).
[`tests/sign-in.spec.ts`](https://github.com/mockatoo/examples/blob/main/allauth-django/tests/sign-in.spec.ts)
signs in, checks the session survives a reload, signs out, and declines
consent with every provider:

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
tags and token refresh. Those tests work the same against a Django app.

## Run in CI

The example's
[workflow](https://github.com/mockatoo/examples/blob/main/.github/workflows/allauth-django.yml)
sets up uv and Node.js, generates a secret key, then runs the tests with the
credentials as secrets:

```yaml
- uses: astral-sh/setup-uv@v7
  with:
    python-version: "3.12"
- name: Generate runtime secret
  run: echo "DJANGO_SECRET_KEY=$(openssl rand -base64 32)" >> "$GITHUB_ENV"
- run: pnpm --dir allauth-django exec playwright install --with-deps chromium
- run: pnpm --dir allauth-django test
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
| `Set DJANGO_SECRET_KEY …` on startup | Add a random secret to `.env.local` |
| Sign-in ends on `/?error=sign-in` after **Authorize** | Bind the provider's callback to its mock adapter in `urls.py` ([above](#bind-the-callbacks)) |
| Apple sign-in ends on `/?error=sign-in` | Check the ID token against the mock's issuer, and send the static secret ([above](#handle-provider-differences)) |
| A second provider asks you to sign up again | Set `email_authentication` on the mock apps, so one Mockatoo email maps to one Django user |
| Login fails after a password change | Copy the new password from the dashboard into `.env.local` and your secrets |

## Next steps

- [All examples](https://github.com/mockatoo/examples): Django, Flask, Spring Boot, Auth.js, Better Auth, SvelteKit, Nuxt and Hono
- [Playwright](playwright.md) · [Email tags](email-tags.md) · [Account flow](account-flow.md) · [Run in CI](ci.md)
- Use Mockatoo only outside production, and never commit its credentials.
