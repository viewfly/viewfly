# Quick start

This page does one thing: scaffold and run your first Viewfly app with the official CLI.

## Try it quickly

If you already finished [Installation](./installation.md), follow the steps below to see the first screen.

## Create a Viewfly app

Open a terminal in the folder where you want the project, then run the create command.

### Using the CLI

`@viewfly/cli` creates a project in the current directory from a template. Here is the no-global-install flow:

::: code-group

```bash [npm]
npx @viewfly/cli create my-app
```

```bash [pnpm]
pnpm dlx @viewfly/cli create my-app
```

```bash [yarn]
yarn dlx @viewfly/cli create my-app
```

```bash [bun]
bun x @viewfly/cli create my-app
```

:::

If you do not pass flags, the wizard asks for template, optional features, package manager, and whether to install dependencies—press Enter to accept defaults when unsure.

**Non-interactive (scripts or CI)** example:

```bash
npx @viewfly/cli create my-app \
  --template vite \
  --features router,scoped-css \
  --pm pnpm \
  --install
```

When it finishes, `cd` into the project. If dependencies were **not** installed for you, install them, then start the dev server:

::: code-group

```bash [npm]
cd my-app
npm install
npm run dev
```

```bash [pnpm]
cd my-app
pnpm install
pnpm dev
```

```bash [yarn]
cd my-app
yarn
yarn dev
```

```bash [bun]
cd my-app
bun install
bun run dev
```

:::

The terminal prints a local URL (often `http://localhost:5173`); open it in the browser to see the app.

### Production build

When you are ready to ship, from the project root run:

::: code-group

```bash [npm]
npm run build
```

```bash [pnpm]
pnpm build
```

```bash [yarn]
yarn build
```

```bash [bun]
bun run build
```

:::

Output usually lands in **`dist/`**, produced by **Vite**. How you deploy depends on your host or backend—out of scope here.

### Tips

- The template already includes baseline TypeScript / JSX settings.
- If you use decorator-based DI, follow [Installation](./installation.md) to wire up metadata in the build pipeline.

## What the entry looks like

The scaffolded **`src/main.tsx`** will look roughly like below (exact code follows the template): **`createApp`** mounts the root component onto the container in **`index.html`**.

```tsx
import { createApp } from '@viewfly/platform-browser'
import { App } from './app'

createApp(<App />).mount(document.getElementById('app')!)
```

The app entry uses `createApp` to attach the root component to `#app`. See [Creating an application](./essentials-application.md) for the full lifecycle and common patterns.

## Next steps

- [Creating an application](./essentials-application.md)
- [JSX & components](./essentials-components.md)
- [Reactivity](./essentials-reactivity.md)
- [CLI & tooling](./cli.md)
