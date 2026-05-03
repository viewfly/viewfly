import type { NodePath, PluginObj, PluginPass } from '@babel/core'
import generate from '@babel/generator'
import * as t from '@babel/types'
import { addNamed } from '@babel/helper-module-imports'

function fnv1a32(str: string): string {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return (h >>> 0).toString(36)
}

/**
 * 优先用源码切片（与磁盘上一致），避免 generate(AST) 在 JSX/插件顺序下不稳定导致兄弟组件误刷新。
 */
function digestForImplAst(node: t.Node): string {
  try {
    const { code } = generate(node, {
      comments: false,
      compact: true,
      jsescOption: { minimal: true },
    })
    return fnv1a32(code)
  } catch {
    return fnv1a32('gen-fail')
  }
}

/** 弱化格式化/空白差异，避免「保存兄弟组件」时误触本组件 digest */
function normalizeWs(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

function getFunctionBodyNode(node: t.Node): t.Node | null {
  if (t.isFunctionDeclaration(node) || t.isFunctionExpression(node) || t.isArrowFunctionExpression(node)) {
    return node.body
  }
  return null
}

/**
 * 只对「函数体」做源码摘要：改同文件其它组件时，本组件的签名区/注释若被连带格式化，也不会误判为需要刷新。
 * 编辑本组件函数体内部仍会改变 digest。
 */
function digestImpl(sourceCode: string | undefined, node: t.Node): string {
  const body = getFunctionBodyNode(node)
  if (
    body &&
    sourceCode &&
    typeof body.start === 'number' &&
    typeof body.end === 'number' &&
    body.end > body.start &&
    body.end <= sourceCode.length
  ) {
    return fnv1a32(normalizeWs(sourceCode.slice(body.start, body.end)))
  }
  if (
    sourceCode &&
    typeof node.start === 'number' &&
    typeof node.end === 'number' &&
    node.end > node.start &&
    node.end <= sourceCode.length
  ) {
    return fnv1a32(normalizeWs(sourceCode.slice(node.start, node.end)))
  }
  return digestForImplAst(node)
}

interface State extends PluginPass {
  vfHotUsed?: boolean
  vfMarkHotId?: t.Identifier
}

function createImportMetaUrl(): t.MemberExpression {
  return t.memberExpression(
    t.metaProperty(t.identifier('import'), t.identifier('meta')),
    t.identifier('url'),
  )
}

function shouldWrapComponentName(name: string | undefined | null, isDefaultExport: boolean): boolean {
  if (isDefaultExport) {
    return true
  }
  if (!name) {
    return false
  }
  const ch = name.charCodeAt(0)
  return ch >= 65 && ch <= 90
}

function getOrAddVfMarkHotImpl(program: NodePath<t.Program>, state: State): t.Identifier {
  if (state.vfMarkHotId) {
    return state.vfMarkHotId
  }
  state.vfHotUsed = true
  const id = addNamed(program, '__vfMarkHotImpl', '@viewfly/devtools/hmr-runtime', { nameHint: '__vfMarkHotImpl' })
  state.vfMarkHotId = id
  return id
}

function wrapExportDefaultFunction(
  path: NodePath<t.ExportDefaultDeclaration>,
  program: NodePath<t.Program>,
  state: State,
  sourceCode: string | undefined,
): void {
  const decl = path.node.declaration
  if (!t.isFunctionDeclaration(decl)) {
    return
  }
  const vf = getOrAddVfMarkHotImpl(program, state)
  const implId = decl.id
    ? path.scope.generateUidIdentifier(`${decl.id.name}$vfHot`)
    : path.scope.generateUidIdentifier('default$vfHot')
  const fnDecl = t.functionDeclaration(implId, decl.params, decl.body, decl.generator, decl.async)
  const implDigest = digestImpl(sourceCode, decl)
  const markHot = t.expressionStatement(
    t.callExpression(vf, [
      implId,
      t.stringLiteral('default'),
      createImportMetaUrl(),
      t.stringLiteral(implDigest),
    ]),
  )
  path.replaceWithMultiple([fnDecl, markHot, t.exportDefaultDeclaration(implId)])
}

function wrapExportNamedFunction(
  path: NodePath<t.ExportNamedDeclaration>,
  program: NodePath<t.Program>,
  state: State,
  sourceCode: string | undefined,
): void {
  const decl = path.node.declaration
  if (!t.isFunctionDeclaration(decl) || !decl.id) {
    return
  }
  const name = decl.id.name
  if (!shouldWrapComponentName(name, false)) {
    return
  }
  const vf = getOrAddVfMarkHotImpl(program, state)
  const implId = path.scope.generateUidIdentifier(`${name}$vfHot`)
  const fnDecl = t.functionDeclaration(implId, decl.params, decl.body, decl.generator, decl.async)
  const implDigest = digestImpl(sourceCode, decl)
  const markHot = t.expressionStatement(
    t.callExpression(vf, [
      implId,
      t.stringLiteral(name),
      createImportMetaUrl(),
      t.stringLiteral(implDigest),
    ]),
  )
  const alias = t.variableDeclaration('const', [t.variableDeclarator(t.identifier(name), implId)])
  const reExport = t.exportNamedDeclaration(null, [
    t.exportSpecifier(t.identifier(name), t.identifier(name)),
  ])
  path.replaceWithMultiple([fnDecl, markHot, alias, reExport])
}

function wrapExportNamedConstFunction(
  path: NodePath<t.ExportNamedDeclaration>,
  program: NodePath<t.Program>,
  state: State,
  sourceCode: string | undefined,
): void {
  const decl = path.node.declaration
  if (!t.isVariableDeclaration(decl) || decl.declarations.length !== 1) {
    return
  }
  const d = decl.declarations[0]
  if (!t.isIdentifier(d.id) || !d.init) {
    return
  }
  const name = d.id.name
  if (!shouldWrapComponentName(name, false)) {
    return
  }
  if (!(t.isArrowFunctionExpression(d.init) || t.isFunctionExpression(d.init))) {
    return
  }
  const vf = getOrAddVfMarkHotImpl(program, state)
  const implId = path.scope.generateUidIdentifier(`${name}$vfHot`)
  const implDecl = t.variableDeclaration(decl.kind === 'var' ? 'const' : decl.kind, [
    t.variableDeclarator(implId, d.init),
  ])
  const implDigest = digestImpl(sourceCode, d.init)
  const markHot = t.expressionStatement(
    t.callExpression(vf, [
      implId,
      t.stringLiteral(name),
      createImportMetaUrl(),
      t.stringLiteral(implDigest),
    ]),
  )
  const alias = t.variableDeclaration('const', [t.variableDeclarator(t.identifier(name), implId)])
  const reExport = t.exportNamedDeclaration(null, [
    t.exportSpecifier(t.identifier(name), t.identifier(name)),
  ])
  path.replaceWithMultiple([implDecl, markHot, alias, reExport])
}

function appendHotAccept(program: NodePath<t.Program>, state: State): void {
  if (!state.vfHotUsed) {
    return
  }
  const hotMeta = t.memberExpression(
    t.metaProperty(t.identifier('import'), t.identifier('meta')),
    t.identifier('hot'),
  )
  const accept = t.memberExpression(hotMeta, t.identifier('accept'))
  const ifStmt = t.ifStatement(
    hotMeta,
    t.blockStatement([t.expressionStatement(t.callExpression(accept, []))]),
  )
  program.pushContainer('body', ifStmt)
}

export default function viewflyHmrBabelPlugin(): PluginObj<State> {
  return {
    name: 'viewfly-hmr',
    visitor: {
      Program: {
        enter(_, state) {
          state.vfHotUsed = false
          state.vfMarkHotId = undefined
        },
        exit(path, state) {
          appendHotAccept(path, state)
        },
      },
      ExportDefaultDeclaration(path, state: State) {
        const program = path.findParent((p) => p.isProgram()) as NodePath<t.Program> | null
        if (!program) {
          return
        }
        wrapExportDefaultFunction(path, program, state, state.file.code)
      },
      ExportNamedDeclaration(path, state: State) {
        const decl = path.node.declaration
        if (!decl) {
          return
        }
        const program = path.findParent((p) => p.isProgram()) as NodePath<t.Program> | null
        if (!program) {
          return
        }
        const src = state.file.code
        if (t.isFunctionDeclaration(decl)) {
          wrapExportNamedFunction(path, program, state, src)
          return
        }
        if (t.isVariableDeclaration(decl)) {
          wrapExportNamedConstFunction(path, program, state, src)
        }
      },
    },
  }
}
