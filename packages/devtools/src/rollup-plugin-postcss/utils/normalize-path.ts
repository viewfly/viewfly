export default function normalizePath(value: string): string {
  return value ? value.replace(/\\+/g, '/') : value
}
