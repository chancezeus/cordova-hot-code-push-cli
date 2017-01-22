#! /usr/bin/env node

import path from 'path';
import {argv} from 'yargs';
import dotenv from 'dotenv';
import {context} from './context.js';
import * as commands from './commands.js';

dotenv.config();

const cmd = argv._[0];

switch(cmd) {
  case 'build':
  case 'login':
  case 'init':
  case 'server':
  case 'deploy':
    console.log('Running ' + cmd);

    commands[cmd](context(argv));
    break;
  default:
    console.log('TODO: Should print usage instructions.');
    process.exit(0);
}
