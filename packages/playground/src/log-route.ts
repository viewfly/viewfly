export function logRoute(tag: string, extra?: Record<string, unknown>) {
  const payload = extra ? ` ${JSON.stringify(extra)}` : ''
  console.log(`[playground-router] ${tag}${payload}`)
}
