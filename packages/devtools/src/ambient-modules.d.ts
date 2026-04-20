/** 无官方/DefinitelyTyped 类型时的最小声明，供 IDE 与 tsc 使用 */

declare module 'promise.series' {
  function series(tasks: Array<(value: any) => any>, initial: any): Promise<any>
  export default series
}

declare module 'css-loader' {
  const loader: (...args: any[]) => unknown
  export default loader
}
