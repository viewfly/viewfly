import clone from 'git-clone'
import fs from 'fs-extra'
import path from 'path'
import ora from 'ora'

export const downloadTemplate = (
  templateGitUrl: string,
  downloadPath: string,
  branch: string
) => {
  const loading = ora('download template')
  return new Promise((resolve) => {
    loading.start('start download template')

    clone(templateGitUrl, downloadPath, {
      checkout: branch,
    }, ()=>{
      loading.succeed('download success')
      loading.stop()
      setTimeout(() => fs.removeSync(path.join(downloadPath, '.git')), 500)
      resolve('success')
    })
  })
}
