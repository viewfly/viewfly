import importCwd from 'import-cwd'

export function loadModule(moduleId: string): any {
  try {
    return require(moduleId)
  } catch {
    return importCwd.silent(moduleId)
  }
}
