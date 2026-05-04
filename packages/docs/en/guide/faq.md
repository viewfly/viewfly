# FAQ

## JSX errors or `jsxImportSource` not pointing at Viewfly

In `tsconfig.json`, set **`jsx`** to **`react-jsx`** and **`jsxImportSource`** to **`@viewfly/core`**. With Babel, **`@babel/preset-react`**’s **`importSource`** must be **`@viewfly/core`** as well.

## DI broken or `reflect-metadata` errors

Import from **`@viewfly/core`’s main entry** so metadata initializes. If issues remain after code-splitting, add as the **first line** of the app entry:

```ts
import 'reflect-metadata'
```

## Path params vs query params in navigation

**`navigateTo(path, queryParams?, hash?)`** — the second argument is the **query object**. Dynamic path segments and **`Router.params`**, **`useParams()`**, etc. are defined in **`@viewfly/router`**’s types.

In pages, prefer **`useParams()`** and **`useQueryParams()`**; reserve **`Router.params`** for router-level plumbing.

## Reporting issues

Please use [GitHub Issues](https://github.com/viewfly/viewfly/issues).
