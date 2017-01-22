'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _build = require('./build.js');

Object.defineProperty(exports, 'build', {
  enumerable: true,
  get: function get() {
    return _build.execute;
  }
});

var _deploy = require('./deploy.js');

Object.defineProperty(exports, 'deploy', {
  enumerable: true,
  get: function get() {
    return _deploy.execute;
  }
});

var _init = require('./init.js');

Object.defineProperty(exports, 'init', {
  enumerable: true,
  get: function get() {
    return _init.execute;
  }
});

var _login = require('./login.js');

Object.defineProperty(exports, 'login', {
  enumerable: true,
  get: function get() {
    return _login.execute;
  }
});

var _server = require('./server.js');

Object.defineProperty(exports, 'server', {
  enumerable: true,
  get: function get() {
    return _server.execute;
  }
});
//# sourceMappingURL=commands.js.map