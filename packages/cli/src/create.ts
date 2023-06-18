import fs from 'fs'
import path from 'path'
import ora from 'ora'
import {downloadTemplate} from './download'
const __dirname = path.join(process.cwd(), '')
const git_template_urls = {
  'JavaScript': 'https://github.com/GordonHU-LB/viewfly-js-template.git',
  'TypeScript': 'https://github.com/GordonHU-LB/viewfly-ts-template.git'
}
export async function create(config) {
  const spinner = ora({
    text: '生成中...',
    color: 'green'
  }).start()
  // await copy(path.resolve(__dirname, './templates/viewfly-ts'), config.projectName)
  await downloadTemplate(git_template_urls[config.language], __dirname + '/'+config.projectName)
  changeTemplate(config)
  spinner.succeed('生成完毕')
}
export function checkDir(projectName) {
  const dirname = process.cwd()+'/'+projectName
  return new Promise((resolve, reject) => {
    fs.readdir(dirname, (err, data) => {
      if (err) {
        if(err.errno === -2){
          return resolve(1)
        }
        return reject(err)
      }
      if (data.includes(projectName)) {
        return reject(new Error(`${projectName} already exists!`))
      }
      resolve(1)
    })
  })
}
async function changeTemplate(customContent) {
  const { projectName = '', description = '', author = '' } = customContent
  return new Promise((resolve, reject) => {
    fs.readFile(
      path.resolve(process.cwd(), projectName, 'package.json'),
      'utf8',
      (err, data) => {
        if (err) {
          return reject(err)
        }
        const packageContent = JSON.parse(data)
        packageContent.name = projectName
        packageContent.author = author
        packageContent.description = description
        fs.writeFile(
          path.resolve(process.cwd(), projectName, 'package.json'),
          JSON.stringify(packageContent, null, 2),
          'utf8',
          (err) => {
            if (err) {
              return reject(err)
            }
            resolve(1)
          }
        )
      }
    )
  })
}
