/**
 * 供 `jsx: "react-jsx"` + `jsxImportSource: "@viewfly/core"` 使用。
 * 运行时再导出主包入口，避免把 core 打进本 chunk；`JSX` 与主入口类型一致。
 * @see https://www.typescriptlang.org/tsconfig#jsxImportSource
 */
export { jsx, jsxs, Fragment, jsx as jsxDEV } from '@viewfly/core'
export type { JSX } from '@viewfly/core'
