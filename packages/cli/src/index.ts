import clear from 'clear'
import inquirer from 'inquirer'
import chalk from 'chalk'

import { banner } from "./banner";

clear()
banner()

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

const questions2 = [];

export function buildProject() {
  console.log(chalk.blue('创建项目：'));
  inquirer.prompt(questions).then(answers => {
    showLine();
    let messages = [
      `    项目名称：${chalk.green(answers.projectName)}`,
      `    样式表语言：${chalk.green(answers.cssLanguage)}`,
    ];

    console.log(messages.join('\n'));
    inquirer.prompt([{
      name: 'confirm',
      type: 'confirm',
      message: '请确认您的项目：'
    }]).then(result => {
      if (result.confirm) {
        create(answers);
      } else {
        console.log(chalk.red('项目创建取消成功！'));
      }
    })
  });
}
