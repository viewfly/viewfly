import chalk from 'chalk'
import figlet from 'figlet'

export function banner() {
  console.log(chalk.green(figlet('Viewfly', {
    horizontalLayout: 'full'
  })))
}
