import { Command } from 'commander'
import { buildProject, packageVersion, outputViewflyInfo } from './run'
import chalk from 'chalk'

const program = new Command()

program
  // 配置脚手架名称
  .name('viewfly')
  // 配置命令格式
  .usage(`<command> [option]`)
  // 配置版本号
  .version(packageVersion, '-v, --version', 'output the current version')

program
  .on('--help', () => {
    console.log(`\r\nRun ${chalk.cyan(`viewfly <command> --help`)} for detailed usage of given command\r\n`)
    outputViewflyInfo()
  })
program
  .on('-h', () => {
    console.log(`\r\nRun ${chalk.cyan(`viewfly <command> --help`)} for detailed usage of given command\r\n`)
    outputViewflyInfo()
  })
program.command('new <name>')
  .description('create a new project')
  .action(name => {
    buildProject(name)
  })

export default function (argv: string[]) {
  program.parse(argv)
}


