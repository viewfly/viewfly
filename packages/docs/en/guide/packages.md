# npm packages

Rough order of adoption:

| Package | Role |
|---------|------|
| [@viewfly/core](https://www.npmjs.com/package/@viewfly/core) | Core: components, reactivity, `signal`, JSX runtime, lifecycle, `inject`, etc. |
| [@viewfly/platform-browser](https://www.npmjs.com/package/@viewfly/platform-browser) | Browser: `createApp`, mount, destroy. |
| [@viewfly/router](https://www.npmjs.com/package/@viewfly/router) | Routing: `RouterModule`, `Link`, `RouterOutlet`, etc. |
| [@viewfly/devtools](https://www.npmjs.com/package/@viewfly/devtools) | Build: `*.scoped.*` styles with Vite / Rollup / Webpack; on the **Vite dev server**, a **Viewfly component HMR** plugin (not loaded for production builds). |
| [@viewfly/cli](https://www.npmjs.com/package/@viewfly/cli) | CLI: Vite + TypeScript project templates. |

Router and scoped CSS are optional. Scoped CSS needs **`@viewfly/core`** (e.g. `withMark`) **and** **`@viewfly/devtools`**. The official **Vite** template from the CLI installs **`@viewfly/devtools`** and enables **HMR** by default; in your own setup, follow the **@viewfly/devtools** readme on npm to wire **`vite-viewfly-hmr-plugin`**.

## Next steps

- [FAQ](./faq.md)
