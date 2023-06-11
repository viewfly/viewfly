import fs from 'fs'
import path from 'path'
import {copy} from 'fs-extra'
import ora from 'ora'
const __dirname = path.join(process.cwd(), '')

export async function create(config) {
  const spinner = ora({
    text: '生成中...',
    color: 'green'
  }).start()
  await copy(path.resolve(__dirname, './templates/viewfly-ts'), config.projectName)
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
