#! /usr/bin/env node
'use strict';

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _yargs = require('yargs');

var _dotenv = require('dotenv');

var _dotenv2 = _interopRequireDefault(_dotenv);

var _context = require('./context.js');

var _commands = require('./commands.js');

var commands = _interopRequireWildcard(_commands);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_dotenv2.default.config();

var cmd = _yargs.argv._[0];

switch (cmd) {
  case 'build':
  case 'login':
  case 'init':
  case 'server':
  case 'deploy':
    console.log('Running ' + cmd);

    commands[cmd]((0, _context.context)(_yargs.argv));
    break;
  default:
    console.log('TODO: Should print usage instructions.');
    process.exit(0);
}
//# sourceMappingURL=index.js.map