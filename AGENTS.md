# Repository guide

This repository contains the public mockatoo connectors, examples, and documentation. The hosted oauth server is accessed in [https://app.mockatoo.globalunderdog.com](https://app.mockatoo.globalunderdog.com).

- Use pnpm 10 and Node.js 24.
- Run `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm docs:check` before proposing changes.
- Keep imports and links inside this repository.
- Keep tests focused on the public connector API.
- Only copy / overwrite adapter code when absolutely necessary.
