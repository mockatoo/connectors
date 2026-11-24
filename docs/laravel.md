---
description: "Test Google, GitHub, Apple and other OAuth sign-in in Laravel with Mockatoo: Socialite drivers pointed at the mock, Playwright tests and CI."
title: "Test Laravel Socialite OAuth login · Mockatoo"
datePublished: 2026-11-19
lastModified: 2026-11-24
---

# Laravel

Sign in through OAuth in a Laravel app, locally and in CI, with any of the
eight providers Mockatoo mocks.

**Example on GitHub:** [`mockatoo/examples/socialite-laravel`](https://github.com/mockatoo/examples/tree/main/socialite-laravel).

## How it works

1. Your sign-in route calls Socialite's `redirect()`, which sends the browser
   to the mock on the provider's real paths:
   `accounts.google.com/o/oauth2/v2/auth` becomes
   `app.mockatoo.globalunderdog.com/google/o/oauth2/v2/auth`.
2. You (or a test) fill in the login page and click **Authorize**.
3. The mock redirects back to `/auth/<provider>/callback`. Socialite's
   `user()` checks the OAuth state, exchanges the code for provider-shaped
   tokens and fetches the profile, as it would in production.

Your routes, scopes and callbacks don't change. Only the client credentials
and the provider URLs do, and only when the mock is on.

## Prerequisites

- **PHP 8.3, Composer 2, Node.js 24 and pnpm 10**, with `laravel/framework`
  12, `laravel/socialite` and `socialiteproviders/openidconnect`
  ([`composer.json`](https://github.com/mockatoo/examples/blob/main/socialite-laravel/composer.json)).
  Node.js runs only the Playwright tests.
- **A Mockatoo test account.** Sign up at
  [app.mockatoo.globalunderdog.com](https://app.mockatoo.globalunderdog.com),
  then copy the email and password from the dashboard.

## Turn the mock on

[`config/services.php`](https://github.com/mockatoo/examples/blob/main/socialite-laravel/config/services.php)
reads one switch, next to each provider's usual Socialite settings:

```php
'mockatoo' => [
    'enabled' => env('MOCKATOO_FORCE') === true,
    'origin' => rtrim(env('MOCKATOO_URL') ?: 'https://app.mockatoo.globalunderdog.com', '/'),
],
```

When it is on,
[`app/Socialite/Providers.php`](https://github.com/mockatoo/examples/blob/main/socialite-laravel/app/Socialite/Providers.php)
registers every driver with the mock's shared client and a callback built
from the request:

```php
if ($mock) {
    $config['client_id'] = 'mockatoo';
    $config['client_secret'] = 'mockatoo-secret';
    $config['redirect'] = url("/auth/$id/callback");
}
```

- `mockatoo` / `mockatoo-secret` is the shared client. It accepts any
  `http(s)` callback, so localhost and preview URLs need no provider setup.
- `url()` builds the callback from the request, so each localhost port and
  preview deployment uses its own.
- The example's committed
  [`.env`](https://github.com/mockatoo/examples/blob/main/socialite-laravel/.env)
  sets `MOCKATOO_FORCE=true` so its live demo works. In your app, turn the
  mock on only outside production. Never ship it.

## Point the drivers at the mock

Socialite's drivers hard-code the provider URLs, so the example handles them
in two ways.

**Google, GitHub, Facebook, LinkedIn and X** keep Socialite's built-in
drivers, with their scopes, token exchange and profile mapping. The
[`UsesMockatoo`](https://github.com/mockatoo/examples/blob/main/socialite-laravel/app/Socialite/UsesMockatoo.php)
trait replaces the authorization URL and gives the driver a Guzzle client
that sends each provider request to the mock's matching path:

```php
$stack->push(Middleware::mapRequest(function (RequestInterface $request) use ($origin, $endpoints) {
    $uri = $request->getUri();
    $endpoint = (string) $uri->withQuery('');

    // Fail closed if a Socialite upgrade changes an endpoint.
    $path = $endpoints[$endpoint] ?? throw new LogicException('Missing Mockatoo endpoint.');

    return $request->withUri(new Uri($origin.$path.'?'.$uri->getQuery()));
}));
```

Each driver lists the endpoints it calls. GitHub's, from `Providers.php`:

```php
new class (...$args) extends GithubProvider { use UsesMockatoo; },
'/github/login/oauth/authorize',
[
    'https://github.com/login/oauth/access_token' => '/github/login/oauth/access_token',
    'https://api.github.com/user' => '/github/api/v3/user',
    'https://api.github.com/user/emails' => '/github/api/v3/user/emails',
],
```

With the mock, the example also pins Facebook's Graph API version (`v24.0`)
so its endpoints match the mock's paths.

**Apple, Discord and Microsoft** have no Socialite driver. They all publish
OpenID Connect discovery, so the example uses the generic
[OpenID Connect driver](https://github.com/SocialiteProviders/OpenIDConnect)
from Socialite Providers. It reads the endpoints and signing keys from the
issuer and verifies the ID token's signature, issuer, audience, expiry and
nonce. Only the issuer changes for the mock:

```php
[$class, $issuer, $scopes] = match ($id) {
    'apple' => [OpenIDConnectProvider::class, $mock ? "$mock/apple" : 'https://appleid.apple.com', ['openid', 'email']],
    'discord' => [OpenIDConnectProvider::class, $mock ? "$mock/discord" : 'https://discord.com', ['openid', 'identify', 'email']],
    'microsoft' => [
        EntraProvider::class,
        ($mock ? "$mock/login.microsoftonline.com" : 'https://login.microsoftonline.com')."/$tenant/v2.0",
        ['openid', 'profile', 'email'],
    ],
};

$driver = $socialite->buildProvider($class, $config);
$driver->setConfig(new Config($config['client_id'], $config['client_secret'], $config['redirect'], [
    'base_url' => $issuer,
    'scopes' => $scopes,
    'tenant' => $tenant,
]));
```

- For Microsoft, use the driver's `entra` provider class, which handles
  multi-tenant issuers. With the mock, the example uses a concrete tenant ID so
  the issuer matches the ID token.
- The driver caches discovery documents and keys in Laravel's cache. The
  example has no database, so
  [`config/cache.php`](https://github.com/mockatoo/examples/blob/main/socialite-laravel/config/cache.php)
  keeps them in memory. Your app's usual cache store works.

Copy the paths and issuers for all eight providers from `Providers.php`.
Already have Socialite drivers? Keep them, and in development or CI point them
at the mock the same way.

## Sign in and read the user

[`routes/web.php`](https://github.com/mockatoo/examples/blob/main/socialite-laravel/routes/web.php)
uses the same two Socialite calls for every provider, real or mock (checks
trimmed):

```php
Route::post('/sign-in/{provider}', function (Request $request, string $provider) {
    return Socialite::driver($provider)->redirect();
});

$callback = function (Request $request, string $provider = 'apple') {
    $user = Socialite::driver($provider)->user();

    $request->session()->regenerate();
    $request->session()->put('profile', [
        'provider' => Providers::LABELS[$provider],
        'id' => (string) $user->getId(),
        'email' => $user->getEmail(),
    ]);

    return redirect('/', 303);
};
Route::get('/auth/{provider}/callback', $callback);
Route::post('/auth/apple/callback', $callback);
```

The example stores only the provider, account ID and email in an encrypted
cookie session, and discards the provider tokens.

## Handle provider differences

These settings match the real providers, so they belong in your app whether or
not you use the mock. The example handles them in `Providers.php`,
`bootstrap/app.php` and `config/session.php`:

| Provider | What Socialite needs |
| --- | --- |
| Apple | `response_mode=form_post` and the `openid email` scopes (Apple rejects `profile`), a CSRF-exempt `POST /auth/apple/callback`, and a `SameSite=None; Secure` session cookie |
| Discord | The `openid identify email` scopes. Its ID token has no email, so the driver reads it from userinfo |
| Microsoft | The tenant from `MICROSOFT_TENANT_ID` (default `common`). The `entra` provider reads the email from `preferred_username`, which needs the `profile` scope |

Apple's callback is a cross-site POST, so exempt it from CSRF in
[`bootstrap/app.php`](https://github.com/mockatoo/examples/blob/main/socialite-laravel/bootstrap/app.php).
The driver still validates the OAuth state and nonce:

```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->validateCsrfTokens(except: ['auth/apple/callback']);
})
```

See each provider's page, e.g. [Apple](providers/apple.md) or
[Microsoft](providers/microsoft.md), for its flow and known differences.

## Run it

```sh
pnpm install
pnpm build
printf 'APP_KEY=base64:%s\n' "$(openssl rand -base64 32)" > .env.local
pnpm dev
```

`pnpm build` runs `composer install`, and `pnpm dev` serves the app with
PHP's built-in server
([`package.json`](https://github.com/mockatoo/examples/blob/main/socialite-laravel/package.json)).
Open http://localhost:3000, pick a provider, and sign in with your dashboard
email and password. To sign in as another user, add a tag to the email, e.g.
`you+alice@example.com` (see [Email tags](email-tags.md)).

## Test with Playwright

To cover failures after setting up sign-in, see [OAuth failure testing](https://mockatoo.globalunderdog.com/learn/oauth-failure-testing).

The example tests the Laravel app with Playwright, which only needs a running
server. [`playwright.config.ts`](https://github.com/mockatoo/examples/blob/main/socialite-laravel/playwright.config.ts)
installs the app and starts it, or tests a deployment when
`PLAYWRIGHT_BASE_URL` is set:

```ts
const deployedURL = process.env.PLAYWRIGHT_BASE_URL;
const localURL = `http://localhost:${process.env.PORT || "3000"}`;

export default defineConfig({
	testDir: "./tests",
	use: { baseURL: deployedURL || localURL },
	webServer: deployedURL
		? undefined
		: { command: "pnpm build && pnpm start", url: localURL, timeout: 120000 },
});
```

[`tests/sign-in.spec.ts`](https://github.com/mockatoo/examples/blob/main/socialite-laravel/tests/sign-in.spec.ts)
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
tags and token refresh. Those tests work the same against a Laravel app.

## Run in CI

The example's
[workflow](https://github.com/mockatoo/examples/blob/main/.github/workflows/socialite-laravel.yml)
sets up PHP and Node.js, generates an app key, then runs the tests with the
credentials as secrets:

```yaml
- uses: shivammathur/setup-php@v2
  with:
    php-version: "8.3"
    extensions: mbstring, dom, curl, zip
    tools: composer:v2
- run: pnpm --dir socialite-laravel build
- name: Generate runtime secret
  run: echo "APP_KEY=base64:$(openssl rand -base64 32)" >> "$GITHUB_ENV"
- run: pnpm --dir socialite-laravel exec playwright install --with-deps chromium
- run: pnpm --dir socialite-laravel test
  env:
    MOCKATOO_TEST_EMAIL: ${{ secrets.MOCKATOO_TEST_EMAIL }}
    MOCKATOO_TEST_PASSWORD: ${{ secrets.MOCKATOO_TEST_PASSWORD }}
```

More in [Run in CI](ci.md).

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| The real provider's login page opens | The mock isn't on: set `MOCKATOO_FORCE=true` in `.env` or the environment |
| No sign-in buttons appear | Same cause: without the mock, the example hides providers that have no real credentials |
| `Set APP_KEY to a generated Laravel application key.` | Add `APP_KEY=base64:` and the output of `openssl rand -base64 32` to `.env.local` |
| Apple sign-in ends on `/?error=oauth` | Keep the CSRF exemption and the `SameSite=None; Secure` cookie for Apple, and use HTTPS or Chromium's localhost |
| Apple, Discord or Microsoft fails with a database error | The OpenID Connect driver needs a cache store. Without a database, set `CACHE_STORE=array` or `file` |
| A built-in driver fails after a Socialite upgrade | The driver calls an endpoint `UsesMockatoo` doesn't list: add its mock path in `Providers.php` |
| Login fails after a password change | Copy the new password from the dashboard into `.env.local` and your secrets |

## Next steps

- [All examples](https://github.com/mockatoo/examples): Laravel, Flask, Spring Boot, Auth.js, Better Auth, SvelteKit, Nuxt and Hono
- [Playwright](playwright.md) · [Email tags](email-tags.md) · [Account flow](account-flow.md) · [Run in CI](ci.md)
- Use Mockatoo only outside production, and never commit its credentials.
