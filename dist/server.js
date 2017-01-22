'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.execute = execute;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _q = require('q');

var _q2 = _interopRequireDefault(_q);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _watch = require('watch');

var _watch2 = _interopRequireDefault(_watch);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _compression = require('compression');

var _compression2 = _interopRequireDefault(_compression);

var _minimatch = require('minimatch');

var _minimatch2 = _interopRequireDefault(_minimatch);

var _hidefile = require('hidefile');

var _hidefile2 = _interopRequireDefault(_hidefile);

var _ngrok = require('ngrok');

var _ngrok2 = _interopRequireDefault(_ngrok);

var _socket = require('socket.io');

var _socket2 = _interopRequireDefault(_socket);

var _build = require('./build.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var assetPort = process.env.PORT || 31284;
var disablePublicTunnel = process.env.DISABLE_PUBLIC_TUNNEL || false;
var envFile = _path2.default.join(process.cwd(), '.chcpenv');

var app = (0, _express2.default)();
var chcpContext = void 0;
var io = void 0;
var sourceDirectory = void 0;
var ignoredFiles = void 0;

function execute(context) {
    var funcs = [];

    chcpContext = context;
    ignoredFiles = context.ignoredFiles;
    chcpContext.argv.localdev = true;
    sourceDirectory = chcpContext.sourceDirectory;

    funcs.push(function () {
        if (disablePublicTunnel) {
            return;
        }

        return publicTunnel(assetPort);
    });

    funcs.push(function (content_url) {
        if (!disablePublicTunnel) {
            context.argv.content_url = content_url;
        }
    });

    funcs.push(function (debugOpts) {
        if (debugOpts) {
            context.debug_url = debugOpts.debug_url;
            context.console_url = debugOpts.console_url;
        }

        return assetServer();
    });

    funcs.push(function (local_url) {
        console.log('local_url', local_url);
        context.local_url = local_url;

        return (0, _build.execute)(context);
    });

    funcs.push(function (config) {
        if (disablePublicTunnel) {
            updateLocalEnv({ content_url: config.content_url });
        }

        console.log('cordova-hcp local server available at: ' + context.local_url);
        console.log('cordova-hcp public server available at: ' + config.content_url);
    });

    return funcs.reduce(_q2.default.when, (0, _q2.default)('initial'));
}

function updateLocalEnv(localEnv) {
    localEnv.config_url = localEnv.content_url + '/chcp.json';

    var json = JSON.stringify(localEnv, null, 2);
    _fs2.default.writeFileSync(envFile, json);

    return localEnv;
}

function fileChangeFilter(file) {
    // Ignore changes in files from the ignore list
    var fileIsAllowed = true;
    var relativeFilePath = _path2.default.relative(chcpContext.sourceDirectory, file);

    for (var i = 0, len = ignoredFiles.length; i < len; i++) {
        if (_hidefile2.default.isHiddenSync(file) || (0, _minimatch2.default)(relativeFilePath, ignoredFiles[i])) {
            fileIsAllowed = false;
            break;
        }
    }

    return fileIsAllowed;
}

function assetServer() {
    var serverDfd = _q2.default.defer();
    var localUrl = 'http://localhost:' + assetPort;

    // If a lot of files changes at the same time, we only want to trigger the change event once.

    try {
        killCaches(app);
        serveStaticAssets(app);
        serveSocketIO(app);
        watchForFileChange();
        serverDfd.resolve(localUrl);
    } catch (err) {
        console.error('assetServer error: ', err);
        serverDfd.reject(err);
    }

    return serverDfd.promise;
}

function watchForFileChange() {
    // Monitor for file changes
    console.log('Checking: ', sourceDirectory);

    var _handleFileChange = _lodash2.default.debounce(handleFileChange, 500);

    _watch2.default.watchTree(sourceDirectory, { filter: fileChangeFilter }, function (f, curr, prev) {
        if ((typeof f === 'undefined' ? 'undefined' : _typeof(f)) == "object" && prev === null && curr === null) {
            // Finished walking the tree
            // console.log('Finished');
        } else {
            _handleFileChange(f);
        }
    });
}

function handleFileChange(file) {
    console.log('File changed: ', file);

    (0, _build.execute)(chcpContext).then(function (config) {
        console.log('Should trigger reload for build: ' + config.release);
        io.emit('release', { config: config });
    });
}

function serveSocketIO(app) {
    // Let's start the server
    io = (0, _socket2.default)(app.listen(assetPort));

    // Open up socket for file change notifications
    //io.set('transports', ['polling']);
    io.on('connection', function (socket) {
        console.log('a user connected');

        socket.on('disconnect', function () {
            console.log('user disconnected');
        });
    });
}

function serveStaticAssets(app) {
    // Static assets
    app.use((0, _compression2.default)());
    app.enable('view cache');
    app.use('/', _express2.default.static(sourceDirectory, { maxAge: 0 }));
}

function killCaches() {
    // Disable caches
    app.disable('etag');

    app.use(function (req, res, next) {
        req.headers['if-none-match'] = 'no-match-for-this';
        next();
    });
}

function publicTunnel(port) {
    var publicTunnelDfd = _q2.default.defer();

    // And make it accessible from the internet
    _ngrok2.default.connect(port, function (err, url) {
        if (err) {
            publicTunnelDfd.reject(err);

            return console.log('Could not create tunnel: ', err);
        }

        updateLocalEnv({ content_url: url });

        publicTunnelDfd.resolve(url);
    });

    return publicTunnelDfd.promise;
}
//# sourceMappingURL=server.js.map