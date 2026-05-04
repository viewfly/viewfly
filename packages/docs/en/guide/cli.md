# CLI

**`@viewfly/cli`** scaffolds Viewfly projects on **Vite** + **TypeScript**. Optional features (e.g. scoped styles) and generated files depend on the **CLI** version you run.

## Flags

- `--template <name>` — template id (commonly `vite`).
- `--features <list>` — comma-separated extras (e.g. `router,scoped-css`).
- `--pm <pnpm|npm|yarn>` — package manager.
- `--install` — install dependencies after create.

## Usage

```bash
npm install -g @viewfly/cli
viewfly create my-app
```

Or without a global install:

```bash
npx @viewfly/cli create my-app
```

Non-interactive (scripts / CI):

```bash
npx @viewfly/cli create my-app \
  --template vite \
  --features router,scoped-css \
  --pm pnpm \
  --install
```

`cd` into the project, install if needed, then start the dev server (often `npm run dev`).

## Troubleshooting

- **Command not found** — with global install, ensure the global bin is on `PATH`; otherwise use `npx @viewfly/cli create my-app`.
- **Global install permission errors** — avoid forced elevation; prefer `npx`, `pnpm dlx`, or `yarn dlx`.
- **Dependencies missing** — you skipped `--install` or declined auto-install; run `npm install` / `pnpm install` / `yarn` in the project.

## More

Full options and template layout: **[@viewfly/cli](https://www.npmjs.com/package/@viewfly/cli)** on npm.

## Next steps

- [Installation](./installation.md)
- [Quick start](./quick-start.md)
- [npm packages](./packages.md)
