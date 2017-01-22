import path from 'path';
import Q from 'q';
import _ from 'lodash';
import fs from 'fs';
import watch from 'watch';
import express from 'express';
import compression from 'compression';
import minimatch from 'minimatch';
import hidefile from 'hidefile';
import ngrok from 'ngrok';
import socketIo from 'socket.io';
import {execute as build} from './build.js';

const assetPort = process.env.PORT || 31284;
const disablePublicTunnel = process.env.DISABLE_PUBLIC_TUNNEL || false;
const envFile = path.join(process.cwd(), '.chcpenv');

const app = express();
let chcpContext;
let io;
let sourceDirectory;
let ignoredFiles;

export function execute(context) {
    const funcs = [];

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

        return build(context);
    });

    funcs.push(function (config) {
        if (disablePublicTunnel) {
            updateLocalEnv({content_url: config.content_url});
        }

        console.log('cordova-hcp local server available at: ' + context.local_url);
        console.log('cordova-hcp public server available at: ' + config.content_url);
    });

    return funcs.reduce(Q.when, Q('initial'));
}

function updateLocalEnv(localEnv) {
    localEnv.config_url = localEnv.content_url + '/chcp.json';

    const json = JSON.stringify(localEnv, null, 2);
    fs.writeFileSync(envFile, json);

    return localEnv;
}

function fileChangeFilter(file) {
    // Ignore changes in files from the ignore list
    let fileIsAllowed = true;
    const relativeFilePath = path.relative(chcpContext.sourceDirectory, file);

    for (let i = 0, len = ignoredFiles.length; i < len; i++) {
        if (hidefile.isHiddenSync(file) || minimatch(relativeFilePath, ignoredFiles[i])) {
            fileIsAllowed = false;
            break;
        }
    }

    return fileIsAllowed;
}

function assetServer() {
    const serverDfd = Q.defer();
    const localUrl = 'http://localhost:' + assetPort;

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

    const _handleFileChange = _.debounce(handleFileChange, 500);

    watch.watchTree(sourceDirectory, {filter: fileChangeFilter}, function (f, curr, prev) {
        if (typeof f == "object" && prev === null && curr === null) {
            // Finished walking the tree
            // console.log('Finished');
        } else {
            _handleFileChange(f);
        }
    });
}

function handleFileChange(file) {
    console.log('File changed: ', file);

    build(chcpContext).then(function (config) {
        console.log('Should trigger reload for build: ' + config.release);
        io.emit('release', {config: config});
    });
}

function serveSocketIO(app) {
    // Let's start the server
    io = socketIo(app.listen(assetPort));

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
    app.use(compression());
    app.enable('view cache');
    app.use('/', express.static(sourceDirectory, {maxAge: 0}));
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
    const publicTunnelDfd = Q.defer();

    // And make it accessible from the internet
    ngrok.connect(port, function (err, url) {
        if (err) {
            publicTunnelDfd.reject(err);

            return console.log('Could not create tunnel: ', err);
        }

        updateLocalEnv({content_url: url});

        publicTunnelDfd.resolve(url);
    });

    return publicTunnelDfd.promise;
}
