"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.execute = execute;

var _es6Promise = require("es6-promise");

var _es6Promise2 = _interopRequireDefault(_es6Promise);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _prompt = require("prompt");

var _prompt2 = _interopRequireDefault(_prompt);

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_es6Promise2.default.polyfill();

var configFile = _path2.default.join(process.cwd(), 'cordova-hcp.json');

var name = {
    description: 'Enter project name (required)',
    pattern: /^[a-zA-Z\-\s0-9]+$/,
    message: 'Name must be only letters, numbers, space or dashes',
    required: true
};

var s3bucket = {
    description: 'Amazon S3 Bucket name (required for cordova-hcp deploy)',
    pattern: /^[a-zA-Z\-0-9.]+$/,
    message: 'Name must be only letters, numbers, or dashes'
};

var s3prefix = {
    description: 'Path in S3 bucket (optional for cordova-hcp deploy)',
    pattern: /^\/?(?:[a-zA-Z\-\s0-9.]+\/?)+\/$/,
    message: 'Path must be only letters, numbers, spaces, forward slashes or dashes and must end with a forward slash',
    ask: function ask() {
        return !!_prompt2.default.history('s3bucket').value;
    }
};

var s3region = {
    description: 'Amazon S3 region (required for cordova-hcp deploy)',
    pattern: /^(us-east-1|us-west-2|us-west-1|eu-west-1|eu-central-1|ap-southeast-1|ap-southeast-2|ap-northeast-1|sa-east-1)$/,
    default: 'us-east-1',
    message: 'Must be one of: us-east-1, us-west-2, us-west-1, eu-west-1, eu-central-1, ap-southeast-1, ap-southeast-2, ap-northeast-1, sa-east-1',
    ask: function ask() {
        return !!_prompt2.default.history('s3bucket').value;
    }
};

var ftpHost = {
    description: 'FTP Host (required for cordova-hcp deploy)',
    pattern: /^[a-zA-Z\-0-9.]+$/,
    message: 'Name must be only letters, numbers, or dashes'
};

var ftpPort = {
    description: 'FTP Port (optional for cordova-hcp deploy)',
    pattern: /^[0-9]+$/,
    message: 'Port must be a number',
    default: 21,
    ask: function ask() {
        return !!_prompt2.default.history('ftpHost').value;
    }
};

var ftpPath = {
    description: 'FTP Path (optional for cordova-hcp deploy)',
    pattern: /^\/?(?:[a-zA-Z\-\s0-9.]+\/?)+\/$/,
    message: 'Path must be only letters, numbers, spaces, forward slashes or dashes and must end with a forward slash',
    ask: function ask() {
        return !!_prompt2.default.history('ftpHost').value;
    }
};

var contentUrl = {
    description: 'Enter full URL to directory where cordova-hcp build result will be uploaded',
    pattern: new RegExp('^(?:https?://)(?:\\S+(?::\\S*)?@)?(?:(?!10(?:\\.\\d{1,3}){3})(?!127(?:\\.\\d{1,3}){3})(?!169\\.254(?:\\.\\d{1,3}){2})(?!192\\.168(?:\\.\\d{1,3}){2})(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\x00a1-\\xffff0-9]+-?)*[a-z\\x00a1-\\xffff0-9]+)(?:\\.(?:[a-z\\x00a1-\\xffff0-9]+-?)*[a-z\\x00a1-\\xffff0-9]+)*(?:\\.(?:[a-z\\x00a1-\\xffff]{2,})))(?::\\d{2,5})?(?:/[^\\s]*)?$', 'iu'),
    message: 'Must supply URL',
    default: function _default() {
        var bucket = _prompt2.default.history('s3bucket').value;
        var path = void 0;
        var url = void 0;

        if (bucket) {
            var region = _prompt2.default.history('s3region').value;
            path = _prompt2.default.history('s3prefix').value;
            url = "https://" + (region === 'us-east-1' ? 's3.amazonaws.com' : 's3-' + region + '.amazonaws.com') + "/" + bucket + "/";

            if (path) {
                url += path.replace(/^\/+/, '');
            }
        } else {
            var host = _prompt2.default.history('ftpHost').value;
            if (host) {
                path = _prompt2.default.history('ftpPath').value;
                url = "http://" + host + "/";

                if (path) {
                    url += path.replace(/^\/+/, '');
                }
            }
        }

        return url;
    }
};

var iosIdentifier = {
    description: 'IOS app identifier',
    pattern: /^[a-zA-Z\-0-9.]+$/
};

var androidIdentifier = {
    description: 'Android app identifier',
    pattern: /^[a-zA-Z\-0-9.]+$/
};

var update = {
    description: 'Update method (required)',
    pattern: /(start|resume|now)/,
    required: true,
    message: 'Needs to be one of start, resume or now',
    default: 'resume'
};

var schema = {
    properties: {
        name: name,
        s3bucket: s3bucket,
        s3prefix: s3prefix,
        s3region: s3region,
        ftpHost: ftpHost,
        ftpPort: ftpPort,
        ftpPath: ftpPath,
        contentUrl: contentUrl,
        ios_identifier: iosIdentifier,
        android_identifier: androidIdentifier,
        update: update
    }
};

function execute(context) {
    _prompt2.default.override = context.argv;
    _prompt2.default.message = 'Please provide';
    _prompt2.default.delimiter = ': ';
    _prompt2.default.start();

    (0, _utils.getInput)(_prompt2.default, schema).then(validateBucket).then(validateFtp).then(function (content) {
        return (0, _utils.writeFile)(configFile, content);
    }).then(done);
}

function validateBucket(result) {
    if (!result.s3bucket) {
        return _lodash2.default.omit(result, ['s3region', 's3bucket', 's3prefix']);
    }

    return result;
}

function validateFtp(result) {
    if (!result.ftpHost) {
        return _lodash2.default.omit(result, ['ftpHost', 'ftpPort', 'ftpPath']);
    }

    return result;
}

function done(err) {
    if (err) {
        return console.log(err);
    }
    console.log('Project initialized and cordova-hcp.json file created.');
    console.log('If you wish to exclude files from being published, specify them in .chcpignore');
    console.log('Before you can push updates you need to run "cordova-hcp login" in project directory');
}
//# sourceMappingURL=init.js.map