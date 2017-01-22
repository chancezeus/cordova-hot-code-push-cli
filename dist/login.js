"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.execute = execute;

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _prompt = require("prompt");

var _prompt2 = _interopRequireDefault(_prompt);

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var configFile = _path2.default.join(process.cwd(), 'cordova-hcp.json');
var loginFile = _path2.default.join(process.cwd(), '.chcplogin');
var config = void 0;

var loginSchema = {
    properties: {
        pushMode: {
            description: 'Choose a method to push your code: (s3 | ftp)',
            message: 'You need to choose a method to push your code',
            required: true,
            pattern: /(s3|ftp)/,
            default: function _default() {
                if (config.s3bucket) {
                    console.log('s3');
                    return 's3';
                }

                if (config.ftpHost) {
                    console.log('ftp');
                    return 'ftp';
                }
            }
        },
        ftp: {
            properties: {
                username: {
                    description: 'Enter FTP username (required)',
                    message: 'FTP username',
                    required: true,
                    ask: function ask() {
                        return _prompt2.default.history('pushMode').value == 'ftp';
                    }
                },
                password: {
                    description: 'Enter FTP password (required)',
                    message: 'FTP password',
                    hidden: true,
                    required: true,
                    ask: function ask() {
                        return _prompt2.default.history('pushMode').value == 'ftp';
                    }
                }
            }
        },
        s3: {
            properties: {
                key: {
                    description: 'Amazon Access Key Id',
                    message: 'You need to provide the Amazon Access Key Id',
                    required: true,
                    ask: function ask() {
                        return _prompt2.default.history('pushMode').value == 's3';
                    }
                },
                secret: {
                    description: 'Amazon Secret Access Key',
                    message: 'You need to provide the Secret Access Key',
                    hidden: true,
                    required: true,
                    ask: function ask() {
                        return _prompt2.default.history('pushMode').value == 's3';
                    }
                }
            }
        }
    }
};

function execute(context) {
    validateConfig();

    _prompt2.default.override = context.argv;
    _prompt2.default.message = 'Please provide';
    _prompt2.default.delimiter = ': ';
    _prompt2.default.start();

    (0, _utils.getInput)(_prompt2.default, loginSchema).then(function (content) {
        return (0, _utils.writeFile)(loginFile, content);
    }).then(done);
}

function validateConfig() {
    try {
        config = _fs2.default.readFileSync(configFile, 'utf8');

        if (!config) {
            console.log('You need to run "cordova-hcp init" before you can run "cordova-hcp login".');
            console.log('Both commands needs to be invoked in the root of the project directory.');
            process.exit(0);
        }
    } catch (e) {
        console.log('Cannot parse cordova-hcp.json. Did you run cordova-hcp init?');
        process.exit(0);
    }
}

function done(err) {
    if (err) {
        return console.log(err);
    }

    console.log('Project initialized and .chcplogin file created.');
    console.log('You SHOULD add .chcplogin to your .gitignore');
    console.log('( echo \'.chcplogin\' >> .gitignore )');
}
//# sourceMappingURL=login.js.map