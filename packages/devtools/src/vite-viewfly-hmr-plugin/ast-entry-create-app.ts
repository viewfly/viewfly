import generateImport from '@babel/generator'
import { parse } from '@babel/parser'
import traverseImport from '@babel/traverse'
import * as t from '@babel/types'

import { cjsDefault } from './cjs-default'

const generate = cjsDefault(generateImport)
const traverse = cjsDefault(traverseImport)

const MARKER = 'viewfly-hmr-entry-create-app'
const PLATFORM_BROWSER = '@viewfly/platform-browser'

/**
 * 将 `import { createApp } from '@viewfly/platform-browser'` 改为别名，并注入本地 `createApp` 包装
 *（避免 ESM 命名空间只读导致无法给 `createApp` 赋值）。仅处理本地名为 `createApp` 的具名导入。
 */
export function applyEntryCreateAppWrap(
  source: string,
  id: string,
  runtimePkg: string,
): string | null {
  if (source.includes(MARKER)) {
    return null
  }

  let ast: t.File
  try {
    ast = parse(source, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    }) as t.File
  } catch {
    return null
  }

  let renamed = false
  traverse(ast, {
    ImportDeclaration(path) {
      if (path.node.importKind === 'type') {
        return
      }
      const src = path.node.source.value
      if (src !== PLATFORM_BROWSER) {
        return
      }
      for (const spec of path.node.specifiers) {
        if (!t.isImportSpecifier(spec)) {
          continue
        }
        const imp = spec.imported
        const importedName = t.isIdentifier(imp)
          ? imp.name
          : t.isStringLiteral(imp)
            ? imp.value
            : null
        if (importedName !== 'createApp' || !t.isIdentifier(spec.local) || spec.local.name !== 'createApp') {
          continue
        }
        spec.local = t.identifier('__vfOrigCreateApp')
        renamed = true
      }
    },
  })

  if (!renamed) {
    return null
  }

  let lastImportIdx = -1
  ast.program.body.forEach((node, i) => {
    if (t.isImportDeclaration(node)) {
      lastImportIdx = i
    }
  })

  const patchImport = t.importDeclaration(
    [
      t.importSpecifier(
        t.identifier('patchApplicationMountForHmr'),
        t.identifier('patchApplicationMountForHmr'),
      ),
    ],
    t.stringLiteral(runtimePkg),
  )

  const wrapFn = t.functionExpression(
    null,
    [t.restElement(t.identifier('args'))],
    t.blockStatement([
      t.variableDeclaration('const', [
        t.variableDeclarator(
          t.identifier('app'),
          t.callExpression(t.identifier('__vfOrigCreateApp'), [
            t.spreadElement(t.identifier('args')),
          ]),
        ),
      ]),
      t.expressionStatement(
        t.callExpression(t.identifier('patchApplicationMountForHmr'), [t.identifier('app')]),
      ),
      t.returnStatement(t.identifier('app')),
    ]),
  )

  const wrapDecl = t.variableDeclaration('const', [
    t.variableDeclarator(t.identifier('createApp'), wrapFn),
  ])
  t.addComment(wrapDecl, 'leading', ` ${MARKER} `, false)

  ast.program.body.splice(lastImportIdx + 1, 0, patchImport, wrapDecl)

  const fname = id.split('?')[0].split(/[/\\]/).pop() || 'main.tsx'
  return generate(ast, { filename: fname }, source).code
}
