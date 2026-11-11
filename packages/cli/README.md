<p align="center">
  <img src="../../mockatoo-logo.png" alt="Mockatoo" width="128" height="128">
</p>

<h1 align="center">Mockatoo</h1>

<p align="center">
  <strong>Test Google, GitHub and Apple sign-in in CI, without getting blocked.</strong>
</p>

<p align="center">
  OAuth testing for the agentic era: one provider for development, E2E tests, CI, and the agents that write them.
</p>

<p align="center">
  <a href="https://github.com/mockatoo/connectors/actions/workflows/ci.yml"><img src="https://github.com/mockatoo/connectors/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

<p align="center">
  <a href="https://mockatoo.globalunderdog.com">Website</a> ·
  <a href="https://mockatoo.globalunderdog.com/docs">Documentation</a> ·
  <a href="https://github.com/mockatoo/connectors">Connectors</a> ·
  <a href="https://app.mockatoo.globalunderdog.com">Create a test account</a>
</p>

# mockatoo

Set up Mockatoo test sign-in in an app. `init` installs the matching connector
(`@mockatoo/connect-better-auth` or `@mockatoo/connect-authjs`), then `login`
writes a test account's `MOCK_EMAIL` and `MOCK_PASSWORD` to `.env.local`.

```sh
npx -y mockatoo@latest init
```

Under a coding agent (no terminal), the command prints a sign-in link and exits.
After signing in, the page shows a login code (`mka_…`). Paste it into the terminal, or run:

```sh
npx -y mockatoo@latest login mka_…
```

Options: `-e, --env-file <path>` picks the env file (default `.env.local`).
`--framework better-auth|authjs` is needed when the app uses both or neither.

Set `MOCKATOO_URL` to use a local Mockatoo.

Production code must not use Mockatoo. Keep the connector behind a non-production check.
