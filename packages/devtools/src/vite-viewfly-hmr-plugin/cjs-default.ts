/**
 * Babel 包为 CJS；在 Node ESM 下 `import x from '@babel/traverse'` 等会得到带 `default`
 * 字段的命名空间对象，需取出真正的默认导出再调用。
 */
export function cjsDefault<T>(mod: T | { default: T }): T {
  return (typeof mod === 'function' ? mod : (mod as { default: T }).default) as T
}
