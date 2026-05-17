/**
 * Default import from Viewfly scoped style files is a stable `data-v-*`
 * attribute name (for `withMark` from `@viewfly/core`).
 */
declare module '*.scoped.css' {
  const scopeId: string
  export default scopeId
}

declare module '*.scoped.scss' {
  const scopeId: string
  export default scopeId
}

declare module '*.scoped.sass' {
  const scopeId: string
  export default scopeId
}

declare module '*.scoped.less' {
  const scopeId: string
  export default scopeId
}

declare module '*.scoped.styl' {
  const scopeId: string
  export default scopeId
}

declare module '*.scoped.stylus' {
  const scopeId: string
  export default scopeId
}
