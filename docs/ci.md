# Run in CI

Backing Test: [`public/examples/.github/workflows/ci.yml`](https://github.com/mockatoo/examples/blob/main/.github/workflows/ci.yml)

## Add Test Credentials as GitHub secrets

Create `MOCK_EMAIL` and `MOCK_PASSWORD` as repository or environment secrets in
GitHub. Use the email and password from your Mockatoo dashboard. The examples'
workflow passes those secrets to the Playwright tests and maps them to the
Cypress variable names:

```yaml
env:
  MOCK_EMAIL: ${{ secrets.MOCK_EMAIL }}
  MOCK_PASSWORD: ${{ secrets.MOCK_PASSWORD }}
```

## Workflow

Build the examples, install the browser dependencies, and run the Playwright
and Cypress tests. The Cypress binary is installed before the Cypress test:

```yaml
- run: pnpm build
- run: pnpm --dir cypress exec cypress install
- run: pnpm --dir authjs-next exec playwright install --with-deps chromium
- run: pnpm --dir authjs-next test
  env:
    MOCK_EMAIL: ${{ secrets.MOCK_EMAIL }}
    MOCK_PASSWORD: ${{ secrets.MOCK_PASSWORD }}
- run: pnpm --dir better-auth-next exec playwright install --with-deps chromium
- run: pnpm --dir better-auth-next test
  env:
    MOCK_EMAIL: ${{ secrets.MOCK_EMAIL }}
    MOCK_PASSWORD: ${{ secrets.MOCK_PASSWORD }}
- run: pnpm --dir better-auth-sveltekit exec playwright install --with-deps chromium
- run: pnpm --dir better-auth-sveltekit test
  env:
    MOCK_EMAIL: ${{ secrets.MOCK_EMAIL }}
    MOCK_PASSWORD: ${{ secrets.MOCK_PASSWORD }}
- run: pnpm --dir cypress test
  env:
    CYPRESS_MOCK_EMAIL: ${{ secrets.MOCK_EMAIL }}
    CYPRESS_MOCK_PASSWORD: ${{ secrets.MOCK_PASSWORD }}
```

These steps are copied from the [backing workflow](https://github.com/mockatoo/examples/blob/main/.github/workflows/ci.yml).

## Parallel workers

When running tests in parallel, give each worker a distinct tagged address:
`you+worker-1@example.com`, `you+worker-2@example.com`, and so on. Every
worker uses the base account's password. This keeps users and their app state
separate while preserving the same GitHub secrets setup.

See [Email tags](email-tags.md) for more ways to create distinct users.

## Regenerated password

Regenerating your Mockatoo password invalidates other password sessions. After
a regeneration, update the `MOCK_PASSWORD` GitHub secret before the next CI
run. The Cypress test receives that same updated value as
`CYPRESS_MOCK_PASSWORD`.
