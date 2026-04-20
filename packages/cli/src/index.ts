import { Command } from 'commander'
import { createProject, packageVersion, outputViewflyInfo } from './run.js'
import chalk from 'chalk'

const program = new Command()

program
  // 配置脚手架名称
  .name('viewfly')
  // 配置命令格式
  .usage('<command> [option]')
  // 配置版本号
  .version(packageVersion, '-v, --version', 'output the current version')

program
  .on('--help', () => {
    console.log(`\r\nRun ${chalk.cyan('viewfly <command> --help')} for detailed usage of given command\r\n`)
    outputViewflyInfo()
  })
program
  .on('-h', () => {
    console.log(`\r\nRun ${chalk.cyan('viewfly <command> --help')} for detailed usage of given command\r\n`)
    outputViewflyInfo()
  })
program.command('create <name>')
  .alias('new')
  .description('create a new project')
  .option('-t, --template <template>', 'template name', 'vite')
  .option('-f, --features <features>', 'comma separated features, e.g. router,scoped-css')
  .option('--pm <packageManager>', 'package manager: pnpm|npm|yarn')
  .option('--install', 'install dependencies after scaffolding')
  .option('--no-install', 'skip installing dependencies')
  .action(async (name, options) => {
    await createProject(name, options)
  })

export default function (argv: string[]) {
  program.parse(argv)
}


