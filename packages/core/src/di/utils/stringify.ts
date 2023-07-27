export function stringify(token: any): string {
  if (typeof token === 'string') {
    return token
  }

  if (Array.isArray(token)) {
    return '[' + token.map(stringify).join(', ') + ']'
  }

  if (token == null) {
    return '' + token
  }

  if (token.name) {
    return `${token.name}`
  }

  if (token.token) {
    return `${token.token}`
  }

  const res = token.toString()

  if (res == null) {
    return '' + res
  }

  const newLineIndex = res.indexOf('\n')
  return newLineIndex === -1 ? res : res.substring(0, newLineIndex)
}
