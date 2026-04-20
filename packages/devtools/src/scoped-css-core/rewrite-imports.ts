import path from 'path'
import { createScopeId } from './create-scope-id'

const SCOPED_IMPORT_RE = /import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([.\-/\w]+\.scoped\.(css|s[ac]ss|less|styl(us)?))['"](?=[;\s])/g

export function rewriteScopedStyleImports(code: string, importer: string): string {
  return code.replace(SCOPED_IMPORT_RE, (_full: string, localName: string, importPath: string) => {
    const absoluteStylePath = path.resolve(path.dirname(importer), importPath)
    const scopeId = createScopeId(absoluteStylePath)
    return `import "${importPath}";\nconst ${localName} = "${scopeId}";`
  })
}
