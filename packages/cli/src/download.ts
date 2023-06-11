import gitclone from 'git-clone/promise'
import fs from 'fs-extra'
import path from 'path'
import ora from 'ora'

export const downloadTemplate = (
  templateGitUrl: string,
  downloadPath: string
) => {
  const loading = ora('download template')
  return new Promise((resolve, reject) => {
    loading.start('start download template')

    gitclone(templateGitUrl, downloadPath, {
      checkout: 'master',
      shallow: true,
    })
      .then(() => {
        fs.removeSync(path.join(downloadPath, '.git'))
        loading.succeed('download success')
        loading.stop()

        resolve('download success')
      })
      .catch((error) => {
        loading.stop()
        loading.fail('download fail')

        reject(error)
      })
  })
}
