import generateImport from '@babel/generator'
import { parse } from '@babel/parser'
import traverseImport from '@babel/traverse'
import * as t from '@babel/types'

import { cjsDefault } from './cjs-default'

const generate = cjsDefault(generateImport)
const traverse = cjsDefault(traverseImport)

const REGISTRY_ID = '__vfRegistry'
export const AST_HMR_MARKER = 'viewfly-hmr-ast-registry'

export interface AstHmrRegistryResult {
  code: string
}

function isPascalCase(name: string): boolean {
  return /^[A-Z][a-zA-Z0-9]*$/.test(name)
}

/** 具名导出的组件实现改名，避免 ESM 导出仍指向未包装的 setup（import 侧拿不到 __vfHmrKey）。 */
function implId(publicName: string): string {
  return `__vfHmrImpl_${publicName}`
}

interface ExportedComponents {
  /** `export function Foo` / `export const Foo = () =>` */
  named: Set<string>
  /** `export default function Foo` */
  defaultName: string | null
}

function collectExportedComponentInfo(program: t.Program): ExportedComponents {
  const named = new Set<string>()
  let defaultName: string | null = null
  for (const stmt of program.body) {
    if (t.isExportNamedDeclaration(stmt) && stmt.declaration) {
      const decl = stmt.declaration
      if (t.isFunctionDeclaration(decl) && decl.id && isPascalCase(decl.id.name)) {
        named.add(decl.id.name)
      }
      if (t.isVariableDeclaration(decl)) {
        for (const d of decl.declarations) {
          if (
            t.isIdentifier(d.id)
            && isPascalCase(d.id.name)
            && d.init
            && (t.isArrowFunctionExpression(d.init) || t.isFunctionExpression(d.init))
          ) {
            named.add(d.id.name)
          }
        }
      }
    }
    if (t.isExportDefaultDeclaration(stmt)) {
      const decl = stmt.declaration
      if (t.isFunctionDeclaration(decl) && decl.id && isPascalCase(decl.id.name)) {
        defaultName = decl.id.name
      }
    }
  }
  return { named, defaultName }
}

function usesImplForRegistry(name: string, exported: ExportedComponents): boolean {
  return exported.named.has(name) || exported.defaultName === name
}

function jsxOrComponentRefShouldRewrite(
  name: string,
  binding:
    | {
        kind: string
        scope: { path: { node: t.Node } }
      }
    | undefined,
  exported: ExportedComponents,
): boolean {
  if (!binding) {
    return exported.named.has(name) || exported.defaultName === name
  }
  return isProgramScopedBinding(binding)
}

/**
 * 将 `export function Foo` / `export const Foo =` / `export default function Foo`
 * 改为内部实现名，末尾再由 `export const Foo = __vfRegistry.Foo` 暴露包装后的引用。
 */
function stripExportRenameImpl(program: t.Program, exported: ExportedComponents): void {
  const body = program.body
  for (let i = 0; i < body.length; i++) {
    const stmt = body[i]
    if (t.isExportDefaultDeclaration(stmt)) {
      const decl = stmt.declaration
      if (
        t.isFunctionDeclaration(decl)
        && decl.id
        && exported.defaultName
        && decl.id.name === exported.defaultName
      ) {
        const cloned = t.cloneNode(decl, true) as t.FunctionDeclaration
        cloned.id = t.identifier(implId(decl.id.name))
        body[i] = cloned
      }
      continue
    }
    if (!t.isExportNamedDeclaration(stmt) || !stmt.declaration || stmt.specifiers.length > 0) {
      continue
    }
    const decl = stmt.declaration
    if (t.isFunctionDeclaration(decl) && decl.id && exported.named.has(decl.id.name)) {
      const cloned = t.cloneNode(decl, true) as t.FunctionDeclaration
      cloned.id = t.identifier(implId(decl.id.name))
      body[i] = cloned
      continue
    }
    if (t.isVariableDeclaration(decl)) {
      let anyHit = false
      const newDecls: t.VariableDeclarator[] = []
      for (const d of decl.declarations) {
        if (
          t.isIdentifier(d.id)
          && exported.named.has(d.id.name)
          && d.init
          && (t.isArrowFunctionExpression(d.init) || t.isFunctionExpression(d.init))
        ) {
          anyHit = true
          newDecls.push(t.variableDeclarator(t.identifier(implId(d.id.name)), d.init))
        } else {
          newDecls.push(d)
        }
      }
      if (anyHit) {
        body[i] = t.variableDeclaration(decl.kind, newDecls)
      }
    }
  }
}

function collectTopLevelComponentNames(program: t.Program): string[] {
  const names: string[] = []
  const add = (n: string) => {
    if (!names.includes(n)) {
      names.push(n)
    }
  }

  for (const stmt of program.body) {
    if (t.isFunctionDeclaration(stmt) && stmt.id && isPascalCase(stmt.id.name)) {
      add(stmt.id.name)
    }
    if (t.isVariableDeclaration(stmt)) {
      for (const d of stmt.declarations) {
        if (
          t.isIdentifier(d.id)
          && isPascalCase(d.id.name)
          && d.init
          && (t.isArrowFunctionExpression(d.init) || t.isFunctionExpression(d.init))
        ) {
          add(d.id.name)
        }
      }
    }
    if (t.isExportNamedDeclaration(stmt) && stmt.declaration) {
      const decl = stmt.declaration
      if (t.isFunctionDeclaration(decl) && decl.id && isPascalCase(decl.id.name)) {
        add(decl.id.name)
      }
      if (t.isVariableDeclaration(decl)) {
        for (const d of decl.declarations) {
          if (
            t.isIdentifier(d.id)
            && isPascalCase(d.id.name)
            && d.init
            && (t.isArrowFunctionExpression(d.init) || t.isFunctionExpression(d.init))
          ) {
            add(d.id.name)
          }
        }
      }
    }
    if (t.isExportDefaultDeclaration(stmt)) {
      const decl = stmt.declaration
      if (t.isFunctionDeclaration(decl) && decl.id && isPascalCase(decl.id.name)) {
        add(decl.id.name)
      }
    }
  }
  return names
}

function isProgramScopedBinding(binding: {
  kind: string
  scope: { path: { node: t.Node } }
}): boolean {
  if (binding.kind === 'module' || binding.kind === 'import') {
    return false
  }
  return t.isProgram(binding.scope.path.node)
}

/**
 * 顶层 PascalCase 组件 → `const __vfRegistry = { ... }` + `wireViewflyHmrModule`；
 * JSX 与 `component:` 改为经 `__vfRegistry` 访问（开发者源码可不写 vf / wire）。
 */
function cleanIdForName(id: string): string {
  return id.split('?')[0].split(/[/\\]/).pop() || 'file.tsx'
}

export function applyViewflyHmrRegistryTransform(source: string, id: string): AstHmrRegistryResult | null {
  if (source.includes(AST_HMR_MARKER) || /\bconst __vfRegistry\s*=\s*\{/.test(source)) {
    return null
  }

  let ast: t.File
  try {
    ast = parse(source, {
      sourceType: 'module',
      allowAwaitOutsideFunction: true,
      plugins: ['typescript', 'jsx'],
    }) as t.File
  } catch {
    return null
  }

  const program = ast.program
  const orderedNames = collectTopLevelComponentNames(program)
  const localComponents = new Set(orderedNames)
  if (localComponents.size === 0) {
    return null
  }

  const exported = collectExportedComponentInfo(program)
  stripExportRenameImpl(program, exported)

  traverse(ast, {
    JSXOpeningElement(path) {
      const n = path.node.name
      if (!t.isJSXIdentifier(n) || n.name === REGISTRY_ID) {
        return
      }
      if (!localComponents.has(n.name)) {
        return
      }
      const binding = path.scope.getBinding(n.name)
      if (!jsxOrComponentRefShouldRewrite(n.name, binding, exported)) {
        return
      }
      path.node.name = t.jsxMemberExpression(
        t.jsxIdentifier(REGISTRY_ID),
        t.jsxIdentifier(n.name),
      )
    },
    JSXClosingElement(path) {
      const n = path.node.name
      if (!t.isJSXIdentifier(n)) {
        return
      }
      if (!localComponents.has(n.name)) {
        return
      }
      const binding = path.scope.getBinding(n.name)
      if (!jsxOrComponentRefShouldRewrite(n.name, binding, exported)) {
        return
      }
      path.node.name = t.jsxMemberExpression(
        t.jsxIdentifier(REGISTRY_ID),
        t.jsxIdentifier(n.name),
      )
    },
    ObjectProperty(path) {
      const key = path.node.key
      let keyName: string | null = null
      if (t.isIdentifier(key)) {
        keyName = key.name
      } else if (t.isStringLiteral(key)) {
        keyName = key.value
      }
      if (keyName !== 'component') {
        return
      }
      const val = path.node.value
      if (!t.isIdentifier(val) || !localComponents.has(val.name)) {
        return
      }
      const binding = path.scope.getBinding(val.name)
      if (!jsxOrComponentRefShouldRewrite(val.name, binding, exported)) {
        return
      }
      path.node.value = t.memberExpression(
        t.identifier(REGISTRY_ID),
        t.identifier(val.name),
      )
    },
  })

  const props = orderedNames.map((name) => {
    const impl = usesImplForRegistry(name, exported) ? implId(name) : name
    const shorthand = impl === name
    return t.objectProperty(t.identifier(name), t.identifier(impl), false, shorthand)
  })
  const registryDecl = t.variableDeclaration('const', [
    t.variableDeclarator(t.identifier(REGISTRY_ID), t.objectExpression(props)),
  ])
  t.addComment(registryDecl, 'leading', ` ${AST_HMR_MARKER} `, false)

  const wireCall = t.expressionStatement(
    t.callExpression(t.identifier('wireViewflyHmrModule'), [
      t.memberExpression(
        t.metaProperty(t.identifier('import'), t.identifier('meta')),
        t.identifier('url'),
      ),
      t.identifier(REGISTRY_ID),
    ]),
  )

  const body = program.body
  let insertIndex = -1

  function chainRootIsCreateApp(expr: t.Expression | null | undefined): boolean {
    if (!expr || !t.isCallExpression(expr)) {
      return false
    }
    let n: t.CallExpression = expr
    for (;;) {
      const callee = n.callee
      if (t.isMemberExpression(callee) && !callee.computed && t.isIdentifier(callee.property)) {
        const name = callee.property.name
        if ((name === 'mount' || name === 'use') && t.isCallExpression(callee.object)) {
          n = callee.object
          continue
        }
      }
      return t.isIdentifier(callee) && callee.name === 'createApp'
    }
  }

  for (let i = 0; i < body.length; i++) {
    const stmt = body[i]
    if (t.isExpressionStatement(stmt) && chainRootIsCreateApp(stmt.expression)) {
      insertIndex = i
      break
    }
    if (t.isVariableDeclaration(stmt)) {
      for (const decl of stmt.declarations) {
        if (decl.init && chainRootIsCreateApp(decl.init)) {
          insertIndex = i
          break
        }
      }
      if (insertIndex >= 0) {
        break
      }
    }
  }

  const exportTail: t.Statement[] = []
  for (const name of exported.named) {
    if (!orderedNames.includes(name)) {
      continue
    }
    exportTail.push(
      t.exportNamedDeclaration(
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier(name),
            t.memberExpression(t.identifier(REGISTRY_ID), t.identifier(name), false),
          ),
        ]),
      ),
    )
  }
  if (
    exported.defaultName
    && orderedNames.includes(exported.defaultName)
  ) {
    exportTail.push(
      t.exportDefaultDeclaration(
        t.memberExpression(
          t.identifier(REGISTRY_ID),
          t.identifier(exported.defaultName),
          false,
        ),
      ),
    )
  }

  const prelude = [registryDecl, wireCall, ...exportTail]
  if (insertIndex >= 0) {
    body.splice(insertIndex, 0, ...prelude)
  } else {
    body.push(...prelude)
  }

  const out = generate(ast, { filename: cleanIdForName(id) }, source)
  return { code: out.code }
}
