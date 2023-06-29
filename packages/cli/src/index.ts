import clear from 'clear'
import inquirer from 'inquirer'
import chalk from 'chalk'
import figlet from "figlet"
import path from 'path'
import {create} from './create'
import {exists} from 'fs-extra'
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
  choices: ['sass', 'less', 'stylus'],
  message: '请选择样式表语言：'
}];

export const packageVersion = version
export async function buildProject() {
  console.log(chalk.blue('创建项目：'));
  console.log(chalk.green(figlet.textSync('ViewFly', {
    horizontalLayout: 'full',
  })))


  inquirer.prompt(questions).then(answers => {
    showLine();
    let messages = [
      `    项目名称：${chalk.green(answers.projectName)}`,
      `    开发语言：${chalk.green(answers.language)}`,
      `    样式表语言：${chalk.green(answers.cssLanguage)}`,
    ];

    console.log(messages.join('\n'));
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
