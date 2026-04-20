import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

import clear from 'clear'
import chalk from 'chalk'
import figlet from 'figlet'
import fs from 'fs-extra'
import { checkbox, confirm, select } from '@inquirer/prompts'

clear()

const __dirname = dirname(fileURLToPath(import.meta.url))
const templateRoot = path.resolve(__dirname, '../templates')

const line = Array.from({ length: 80 }).fill('=').join('')

export function outputViewflyInfo() {
  const title = chalk.green(figlet.textSync('VIEWFLY', { horizontalLayout: 'full' }))
  console.log(title)
}

export const packageVersion = process.env.npm_package_version || '2.1.0'

function normalizeFeatureList(input?: string) {
  if (!input) {
    return []
  }
  return input
    .split(',')
    .map(i => i.trim())
    .filter(Boolean)
    .filter((i) => i === 'router' || i === 'scoped-css')
}

function renderTemplate(content: string, context: { projectName: string }) {
  return content
    .replaceAll('__PROJECT_NAME__', context.projectName)
}

async function renderDirectory(targetDir: string, context: { projectName: string }) {
  const files = await fs.readdir(targetDir, { recursive: true }) as string[]
  await Promise.all(files.map(async file => {
    const absolutePath = path.resolve(targetDir, file)
    const stat = await fs.stat(absolutePath)
    if (stat.isDirectory()) {
      return
    }
    if (absolutePath.endsWith('.png') || absolutePath.endsWith('.svg') || absolutePath.endsWith('.ico')) {
      return
    }
    const content = await fs.readFile(absolutePath, 'utf8')
    await fs.writeFile(absolutePath, renderTemplate(content, context), 'utf8')
  }))
}

function buildMainSource(features: string[]) {
  const hasRouter = features.includes('router')
  const hasScopedCss = features.includes('scoped-css')

  const styleImport = hasScopedCss
    ? 'import \'./app.scoped.scss\'\n'
    : 'import \'./style.css\'\n'

  const body = hasRouter
    ? `function App() {
  return () => {
    return (
      <main style={{ padding: '24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <h1>Viewfly + Vite</h1>
        <p>Router feature is enabled. You can now build your routes in this app.</p>
      </main>
    )
  }
}`
    : `function App() {
  return () => {
    return (
      <main style={{ padding: '24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <h1>Viewfly + Vite</h1>
        <p>Project scaffolded successfully.</p>
      </main>
    )
  }
}`

  return `import { createApp } from '@viewfly/platform-browser'
${styleImport}
${body}

createApp(<App />).mount(document.getElementById('app')!)
`
}

function buildViteConfigSource(features: string[]) {
  const hasScopedCss = features.includes('scoped-css')

  const pluginImport = hasScopedCss
    ? 'import viteScopedCssPlugin from \'@viewfly/devtools/vite-scoped-css-plugin\'\n'
    : ''
  const plugins = hasScopedCss ? '  plugins: [viteScopedCssPlugin()],\n' : ''

  return `import { defineConfig } from 'vite'
${pluginImport}
export default defineConfig({
${plugins}  server: {
    host: true,
    port: 5173
  }
})
`
}

async function applyFeatureMutations(projectPath: string, features: string[]) {
  const packageJsonPath = path.join(projectPath, 'package.json')
  const packageJson = await fs.readJson(packageJsonPath)

  if (features.includes('router')) {
    packageJson.dependencies = packageJson.dependencies || {}
    packageJson.dependencies['@viewfly/router'] = '^2.1.0'
  }

  if (features.includes('scoped-css')) {
    packageJson.devDependencies = packageJson.devDependencies || {}
    packageJson.devDependencies['@viewfly/devtools'] = '^2.0.0'
    await fs.writeFile(path.join(projectPath, 'src/app.scoped.scss'), '.app {\n  color: #2563eb;\n}\n', 'utf8')
  }

  await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 })
  await fs.writeFile(path.join(projectPath, 'src/main.tsx'), buildMainSource(features), 'utf8')
  await fs.writeFile(path.join(projectPath, 'vite.config.ts'), buildViteConfigSource(features), 'utf8')
}

function runInstall(projectPath: string, packageManager: 'pnpm' | 'npm' | 'yarn') {
  const installArgs = packageManager === 'yarn' ? [] : ['install']
  return new Promise<void>((resolve, reject) => {
    const cp = spawn(packageManager, installArgs, {
      cwd: projectPath,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    })
    cp.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`Dependency installation failed with exit code ${code}`))
    })
  })
}

type CreateProjectOptions = {
  template?: string
  features?: string
  pm?: string
  install?: boolean
}

export async function createProject(projectName = '', options: CreateProjectOptions = {}) {
  outputViewflyInfo()
  if (!projectName) {
    console.log(chalk.red('project name is required'))
    return
  }

  const projectPath = path.resolve(process.cwd(), projectName)
  if (await fs.pathExists(projectPath)) {
    console.log(chalk.red('target directory already exists, creation cancelled'))
    return
  }

  const selectedTemplate = options.template === 'vite' || !options.template ? 'vite' : await select({
    message: 'Select template',
    choices: [{ name: 'vite', value: 'vite' }]
  })

  let selectedFeatures = normalizeFeatureList(options.features)
  if (!options.features) {
    selectedFeatures = await checkbox({
      message: 'Select optional features',
      choices: [
        { name: 'router', value: 'router' },
        { name: 'scoped-css', value: 'scoped-css' }
      ]
    })
  }

  let packageManager: 'pnpm' | 'npm' | 'yarn' = 'pnpm'
  if (options.pm === 'pnpm' || options.pm === 'npm' || options.pm === 'yarn') {
    packageManager = options.pm
  } else if (!options.pm) {
    packageManager = await select({
      message: 'Select package manager',
      choices: [
        { name: 'pnpm', value: 'pnpm' },
        { name: 'npm', value: 'npm' },
        { name: 'yarn', value: 'yarn' }
      ]
    })
  }

  const shouldInstall = typeof options.install === 'boolean'
    ? options.install
    : await confirm({ message: 'Install dependencies now?', default: true })

  const context = {
    projectName,
    template: selectedTemplate,
    features: selectedFeatures
  }

  console.log(line)
  console.log(chalk.cyan(`Scaffolding project: ${projectName}`))

  const baseTemplatePath = path.join(templateRoot, 'base-vite')
  await fs.copy(baseTemplatePath, projectPath)
  await renderDirectory(projectPath, context)
  await applyFeatureMutations(projectPath, selectedFeatures)

  console.log(chalk.green('Project scaffolded successfully.'))
  if (shouldInstall) {
    console.log(chalk.cyan(`Installing dependencies with ${packageManager}...`))
    await runInstall(projectPath, packageManager)
  }

  console.log(line)
  console.log(chalk.green('Next steps:'))
  console.log(`  cd ${projectName}`)
  if (!shouldInstall) {
    console.log(`  ${packageManager} install`)
  }
  console.log(`  ${packageManager} dev`)
}
