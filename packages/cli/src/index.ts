import clear from 'clear'
import inquirer from 'inquirer'
import chalk from 'chalk'
import figlet from "figlet"
import path from 'path'
import {create} from './create'
import {exists} from 'fs-extra'
import {table} from 'table'
import {version} from '../package.json'
clear()

let line = [];
for (let i = 0; i < 80; i++) {
  line.push('=')
}
line = line.join('');

function showLine() {
  console.log(line)
}

const questions = [{
  name: 'projectName',
  type: 'input',
  message: '请输入项目名称：',
  validate(value) {
    return value.length ? true : '请输入正确项目名称'
  }
}, {
  name: 'language',
  type: 'rawlist',
  choices: ['JavaScript', 'TypeScript'],
  message: '请选择开发语言：'
}, {
  name: 'cssLanguage',
  type: 'rawlist',
  choices: ['sass', 'less', 'scoped-css'],
  message: '请选择样式表语言：'
}]
const questionsWithOutName = [{
  name: 'language',
  type: 'rawlist',
  choices: ['JavaScript', 'TypeScript'],
  message: '请选择开发语言：'
}, {
  name: 'cssLanguage',
  type: 'rawlist',
  choices: ['sass', 'less'],
  message: '请选择样式表语言：'
}]
export function outputViewflyInfo() {
  const title = chalk.green(figlet.textSync('VIEWFLY', {
    horizontalLayout: 'full',
  }))
  const data = [
    [`${title}\n${chalk.cyan('A magnificent front-end framework')}`, '', ''],
    [`cli version: ${chalk.red(version)}`, '', ''],
    [`${chalk.cyan('viewfly -v')}`, `${chalk.cyan('viewfly -c')}`, `${chalk.cyan('viewfly -h')}`],
    [`${chalk.cyan('viewfly init <name>')}`, `${chalk.cyan('viewfly new <name>')}`, `${chalk.cyan('viewfly create <name>')}`],
  ];

  const config = {
    columns:[
      { alignment: 'center', width: 25 },
      { alignment: 'center', width: 25 },
      { alignment: 'center', width: 25 },
    ],
    spanningCells:[
      { row: 0, col: 0, colSpan: 3},
      { row: 1, col: 0, colSpan: 3},
    ]
  }

  console.log(table(data, config))
}
export const packageVersion = version
export async function buildProject(name='') {
  await outputViewflyInfo()
  if(name) {
    console.log(chalk.green('Your Viewfly Project Name Is:') + chalk.bgBlue(chalk.whiteBright(name)))
    console.log('')
  }
  inquirer.prompt(name?questionsWithOutName:questions).then(answers => {
    if(name) {
      answers.name = name
    }
    showLine();
    let messages = [
      `    项目名称：${chalk.green(answers.projectName)}`,
      `    开发语言：${chalk.green(answers.language)}`,
      `    样式表语言：${chalk.green(answers.cssLanguage)}`,
    ]

    console.log(messages.join('\n'))
    inquirer.prompt([{
      name: 'confirm',
      type: 'confirm',
      message: '请确认您的项目：'
    }]).then(async (result) => {
      if (result.confirm) {
        exists(path.join(process.cwd(), `/${answers.projectName}`), (flag: boolean) => {
          if(flag) {
            console.log(chalk.red('项目目录已存在,已取消'))
          }else {
            console.log('项目初始化生成中...')
            create(answers)
          }
        })
      } else {
        console.log(chalk.red('项目创建取消成功！'));
      }
    })
  });
}
