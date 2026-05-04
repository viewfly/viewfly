# @viewfly/cli

**Languages:** [简体中文](./README.md)

Command-line scaffolding for **Viewfly** apps: generate a **Vite** + TypeScript project locally, optionally wiring **@viewfly/router** and **scoped CSS** (via `@viewfly/devtools`’ Vite plugin).

---

## Contents

- [Use cases](#use-cases)
- [Install](#install)
- [Quick start](#quick-start)
- [Commands & flags](#commands--flags)
- [Interactive wizard](#interactive-wizard)
- [Optional features](#optional-features)
- [What’s in the template](#whats-in-the-template)
- [FAQ & troubleshooting](#faq--troubleshooting)
- [Links & feedback](#links--feedback)

---

## Use cases

- Bootstrap a minimal runnable Viewfly + Vite frontend project.
- Pass template/features/package manager on one line for scripts or CI.
- Non-interactive project generation in CI.

---

## Install

### Global (day-to-day)

```bash
npm install -g @viewfly/cli
```

Global binary: **`viewfly`** (see `package.json` → `bin`).

### Without global install — `npx`

```bash
npx @viewfly/cli create my-app
```

---

## Quick start

```bash
viewfly create my-viewfly-app
# alias
viewfly new my-viewfly-app
```

Follow prompts for optional features, package manager, and whether to install dependencies. Then:

```bash
cd my-viewfly-app
npm run dev    # or pnpm dev / yarn dev depending on choice
```

CLI version:

```bash
viewfly --version
# or
viewfly -v
```

Top-level help:

```bash
viewfly --help
```

Subcommand help:

```bash
viewfly create --help
```

---

## Commands & flags

### `viewfly create <name>` / `viewfly new <name>`

Creates a subdirectory **`<name>`** under the **current working directory** and copies the template into it.

| Option | Description |
|--------|-------------|
| `-t, --template <template>` | Template id. Currently only **`vite`** (default). Invalid values fall back to interactive selection (still only `vite`). |
| `-f, --features <features>` | Comma-separated extras — see [Optional features](#optional-features). Allowed: `router`, `scoped-css`. Omit for multi-select prompt. |
| `--pm <packageManager>` | `pnpm` \| `npm` \| `yarn`. Omit for prompt. |
| `--install` | Run dependency install **immediately** after create. |
| `--no-install` | **Skip** install (still prints `cd` + manual install hints). |
| *(no install flags)* | Prompt “install now?” — default yes. |

**Behavior (matches source):**

- **`<name>` required** — missing name errors out.
- **Target directory must not exist** — refuses to overwrite `./<name>`.
- **CI example:**

  ```bash
  viewfly create my-app \
    --template vite \
    --features router,scoped-css \
    --pm pnpm \
    --install
  ```

---

## Interactive wizard

When a value isn’t passed via flags, [@inquirer/prompts](https://github.com/SBoudrias/Inquirer.js) asks for:

1. **Template** — currently only `vite`.
2. **Optional features** — `router`, `scoped-css` (multi-select).
3. **Package manager** — `pnpm` / `npm` / `yarn`.
4. **Install dependencies now?** — defaults to yes.

Providing a flag skips the matching question (e.g. `--features` skips the feature prompt).

---

## Optional features

### `router`

- Adds **`@viewfly/router`** to generated `package.json` `dependencies` (same major line as other Viewfly deps in the template, e.g. `^3.0.0`).
- Rewrites `src/main.tsx`: still uses `createApp`; `App` copy hints that Router is enabled so you can wire routes yourself.

> The CLI **does not** generate route tables or file structure—only dependency + hint text.

### `scoped-css`

- Adds **`@viewfly/devtools`** to `devDependencies` (e.g. `^3.0.0` in the template).
- Adds sample `src/app.scoped.scss`.
- Rewrites `src/main.tsx` to `import './app.scoped.scss'` instead of default `./style.css`.
- Rewrites `vite.config.ts` to register `@viewfly/devtools/vite-scoped-css-plugin`.

You can pass **`router,scoped-css`** together — effects stack.

---

## What’s in the template

Template lives in **`templates/base-vite`** and is published via `package.json` → `files`.

- **Tooling:** Vite 8, TypeScript 5.8.
- **Runtime deps:** `@viewfly/core`, `@viewfly/platform-browser` (aligned with CLI release line, e.g. `^3.0.0`).
- **Placeholder:** generated `package.json` `name` is **`__PROJECT_NAME__`**, replaced with `<name>` during create.
- **Entry:** `src/main.tsx` + `index.html`, JSX-style Viewfly components.
- **Scripts:** standard Vite `dev` / `build` / `preview`.

Without `scoped-css`, default global styles come from `src/style.css`. With `scoped-css`, `app.scoped.scss` + the Vite plugin own the styling entry.

---

## FAQ & troubleshooting

### `target directory already exists`

Overwrites are **not** allowed. Pick another name or remove/rename the folder.

### Dependency install failed

With `--install` or choosing install in the wizard, a non-zero exit from `pnpm` / `npm` / `yarn` throws. Check:

- package manager installed;
- network / registry;
- Node version meets Vite + Viewfly expectations.

Use `--no-install` and debug manually inside the project.

### Windows

Install subprocess uses `shell: true` — `pnpm install` / `npm install` / `yarn` generally work.

### Clear screen & ASCII banner

The CLI clears the terminal and prints a figlet banner on start; CI logs may look noisy—that’s expected.

---

## Links & feedback

- Site: <https://viewfly.org>
- Repo: <https://github.com/viewfly/viewfly>
- Issues: <https://github.com/viewfly/viewfly/issues>

---

## License

MIT (see `LICENSE` in the repo).
