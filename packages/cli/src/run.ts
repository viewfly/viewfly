import clear from 'clear'
import chalk from 'chalk'
import figlet from "figlet"
import path, { dirname } from 'path'
import { exists } from 'fs-extra'
import { fileURLToPath } from 'url'
import fs from 'fs'
import copy from 'directory-copy'

import { version } from '../package.json'

import { packageTemplate } from './package-template'

clear()

const __dirname = dirname(fileURLToPath(import.meta.url))
const line = Array.from({ length: 80 }).fill('=').join('');

function showLine() {
  console.log(line)
}


export function outputViewflyInfo() {
  const title = chalk.green(figlet.textSync('VIEWFLY', {
    horizontalLayout: 'full',
  }))

  console.log(title)
}

export const packageVersion = version

export async function buildProject(projectName = '') {
  outputViewflyInfo()
  if (projectName) {
    console.log(chalk.green('project name: ') + chalk.bgBlue(chalk.whiteBright(projectName)))
    console.log('')
  } else {
    console.log('项目名称为空，创建取消！')
    return
  }

  showLine();

  exists(path.join(process.cwd(), `/${projectName}`), (flag: boolean) => {
    if (flag) {
      console.log(chalk.red('项目目录已存在,已取消'))
    } else {
      console.log('项目创建中...')
      copy({
        src: path.resolve(__dirname, '../template'),
        dest: projectName
      }, () => {
        const packageFile = path.join(process.cwd(), projectName, 'package.json')
        const packageContent = packageTemplate(projectName)
        fs.writeFile(packageFile, packageContent, error => {
          if (error) {
            console.log(chalk.red(error))
          }
        })
        console.log('项目模板创建完成。')
      }).on('log', (message: string) => {
        console.log(chalk.gray('**') + ' ' + message);
      })

      console.log('项目创建完成。')
    }
  })
}
