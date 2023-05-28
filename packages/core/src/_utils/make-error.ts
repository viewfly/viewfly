export function makeError(name: string) {
  return function viewflyError(message: string) {
    const error = new Error(message)
    error.name = `[ViewflyError: ${name}]`
    error.stack = error.stack!.replace(/\n.*?(?=\n)/, '')
    return error
  }
}
