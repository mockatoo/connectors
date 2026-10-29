# Mockatoo connectors

Open source connectors and documentation for [Mockatoo](https://mockatoo.globalunderdog.com). The connectors and documentation are MIT licensed. The hosted OAuth server is accessed at [https://app.mockatoo.globalunderdog.com](https://app.mockatoo.globalunderdog.com).

## Install

The npm packages have not been released yet. Install from GitHub with pnpm:

```sh
pnpm add @mockatoo/connectors@github:mockatoo/connectors#main
```

Import Better Auth helpers from `@mockatoo/connectors/better-auth`, or Auth.js
helpers from `@mockatoo/connectors/authjs`. These entry points export TypeScript
source; Next.js apps should add `@mockatoo/connectors` to `transpilePackages`.
The individual `@mockatoo/connect-better-auth` and `@mockatoo/connect-authjs`
packages remain available in this source tree for a future npm release.

For agent-assisted setup, discover the public skill with:

```sh
npx skills add mockatoo/connectors --skill mockatoo
```

See the [documentation](https://mockatoo.globalunderdog.com/docs), [Mockatoo skill](skills/mockatoo/SKILL.md), and [examples](https://github.com/mockatoo/examples) for setup instructions.
