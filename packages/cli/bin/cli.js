#!/usr/bin/env node
import { Command } from 'commander'
import {buildProject} from '../bundles/index.js'

const program = new Command()

program.
  version('0.0.1','-v, --version', 'output the current version')
    .option('-c, --create', 'through Viewfly cli create A project', () => {
      buildProject()
    })
  // eslint-disable-next-line no-undef
    .parse(process.argv)
