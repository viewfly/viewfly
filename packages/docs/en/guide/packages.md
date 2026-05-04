# npm packages

Rough order of adoption:

| Package | Role |
|---------|------|
| [@viewfly/core](https://www.npmjs.com/package/@viewfly/core) | Core: components, reactivity, `signal`, JSX runtime, lifecycle, `inject`, etc. |
| [@viewfly/platform-browser](https://www.npmjs.com/package/@viewfly/platform-browser) | Browser: `createApp`, mount, destroy. |
| [@viewfly/router](https://www.npmjs.com/package/@viewfly/router) | Routing: `RouterModule`, `Link`, `RouterOutlet`, etc. |
| [@viewfly/devtools](https://www.npmjs.com/package/@viewfly/devtools) | Build: `*.scoped.*` styles with Vite / Rollup / Webpack. |
| [@viewfly/cli](https://www.npmjs.com/package/@viewfly/cli) | CLI: Vite + TypeScript project templates. |

Router and scoped CSS are optional. Scoped CSS needs **`@viewfly/core`** (e.g. `withMark`) **and** **`@viewfly/devtools`**.

## Next steps

- [FAQ](./faq.md)
