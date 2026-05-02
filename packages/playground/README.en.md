# @viewfly/playground

**Languages:** [简体中文](./README.md)

Local **demo app** in this monorepo: depends on workspace **`@viewfly/core`**, **`@viewfly/platform-browser`**, **`@viewfly/router`** for manual verification during framework development. **Not published to npm** (`private: true`).

---

## When you need it

- You cloned [viewfly](https://github.com/viewfly/viewfly) and want a quick Vite + Viewfly page for experiments or debugging.
- You’re sending a PR and need to exercise the stack under a real bundler.

For production apps, scaffold with **`@viewfly/cli`** instead — you don’t need this package.

---

## Run

From the repo root after install:

```bash
pnpm install
pnpm dev
```

Same as `pnpm --filter @viewfly/playground dev` — dev server URL is printed in the terminal.

Build & preview:

```bash
pnpm run build:playground
pnpm run preview:playground
```

---

## Docs

Use <https://viewfly.org>, each **`@viewfly/*` README**, and installed typings for application work.

---

## License

Same as the root repo (MIT).
