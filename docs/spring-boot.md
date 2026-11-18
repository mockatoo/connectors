---
description: "Test Google, GitHub, Apple and other OAuth sign-in in Spring Boot with Mockatoo: a Spring profile for Spring Security's OAuth2 client, Playwright tests and CI."
---

# Spring Boot

Sign in through OAuth in a Spring Boot app, locally and in CI, with any of the
eight providers Mockatoo mocks.

There is no connector package for Spring. You don't need one: Spring Security's
OAuth2 client reads every provider endpoint from configuration, so a Spring
profile that points those endpoints at the mock does the connector's job.

**Example on GitHub:** [`mockatoo/examples/spring-security-spring-boot`](https://github.com/mockatoo/examples/tree/main/spring-security-spring-boot).

## How it works

1. Your app's sign-in button goes to Spring's
   `/oauth2/authorization/{registrationId}`, which redirects to the mock on
   the provider's real paths: `accounts.google.com/o/oauth2/v2/auth` becomes
   `app.mockatoo.globalunderdog.com/google/o/oauth2/v2/auth`.
2. You (or a test) fill in the login page and click **Authorize**.
3. The mock redirects back to `/login/oauth2/code/{registrationId}`. Spring
   exchanges the code for provider-shaped tokens and validates the signed ID
   token, as it would in production.

Your registrations, scopes and callbacks don't change. Only the client
credentials and the provider URLs do, and only in the `mockatoo` profile.

## Prerequisites

- **Java 21 and Maven**, with `spring-boot-starter-security-oauth2-client`
  ([`pom.xml`](https://github.com/mockatoo/examples/blob/main/spring-security-spring-boot/pom.xml)).
- **A Mockatoo test account.** Sign up at
  [app.mockatoo.globalunderdog.com](https://app.mockatoo.globalunderdog.com),
  then copy the email and password from the dashboard.

## Register the real providers

Keep the production registrations in
[`application.yml`](https://github.com/mockatoo/examples/blob/main/spring-security-spring-boot/src/main/resources/application.yml),
one Spring profile per provider, so you enable only the ones you configure:

```yaml
spring:
  profiles:
    default: google
    group:
      mockatoo: [google, microsoft, github, apple, discord, linkedin, x, facebook]

---
spring:
  config.activate.on-profile: google
  security.oauth2.client.registration.google:
    client-id: ${GOOGLE_CLIENT_ID}
    client-secret: ${GOOGLE_CLIENT_SECRET}
    client-name: Google
    scope: [openid, profile, email]
```

- The `mockatoo` group turns on all eight provider profiles at once.
- Spring knows Google, GitHub and Facebook. Declare the others' endpoints
  yourself, as the example does for Discord, LinkedIn, X, Microsoft and Apple.

## Point them at the mock

[`application-mockatoo.yml`](https://github.com/mockatoo/examples/blob/main/spring-security-spring-boot/src/main/resources/application-mockatoo.yml)
overrides only the client credentials and the provider URLs:

```yaml
mockatoo.origin: ${MOCKATOO_URL:https://app.mockatoo.globalunderdog.com}

spring:
  security.oauth2.client:
    registration:
      google: &mock-client
        client-id: mockatoo
        client-secret: mockatoo-secret
      github: *mock-client
      # …the same for the other six
    provider:
      # OpenID Connect providers: swap the issuer.
      google:
        issuer-uri: ${mockatoo.origin}/google
      # OAuth-only providers: swap the three endpoints.
      github:
        authorization-uri: ${mockatoo.origin}/github/login/oauth/authorize
        token-uri: ${mockatoo.origin}/github/login/oauth/access_token
        user-info-uri: ${mockatoo.origin}/github/api/v3/user
```

- `mockatoo` / `mockatoo-secret` is the shared client. It accepts any
  `http(s)` callback, so localhost and preview URLs need no provider setup.
- For Google, Microsoft, Apple and LinkedIn, Spring fetches discovery and
  signing keys from the mock's issuer. For GitHub, Discord, X and Facebook,
  the file lists the mock's paths. Copy the URLs for all eight from the file.
- Microsoft takes any tenant ID. Use a concrete one, as the example does, so
  the issuer matches the ID token.
- Activate the profile only outside production. Never ship it.

## Handle provider differences

These settings match the real providers, so they belong in your app whether or
not you use the mock.
[`ExampleApplication.java`](https://github.com/mockatoo/examples/blob/main/spring-security-spring-boot/src/main/java/com/mockatoo/example/ExampleApplication.java)
configures them on `oauth2Login`:

| Provider | What Spring needs |
| --- | --- |
| Apple | `response_mode=form_post`, no PKCE, a CSRF exception for `POST /login/oauth2/code/apple`, and a `SameSite=None; Secure` session cookie |
| LinkedIn | No PKCE and no `nonce`: its web flow doesn't support them |
| X | A user-info converter that unwraps the profile from `data` |
| Discord, X | `user-name-attribute: id` |

The authorization request customizer, from the example:

```java
resolver.setAuthorizationRequestCustomizer(request -> {
    String provider = request.build().getAttribute(OAuth2ParameterNames.REGISTRATION_ID);
    if ("apple".equals(provider) || "linkedin".equals(provider)) {
        // These web flows do not support PKCE.
        request.attributes(attributes -> attributes.remove(PkceParameterNames.CODE_VERIFIER));
        request.additionalParameters(parameters -> {
            parameters.remove(PkceParameterNames.CODE_CHALLENGE);
            parameters.remove(PkceParameterNames.CODE_CHALLENGE_METHOD);
        });
    }
    if ("apple".equals(provider)) {
        request.additionalParameters(parameters -> parameters.put("response_mode", "form_post"));
    }
    if ("linkedin".equals(provider)) {
        request.attributes(attributes -> attributes.remove(OidcParameterNames.NONCE));
        request.additionalParameters(parameters -> parameters.remove(OidcParameterNames.NONCE));
    }
});
```

See each provider's page, e.g. [Apple](providers/apple.md) or
[LinkedIn](providers/linkedin.md), for its flow and known differences.

## Run it

```sh
mvn spring-boot:run -Dspring-boot.run.profiles=mockatoo
```

Open http://localhost:8080, pick a provider, and sign in with your dashboard
email and password. To sign in as another user, add a tag to the email, e.g.
`you+alice@example.com` (see [Email tags](email-tags.md)).

## Test with Playwright

The example tests the Spring app with Playwright, which only needs a running
server. [`playwright.config.ts`](https://github.com/mockatoo/examples/blob/main/spring-security-spring-boot/playwright.config.ts)
builds the JAR and starts it with the `mockatoo` profile:

```ts
export default defineConfig({
	testDir: "./tests",
	use: { baseURL: "http://localhost:8080" },
	webServer: {
		command: "pnpm build && pnpm start",
		env: { PORT: "8080", SPRING_PROFILES_ACTIVE: "mockatoo" },
		url: "http://localhost:8080",
		timeout: 120000,
		reuseExistingServer: false,
	},
});
```

`pnpm build` runs `mvn -B package` and `pnpm start` runs the JAR
([`package.json`](https://github.com/mockatoo/examples/blob/main/spring-security-spring-boot/package.json)).
[`tests/sign-in.spec.ts`](https://github.com/mockatoo/examples/blob/main/spring-security-spring-boot/tests/sign-in.spec.ts)
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

Set `MOCKATOO_TEST_EMAIL` and `MOCKATOO_TEST_PASSWORD` in the environment or
a git-ignored `.env.local`, then run:

```sh
pnpm install
pnpm exec playwright install chromium
pnpm test
```

The [Playwright guide](playwright.md) covers fresh users per test, edge-case
tags and token refresh. Those tests work the same against a Spring app.

## Run in CI

The example's
[workflow](https://github.com/mockatoo/examples/blob/main/.github/workflows/spring-security-spring-boot.yml)
sets up Java and Node.js, then runs the tests with the credentials as secrets:

```yaml
- uses: actions/setup-java@v4
  with:
    distribution: temurin
    java-version: "21"
    cache: maven
- run: pnpm --dir spring-security-spring-boot exec playwright install --with-deps chromium
- run: pnpm --dir spring-security-spring-boot test
  env:
    MOCKATOO_TEST_EMAIL: ${{ secrets.MOCKATOO_TEST_EMAIL }}
    MOCKATOO_TEST_PASSWORD: ${{ secrets.MOCKATOO_TEST_PASSWORD }}
```

More in [Run in CI](ci.md).

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| The real provider's login page opens | The `mockatoo` profile isn't active: pass `-Dspring-boot.run.profiles=mockatoo` or set `SPRING_PROFILES_ACTIVE=mockatoo` |
| `Could not resolve placeholder 'GOOGLE_CLIENT_ID'` | Same cause: without the `mockatoo` profile, Spring expects the real credentials |
| Apple sign-in ends on `/?error` | Keep the CSRF exception and the `SameSite=None; Secure` session cookie for Apple |
| LinkedIn sign-in ends on `/?error` | Remove PKCE and `nonce` for LinkedIn ([above](#handle-provider-differences)) |
| Login fails after a password change | Copy the new password from the dashboard into `.env.local` and your secrets |

## Next steps

- [All examples](https://github.com/mockatoo/examples): Spring Boot, Flask, Laravel, Django, Auth.js, Better Auth, SvelteKit, Nuxt and Hono
- [Playwright](playwright.md) · [Email tags](email-tags.md) · [Account flow](account-flow.md) · [Run in CI](ci.md)
- Use Mockatoo only outside production, and never commit its credentials.
