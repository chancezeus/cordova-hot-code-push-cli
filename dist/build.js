'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.execute = execute;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fsExtra = require('fs-extra');

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _q = require('q');

var _q2 = _interopRequireDefault(_q);

var _recursiveReaddir = require('recursive-readdir');

var _recursiveReaddir2 = _interopRequireDefault(_recursiveReaddir);

var _hidefile = require('hidefile');

var _hidefile2 = _interopRequireDefault(_hidefile);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var chcpContext = void 0;

function execute(context) {
    var executeDfd = _q2.default.defer();
    var config = prepareConfig(context);
    var ignore = context.ignoredFiles;

    chcpContext = context;

    (0, _recursiveReaddir2.default)(context.sourceDirectory, ignore, function (err, files) {
        var hashQueue = files.filter(function (file) {
            return !_hidefile2.default.isHiddenSync(file);
        }).map(function (file) {
            return hashFile.bind(null, file);
        });

        _async2.default.parallelLimit(hashQueue, 10, function (err, result) {
            if (err) {
                executeDfd.reject(err);
            }

            result.sort(function (a, b) {
                return a.file.localeCompare(b.file);
            });

            var json = JSON.stringify(result, null, 2);
            _fsExtra2.default.writeFile(context.manifestFilePath, json, function (err) {
                if (err) {
                    executeDfd.reject(err);
                }

                if (context.argv && context.argv.localdev) {
                    config.update = 'now';
                }

                var json = JSON.stringify(config, null, 2);
                _fsExtra2.default.writeFile(chcpContext.projectsConfigFilePath, json, function (err) {
                    if (err) {
                        executeDfd.reject(err);
                    }

                    console.log('Build ' + config.release + ' created in ' + chcpContext.sourceDirectory);
                    executeDfd.resolve(config);
                });
            });
        });
    });

    return executeDfd.promise;
}

function prepareConfig(context) {
    var config = void 0;

    try {
        config = JSON.parse(_fsExtra2.default.readFileSync(context.defaultConfig, 'utf8'));
        config.release = process.env.VERSION || calculateTimestamp();
    } catch (e) {
        config = {
            autogenerated: true,
            release: calculateTimestamp()
        };
    }

    if (context.argv && context.argv.content_url) {
        config.content_url = context.argv.content_url;
    }

    return config;
}

function calculateTimestamp() {
    var currentdate = new Date();

    return currentdate.getFullYear() + '.' + (currentdate.getMonth() + 1 < 10 ? '0' + (currentdate.getMonth() + 1) : currentdate.getMonth() + 1) + '.' + (currentdate.getDate() < 10 ? '0' + currentdate.getDate() : currentdate.getDate()) + '-' + (currentdate.getHours() < 10 ? '0' + currentdate.getHours() : currentdate.getHours()) + '.' + (currentdate.getMinutes() < 10 ? '0' + currentdate.getMinutes() : currentdate.getMinutes()) + '.' + (currentdate.getSeconds() < 10 ? '0' + currentdate.getSeconds() : currentdate.getSeconds());
}

function hashFile(filename, callback) {
    var hash = _crypto2.default.createHash('md5');
    var stream = _fsExtra2.default.createReadStream(filename);

    stream.on('data', function (data) {
        hash.update(data, 'utf8');
    });

    stream.on('end', function () {
        var result = hash.digest('hex');
        var file = _path2.default.relative(chcpContext.sourceDirectory, filename).replace(new RegExp("\\\\", "g"), "/");

        callback(null, {
            file: file,
            hash: result
        });
    });
}
//# sourceMappingURL=build.js.map