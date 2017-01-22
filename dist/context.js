'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.context = context;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fsExtra = require('fs-extra');

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ignoredFilesConfigPath = _path2.default.join(process.cwd(), '.chcpignore');
var defaultWwwFolder = _path2.default.join(process.cwd(), 'www');
var defaultCliConfig = _path2.default.join(process.cwd(), 'cordova-hcp.json');
var defaultIgnoreList = ['.DS_Store', 'node_modules/*', 'node_modules\\*', 'chcp.json', 'chcp.manifest', '.chcp*', '.gitignore', '.gitkeep', '.git', 'package.json'];

var Context = function Context(argv) {
    _classCallCheck(this, Context);

    this.argv = argv ? argv : {};
    this.defaultConfig = defaultCliConfig;
    this.sourceDirectory = getSourceDirectory(argv);
    this.manifestFilePath = _path2.default.join(this.sourceDirectory, 'chcp.manifest');
    this.projectsConfigFilePath = _path2.default.join(this.sourceDirectory, 'chcp.json');
    this.ignoredFiles = getIgnoredFiles();
};

function context(argv) {
    return new Context(argv);
}

function getSourceDirectory(argv) {
    var consoleArgs = argv._;

    if (!consoleArgs || consoleArgs.length !== 2) {
        return defaultWwwFolder;
    }

    return _path2.default.join(process.cwd(), consoleArgs[1]);
}

function getIgnoredFiles() {
    var projectIgnore = readIgnoredFilesProjectConfig(ignoredFilesConfigPath);
    var ignoredList = _lodash2.default.union(defaultIgnoreList, projectIgnore);

    // remove comments and empty items
    _lodash2.default.remove(ignoredList, function (item) {
        return item.indexOf('#') === 0 || _lodash2.default.trim(item).length === 0;
    });

    return ignoredList;
}

function readIgnoredFilesProjectConfig(pathToConfig) {
    try {
        return _trim(_fsExtra2.default.readFileSync(pathToConfig, 'utf8')).split(/\n/);
    } catch (e) {}

    return [];
}
//# sourceMappingURL=context.js.map