---
description: "Mockatoo is a hosted OAuth provider for testing Google, GitHub, Apple and other social sign-in in CI, E2E tests and coding agents, with no bot checks."
---

# Mockatoo

A hosted OAuth provider for local development, CI, end-to-end browser tests, and coding agents. It mocks the sign-in flows of the major social providers with one shared client, so there is no app registration, reCAPTCHA, or bot detection, and headless browsers are accepted. The connectors for Better Auth and Auth.js are open source; the service is hosted.

Use Mockatoo only outside production. Select its connector behind a non-production check, and keep your test account's email and password in environment variables or CI secrets, never in source control.

## Guides

- [Account flow](account-flow.md): Sign-up, login, sessions, password regeneration, consent, and the stable form labels
- [Email tags](email-tags.md): Sign in as other users with `you+<tag>@example.com`, and the tags that trigger edge cases
- [Playwright](playwright.md): Sign in from Playwright with every provider, a fresh user per test, edge-case tags, and token refresh
- [Cypress](cypress.md): Sign in from Cypress with `cy.origin`, cached sessions, every provider, and edge-case tags
- [Selenium](selenium.md): Sign in with Selenium WebDriver, restore sessions, and test all eight providers and edge-case tags
- [Spring Boot](spring-boot.md): Point Spring Security's OAuth2 client at the mock with a Spring profile, no connector needed
- [Flask](flask.md): Point Authlib's Flask clients at the mock with one switch, no connector needed
- [Laravel](laravel.md): Point Laravel Socialite's drivers at the mock with one switch, no connector needed
- [Django](django.md): Point django-allauth's providers at the mock with small subclasses, no connector needed
- [Nuxt](nuxt.md): Run Auth.js in a Nitro server route and swap each provider for its Mockatoo helper
- [SvelteKit](sveltekit.md): Gate Better Auth or Auth.js on `dev`, or start a new app with `npx sv add @mockatoo`
- [Remix](remix.md): Run Auth.js in a resource route and sign in with plain HTML forms
- [Run in CI](ci.md): GitHub Actions secrets, workflow, and parallel workers

## Failure testing

- [Apple boolean claims as strings](failure-testing/strings.md): Test string boolean claims with `you+strings@example.com`
- [Apple private relay address](failure-testing/hidden.md): Test Hide My Email with `you+hidden@example.com`
- [Changed provider email](failure-testing/renamed.md): Test changed email with `you+renamed@example.com`
- [First name without family name](failure-testing/firstname.md): Test missing family name with `you+firstname@example.com`
- [Google Workspace account](failure-testing/hd.md): Test Workspace domain claim with `you+hd@example.com`
- [Intermittent token endpoint failure](failure-testing/flaky.md): Test OAuth 503 retry with `you+flaky@example.com`
- [Microsoft guest account](failure-testing/guest.md): Test guest account with `you+guest@example.com`
- [Microsoft refresh requires MFA](failure-testing/mfa.md): Test AADSTS50076 with `you+mfa@example.com`
- [Microsoft token refresh throttled](failure-testing/throttled.md): Test 429 Too Many Requests with `you+throttled@example.com`
- [Microsoft user outside the tenant](failure-testing/outsider.md): Test AADSTS50020 with `you+outsider@example.com`
- [Missing profile name](failure-testing/noname.md): Test missing name with `you+noname@example.com`
- [Missing profile photo](failure-testing/nophoto.md): Test missing profile photo with `you+nophoto@example.com`
- [Personal Microsoft account](failure-testing/personal.md): Test personal account with `you+personal@example.com`
- [Private GitHub email](failure-testing/private.md): Test email null with `you+private@example.com`
- [Provider account without email](failure-testing/noemail.md): Test missing email with `you+noemail@example.com`
- [Provider admin policy blocks sign-in](failure-testing/blocked.md): Test admin_policy_enforced with `you+blocked@example.com`
- [Rejected authorization code](failure-testing/badcode.md): Make the code exchange fail with each provider's `invalid_grant` error, using `you+badcode@example.com`
- [Returning provider account](failure-testing/returning.md): Test returning user with `you+returning@example.com`
- [Revoked provider access](failure-testing/revoked.md): Test refresh token invalid_grant with `you+revoked@example.com`
- [Slow token endpoint](failure-testing/slow.md): Test OAuth timeout with `you+slow@example.com`
- [Token endpoint outage](failure-testing/down.md): Test OAuth 503 with `you+down@example.com`
- [Unverified email address](failure-testing/unverified.md): Test email_verified false with `you+unverified@example.com`

## Providers

- [Google](providers/google.md): Implemented flow, test addresses, and known differences
- [Microsoft](providers/microsoft.md): Implemented flow, tenants, test addresses, and known differences
- [GitHub](providers/github.md): Implemented flow, test addresses, and known differences
- [Apple](providers/apple.md): Implemented flow, test addresses, and known differences
- [Discord](providers/discord.md): Implemented flow, test addresses, and known differences
- [LinkedIn](providers/linkedin.md): Implemented flow, test addresses, and known differences
- [X](providers/x.md): Implemented flow, test addresses, and known differences
- [Facebook](providers/facebook.md): Implemented flow, test addresses, and known differences

Each provider page includes its test addresses and known differences. See
[Email tags](email-tags.md) for how tagged addresses work.
