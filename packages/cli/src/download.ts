import clone from 'git-clone'
import fs from 'fs-extra'
import path from 'path'
import ora from 'ora'

export const downloadTemplate = (
  templateGitUrl: string,
  downloadPath: string
) => {
  const loading = ora('download template')
  return new Promise((resolve) => {
    loading.start('start download template')

    clone(templateGitUrl, downloadPath, {
      checkout: 'master',
      shallow: true,
    }, ()=>{
      fs.removeSync(path.join(downloadPath, '.git'))
      loading.succeed('download success')
      loading.stop()
      resolve('success')
    })
  })
}
