import { SearchParams } from './interface'

export function normalizePath(path: string, search?: SearchParams) {
  path = path.replace(/\/+/g, '/')
  
  return search ? (path + stringSearchParams(search)) : path
}

export function stringSearchParams(params: SearchParams) {
  const result: string[] = []

  Object.keys(params).forEach(key => {
    const values = params[key]
    if (Array.isArray(values)) {
      values.forEach(i => {
        result.push(`${key}=${decodeURIComponent(i)}`)
      })
    } else {
      result.push(`${key}=${decodeURIComponent(values)}`)
    }
  })

  const finalStr = result.join('&')

  return Boolean(finalStr) ? ('?' + finalStr) : ''
}