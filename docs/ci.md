---
description: "Run OAuth sign-in tests in GitHub Actions with Mockatoo: store the test credentials as secrets, add the workflow, and give parallel workers separate users."
title: "Run OAuth login tests in GitHub Actions CI · Mockatoo"
datePublished: 2026-11-05
lastModified: 2026-11-24
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

The [Next.js workflow](https://github.com/mockatoo/examples/blob/main/.github/workflows/nextjs.yml) runs both the Better Auth and Auth.js examples with all three runners. For Playwright, install Chromium before running the tests.

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

See [Email tags](email-tags.md) for more ways to create distinct users. To test provider errors in CI, choose a case from [OAuth failure testing](https://mockatoo.globalunderdog.com/learn/oauth-failure-testing).

## Regenerated password

Regenerating your Mockatoo password invalidates other password sessions. After
a regeneration, update the `MOCKATOO_TEST_PASSWORD` GitHub secret before the next CI
run.
