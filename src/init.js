import es6promise from "es6-promise";
import path from "path";
import prompt from "prompt";
import _ from "lodash";
import {getInput, writeFile} from "./utils";

es6promise.polyfill();

const configFile = path.join(process.cwd(), 'cordova-hcp.json');

const name = {
    description: 'Enter project name (required)',
    pattern: /^[a-zA-Z\-\s0-9]+$/,
    message: 'Name must be only letters, numbers, space or dashes',
    required: true,
};

const s3bucket = {
    description: 'Amazon S3 Bucket name (required for cordova-hcp deploy)',
    pattern: /^[a-zA-Z\-0-9.]+$/,
    message: 'Name must be only letters, numbers, or dashes',
};

const s3prefix = {
    description: 'Path in S3 bucket (optional for cordova-hcp deploy)',
    pattern: /^\/?(?:[a-zA-Z\-\s0-9.]+\/?)+\/$/,
    message: 'Path must be only letters, numbers, spaces, forward slashes or dashes and must end with a forward slash',
    ask: function() {
        return !!prompt.history('s3bucket').value;
    }
};

const s3region = {
    description: 'Amazon S3 region (required for cordova-hcp deploy)',
    pattern: /^(us-east-1|us-west-2|us-west-1|eu-west-1|eu-central-1|ap-southeast-1|ap-southeast-2|ap-northeast-1|sa-east-1)$/,
    default: 'us-east-1',
    message: 'Must be one of: us-east-1, us-west-2, us-west-1, eu-west-1, eu-central-1, ap-southeast-1, ap-southeast-2, ap-northeast-1, sa-east-1',
    ask: function() {
        return !!prompt.history('s3bucket').value;
    }
};

const ftpHost = {
    description: 'FTP Host (required for cordova-hcp deploy)',
    pattern: /^[a-zA-Z\-0-9.]+$/,
    message: 'Name must be only letters, numbers, or dashes',
};

const ftpPort = {
    description: 'FTP Port (optional for cordova-hcp deploy)',
    pattern: /^[0-9]+$/,
    message: 'Port must be a number',
    default: 21,
    ask: function() {
        return !!prompt.history('ftpHost').value;
    }
};

const ftpPath = {
    description: 'FTP Path (optional for cordova-hcp deploy)',
    pattern: /^\/?(?:[a-zA-Z\-\s0-9.]+\/?)+\/$/,
    message: 'Path must be only letters, numbers, spaces, forward slashes or dashes and must end with a forward slash',
    ask: function() {
        return !!prompt.history('ftpHost').value;
    }
};

const contentUrl = {
    description: 'Enter full URL to directory where cordova-hcp build result will be uploaded',
    pattern: new RegExp('^(?:https?://)(?:\\S+(?::\\S*)?@)?(?:(?!10(?:\\.\\d{1,3}){3})(?!127(?:\\.\\d{1,3}){3})(?!169\\.254(?:\\.\\d{1,3}){2})(?!192\\.168(?:\\.\\d{1,3}){2})(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\x00a1-\\xffff0-9]+-?)*[a-z\\x00a1-\\xffff0-9]+)(?:\\.(?:[a-z\\x00a1-\\xffff0-9]+-?)*[a-z\\x00a1-\\xffff0-9]+)*(?:\\.(?:[a-z\\x00a1-\\xffff]{2,})))(?::\\d{2,5})?(?:/[^\\s]*)?$', 'iu'),
    message: 'Must supply URL',
    default: function() {
        const bucket = prompt.history('s3bucket').value;
        let path;
        let url;

        if (bucket) {
            const region = prompt.history('s3region').value;
            path = prompt.history('s3prefix').value;
            url = `https://${region === 'us-east-1' ? 's3.amazonaws.com' : 's3-' + region + '.amazonaws.com'}/${bucket}/`;

            if (path) {
                url += path.replace(/^\/+/, '');
            }
        } else {
            const host = prompt.history('ftpHost').value;
            if (host) {
                path = prompt.history('ftpPath').value;
                url = `http://${host}/`;

                if (path) {
                    url += path.replace(/^\/+/, '');
                }
            }
        }

        return url;
    }
};

const iosIdentifier = {
    description: 'IOS app identifier',
    pattern: /^[a-zA-Z\-0-9.]+$/,
};

const androidIdentifier = {
    description: 'Android app identifier',
    pattern: /^[a-zA-Z\-0-9.]+$/,
};

const update = {
    description: 'Update method (required)',
    pattern: /(start|resume|now)/,
    required: true,
    message: 'Needs to be one of start, resume or now',
    default: 'resume',
};

const schema = {
    properties: {
        name,
        s3bucket,
        s3prefix,
        s3region,
        ftpHost,
        ftpPort,
        ftpPath,
        contentUrl,
        ios_identifier: iosIdentifier,
        android_identifier: androidIdentifier,
        update
    },
};

export function execute(context) {
    prompt.override = context.argv;
    prompt.message = 'Please provide';
    prompt.delimiter = ': ';
    prompt.start();

    getInput(prompt, schema)
        .then(validateBucket)
        .then(validateFtp)
        .then(content => writeFile(configFile, content))
        .then(done);
}

function validateBucket(result) {
    if (!result.s3bucket) {
        return _.omit(result, ['s3region', 's3bucket', 's3prefix']);
    }

    return result;
}

function validateFtp(result) {
    if (!result.ftpHost) {
        return _.omit(result, ['ftpHost', 'ftpPort', 'ftpPath']);
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
