---
description: "Run OAuth sign-in tests in GitHub Actions with Mockatoo: store the test credentials as secrets, add the workflow, and give parallel workers separate users."
---

# Run in CI

## Add Test Credentials as GitHub secrets

Create `MOCKATOO_TEST_EMAIL` and `MOCKATOO_TEST_PASSWORD` as repository or environment secrets in
GitHub. Use the email and password from your Mockatoo dashboard. The Playwright
workflow passes those secrets to the tests as they are, and the Cypress workflow
maps them to the `CYPRESS_` names ([below](#workflow)):

```yaml
env:
  MOCKATOO_TEST_EMAIL: ${{ secrets.MOCKATOO_TEST_EMAIL }}
  MOCKATOO_TEST_PASSWORD: ${{ secrets.MOCKATOO_TEST_PASSWORD }}
```

## Workflow

The [Playwright workflow](https://github.com/mockatoo/examples/blob/main/.github/workflows/better-auth-next.yml) just installs the browser dependencies and runs the Playwright tests:

```yaml
- run: pnpm --dir better-auth-next exec playwright install --with-deps chromium
- run: pnpm --dir better-auth-next test
  env:
    MOCKATOO_TEST_EMAIL: ${{ secrets.MOCKATOO_TEST_EMAIL }}
    MOCKATOO_TEST_PASSWORD: ${{ secrets.MOCKATOO_TEST_PASSWORD }}
```

The [Cypress workflow](https://github.com/mockatoo/examples/blob/main/.github/workflows/cypress.yml) installs the Cypress binary,
then runs the test, which serves the app through a local HTTPS proxy so that
Secure cookies survive the OAuth redirect:

```yaml
- run: pnpm --dir cypress exec cypress install
- run: pnpm --dir cypress test
  env:
    CYPRESS_MOCKATOO_TEST_EMAIL: ${{ secrets.MOCKATOO_TEST_EMAIL }}
    CYPRESS_MOCKATOO_TEST_PASSWORD: ${{ secrets.MOCKATOO_TEST_PASSWORD }}
```

## Parallel workers

When running tests in parallel, give each worker a distinct tagged address:
`you+worker-1@example.com`, `you+worker-2@example.com`, and so on. Every
worker uses the base account's password. This keeps users and their app state
separate while preserving the same GitHub secrets setup.

See [Email tags](email-tags.md) for more ways to create distinct users.

## Regenerated password

Regenerating your Mockatoo password invalidates other password sessions. After
a regeneration, update the `MOCKATOO_TEST_PASSWORD` GitHub secret before the next CI
run. The Cypress test receives that same updated value as
`CYPRESS_MOCKATOO_TEST_PASSWORD`.
