import _ from 'lodash';
import path from 'path';
import fs from 'fs';
import Q from 'q';
import readdirp from 'readdirp';
import FtpClient from 'ftp-client';
import s3sync from 's3-sync-aws';
import {execute as build} from './build.js';

const deploymentModes = {
    s3: uploadToS3,
    ftp: uploadToFTP
};

const loginFile = path.join(process.cwd(), '.chcplogin');

export function execute(context) {
    const executeDfd = Q.defer();

    build(context).then(function () {
        deploy(context).then(function () {
            executeDfd.resolve();
        });
    });

    return executeDfd.promise;
}

function deploy(context) {
    let config;
    let credentials;

    try {
        config = fs.readFileSync(context.defaultConfig, 'utf8');
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
        credentials = fs.readFileSync(loginFile, 'utf8');
        credentials = JSON.parse(credentials);

        if (!credentials) {
            console.log('You need to run "cordova-hcp login" before you can run "cordova-hcp deploy".');
            process.exit(0);
        }
    } catch (e) {
        console.log('Cannot parse .chcplogin: ', e);
        process.exit(0);
    }

    const pushMode = credentials.pushMode;
    try {
        return deploymentModes[pushMode](context, config, credentials[pushMode]);
    } catch (e) {
        console.error('unsupported deployment method ', e);
        process.exit(0);
    }
}

function uploadToS3(context, config, credentials) {
    const executeDfd = Q.defer();
    let ignore = context.ignoredFiles.filter(ignoredFile => !ignoredFile.match(/^chcp/)).map(ignoredFile => `!${ignoredFile}`);

    const files = readdirp({
        root: context.sourceDirectory,
        fileFilter: ignore
    });

    const uploader = s3sync({
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
            console.log("Updated " + file.fullPath + ' -> ' + file.url)
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
    const client = new FtpClient({
        host: config.ftpHost,
        port: config.ftpPort,
        user: credentials.username,
        password: credentials.password
    }, {
        logging: 'basic'
    });

    const executeDfd = Q.defer();

    client.connect(function () {
        client.upload(`${context.sourceDirectory}/**`, config.ftpPath, {
            baseDir: context.sourceDirectory,
            overwrite: 'all'
        }, function (result) {
            if (!_.isEmpty(result.errors)) {
                console.error('Some files could not be uploaded: ', result.errors);
                return executeDfd.reject();
            }
            executeDfd.resolve();
        });
    });
    return executeDfd;
}
