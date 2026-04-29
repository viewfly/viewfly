/** 查询串组件：写入 URL 时 encode，从 URL 解析出对象时 decode（与常见路由约定一致）。 */

export function encodeQueryParamComponent(value: string): string {
  try {
    return encodeURIComponent(value)
  } catch {
    return value
  }
}

export function decodeQueryParamComponent(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '))
  } catch {
    return value
  }
}
