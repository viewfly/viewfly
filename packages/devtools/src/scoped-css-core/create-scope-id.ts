import path from 'path'
import crypto from 'node:crypto'

const scopedIdCache = new Map<string, string>()

function normalizePath(filePath: string): string {
  return filePath.replace(/[\\/]+/g, '/')
}

function resolveFilePath(filePath: string, root: string): string {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(root, filePath)
  return normalizePath(absolutePath)
}

export function createScopeId(filePath: string, root = process.cwd()): string {
  const normalizedFilePath = resolveFilePath(filePath, root)
  const cached = scopedIdCache.get(normalizedFilePath)
  if (cached) {
    return cached
  }
  const normalizedRoot = normalizePath(path.resolve(root))
  const relativePath = normalizedFilePath.startsWith(normalizedRoot + '/')
    ? normalizedFilePath.slice(normalizedRoot.length + 1)
    : normalizedFilePath
  const scopeId = `vf-${crypto.createHash('sha256').update(relativePath).digest('hex').slice(0, 6)}`
  scopedIdCache.set(normalizedFilePath, scopeId)
  return scopeId
}
