'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.execute = execute;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _q = require('q');

var _q2 = _interopRequireDefault(_q);

var _readdirp = require('readdirp');

var _readdirp2 = _interopRequireDefault(_readdirp);

var _ftpClient = require('ftp-client');

var _ftpClient2 = _interopRequireDefault(_ftpClient);

var _s3SyncAws = require('s3-sync-aws');

var _s3SyncAws2 = _interopRequireDefault(_s3SyncAws);

var _build = require('./build.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var deploymentModes = {
    s3: uploadToS3,
    ftp: uploadToFTP
};

var loginFile = _path2.default.join(process.cwd(), '.chcplogin');

function execute(context) {
    var executeDfd = _q2.default.defer();

    (0, _build.execute)(context).then(function () {
        deploy(context).then(function () {
            executeDfd.resolve();
        });
    });

    return executeDfd.promise;
}

function deploy(context) {
    var config = void 0;
    var credentials = void 0;

    try {
        config = _fs2.default.readFileSync(context.defaultConfig, 'utf8');
        config = JSON.parse(config);

        if (!config) {
            console.log('You need to run "cordova-hcp init" before you can run "cordova-hcp deploy".');
            console.log('Both commands needs to be invoked in the root of the project directory.');
            process.exit(0);
        }
    } catch (e) {
        console.log('Cannot parse cordova-hcp.json. Did you run cordova-hcp init?');
        process.exit(0);
    }

    try {
        credentials = _fs2.default.readFileSync(loginFile, 'utf8');
        credentials = JSON.parse(credentials);

        if (!credentials) {
            console.log('You need to run "cordova-hcp login" before you can run "cordova-hcp deploy".');
            process.exit(0);
        }
    } catch (e) {
        console.log('Cannot parse .chcplogin: ', e);
        process.exit(0);
    }

    var pushMode = credentials.pushMode;
    try {
        return deploymentModes[pushMode](context, config, credentials[pushMode]);
    } catch (e) {
        console.error('unsupported deployment method ', e);
        process.exit(0);
    }
}

function uploadToS3(context, config, credentials) {
    var executeDfd = _q2.default.defer();
    var ignore = context.ignoredFiles.filter(function (ignoredFile) {
        return !ignoredFile.match(/^chcp/);
    }).map(function (ignoredFile) {
        return '!' + ignoredFile;
    });

    var files = (0, _readdirp2.default)({
        root: context.sourceDirectory,
        fileFilter: ignore
    });

    var uploader = (0, _s3SyncAws2.default)({
        key: credentials.key,
        secret: credentials.secret,
        region: config.s3region,
        bucket: config.s3bucket,
        prefix: config.s3prefix,
        acl: 'public-read',
        headers: {
            CacheControl: 'no-cache, no-store, must-revalidate',
            Expires: 0
        },
        concurrency: 20
    });

    uploader.on('data', function (file) {
        if (file.fresh) {
            console.log("Updated " + file.fullPath + ' -> ' + file.url);
        }
    });

    uploader.on('end', function () {
        console.log("Deploy done");
        executeDfd.resolve();
    });

    uploader.on('error', function (err) {
        console.error("unable to sync:", err.stack);
        executeDfd.reject();
    });

    uploader.on('fail', function (err) {
        console.error("unable to sync:", err);
        executeDfd.reject();
    });

    //uploader.on('progress', function() {
    //  var progress = uploader.progressTotal - uploader.progressAmount;
    //  console.log("progress", progress, uploader.progressTotal, uploader.progressAmount);
    //});

    files.pipe(uploader);
    console.log('Deploy started');
    return executeDfd.promise;
}

function uploadToFTP(context, config, credentials) {
    var client = new _ftpClient2.default({
        host: config.ftpHost,
        port: config.ftpPort,
        user: credentials.username,
        password: credentials.password
    }, {
        logging: 'basic'
    });

    var executeDfd = _q2.default.defer();

    client.connect(function () {
        client.upload(context.sourceDirectory + '/**', config.ftpPath, {
            baseDir: context.sourceDirectory,
            overwrite: 'all'
        }, function (result) {
            if (!_lodash2.default.isEmpty(result.errors)) {
                console.error('Some files could not be uploaded: ', result.errors);
                return executeDfd.reject();
            }
            executeDfd.resolve();
        });
    });
    return executeDfd;
}
//# sourceMappingURL=deploy.js.map