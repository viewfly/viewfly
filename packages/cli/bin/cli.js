#!/usr/bin/env node
import { Command } from 'commander'
import {buildProject, packageVersion } from '../bundles/index.js'
const program = new Command()


program.
  version(packageVersion,'-v, --version', 'output the current version')
    .option('-c, --create', 'through Viewfly cli create A project', () => {
      buildProject()
    })
  // eslint-disable-next-line no-undef
    .parse(process.argv)
