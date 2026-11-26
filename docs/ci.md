---
description: "Run OAuth sign-in tests in GitHub Actions with Mockatoo: store the test credentials as secrets, add the workflow, and give parallel workers separate users."
title: "Run OAuth login tests in GitHub Actions CI · Mockatoo"
datePublished: 2026-11-05
lastModified: 2026-11-26
tested:
  better-auth-next: ["@playwright/test@1.64.1", cypress@16.2.0, selenium-webdriver@4.53.0]
  authjs-next: ["@playwright/test@1.64.1", cypress@16.2.0, selenium-webdriver@4.53.0]
---

# Run in CI

## Add Test Credentials as GitHub secrets

Create `MOCKATOO_TEST_EMAIL` and `MOCKATOO_TEST_PASSWORD` as repository or environment secrets in
GitHub. Use the email and password from your Mockatoo dashboard. The Next.js examples use the same two environment variables in Playwright, Cypress,
and Selenium.

```yaml
env:
  MOCKATOO_TEST_EMAIL: ${{ secrets.MOCKATOO_TEST_EMAIL }}
  MOCKATOO_TEST_PASSWORD: ${{ secrets.MOCKATOO_TEST_PASSWORD }}
```

## Workflow

The [Better Auth + Next.js](https://github.com/mockatoo/examples/blob/main/.github/workflows/better-auth-next.yml) and [Auth.js + Next.js](https://github.com/mockatoo/examples/blob/main/.github/workflows/authjs-next.yml) workflows each run their example with all three runners. For Playwright, install Chromium before running the tests.

```yaml
- run: pnpm --dir better-auth-next exec playwright install --with-deps chromium
- run: pnpm --dir better-auth-next test
  env:
    MOCKATOO_TEST_EMAIL: ${{ secrets.MOCKATOO_TEST_EMAIL }}
    MOCKATOO_TEST_PASSWORD: ${{ secrets.MOCKATOO_TEST_PASSWORD }}
```

Install the Cypress binary before running its tests. The test command serves the app through a local HTTPS proxy so Secure cookies survive the OAuth redirect.

```yaml
- run: pnpm --dir better-auth-next exec cypress install
- run: pnpm --dir better-auth-next test:cypress
  env:
    MOCKATOO_TEST_EMAIL: ${{ secrets.MOCKATOO_TEST_EMAIL }}
    MOCKATOO_TEST_PASSWORD: ${{ secrets.MOCKATOO_TEST_PASSWORD }}
```

For [Selenium](selenium.md), run `pnpm --dir better-auth-next test:selenium` with the same environment variables. The workflow uses Chrome on the Ubuntu runner, and Selenium Manager resolves ChromeDriver.

## Parallel workers

When running tests in parallel, give each worker a distinct tagged address:
`you+worker-1@example.com`, `you+worker-2@example.com`, and so on. Every
worker uses the base account's password. This keeps users and their app state
separate while preserving the same GitHub secrets setup.

See [Email tags](email-tags.md) for more ways to create distinct users. To test provider errors in CI, choose a case from [OAuth failure testing](https://mockatoo.globalunderdog.com/learn/oauth-failure-testing). If sign-in passes locally and fails in CI, [why OAuth E2E tests are flaky](https://mockatoo.globalunderdog.com/learn/why-oauth-e2e-tests-are-flaky) covers the causes and the fix for each. To let a coding agent run the same sign-in test while it builds, see [let your coding agent sign in](https://mockatoo.globalunderdog.com/learn/coding-agent-sign-in).

## Regenerated password

Regenerating your Mockatoo password invalidates other password sessions. After
a regeneration, update the `MOCKATOO_TEST_PASSWORD` GitHub secret before the next CI
run.
