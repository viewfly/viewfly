#!/usr/bin/env node
import { Command } from 'commander'
import { buildProject, packageVersion } from '../bundles/index.js'
const program = new Command()


program
  // 配置脚手架名称
  .name('viewfly')
  // 配置命令格式
  .usage(`<command> [option]`)
  // 配置版本号
  .version(packageVersion)

program.
  version(packageVersion,'-v, --version', 'output the current version')
    .option('-c, --create', 'through viewfly cli create A project', () => {
      buildProject()
    })
  // eslint-disable-next-line no-undef
    .parse(process.argv)
