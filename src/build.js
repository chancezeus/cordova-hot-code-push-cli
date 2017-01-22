import path from 'path';
import fs from 'fs-extra';
import async from 'async';
import crypto from 'crypto';
import Q from 'q';
import recursive from 'recursive-readdir';
import hidefile from 'hidefile';

let chcpContext;

export function execute(context) {
    const executeDfd = Q.defer();
    const config = prepareConfig(context);
    const ignore = context.ignoredFiles;

    chcpContext = context;

    recursive(context.sourceDirectory, ignore, function (err, files) {
        const hashQueue = files.filter(file => !hidefile.isHiddenSync(file)).map((file) => hashFile.bind(null, file));

        async.parallelLimit(hashQueue, 10, function (err, result) {
            if (err) {
                executeDfd.reject(err);
            }

            result.sort((a, b) => {
                return a.file.localeCompare(b.file)
            });

            const json = JSON.stringify(result, null, 2);
            fs.writeFile(context.manifestFilePath, json, function (err) {
                if (err) {
                    executeDfd.reject(err);
                }

                if (context.argv && context.argv.localdev) {
                    config.update = 'now';
                }

                const json = JSON.stringify(config, null, 2);
                fs.writeFile(chcpContext.projectsConfigFilePath, json, function (err) {
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
    let config;

    try {
        config = JSON.parse(fs.readFileSync(context.defaultConfig, 'utf8'));
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
    const currentdate = new Date();

    return currentdate.getFullYear() + '.' +
        (((currentdate.getMonth() + 1) < 10) ? '0' + (currentdate.getMonth() + 1) : (currentdate.getMonth() + 1)) + '.' +
        ((currentdate.getDate() < 10) ? '0' + currentdate.getDate() : currentdate.getDate()) + '-' +
        ((currentdate.getHours() < 10) ? '0' + currentdate.getHours() : currentdate.getHours()) + '.' +
        ((currentdate.getMinutes() < 10) ? '0' + currentdate.getMinutes() : currentdate.getMinutes()) + '.' +
        ((currentdate.getSeconds() < 10) ? '0' + currentdate.getSeconds() : currentdate.getSeconds());
}

function hashFile(filename, callback) {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filename);

    stream.on('data', function (data) {
        hash.update(data, 'utf8');
    });

    stream.on('end', function () {
        const result = hash.digest('hex');
        const file = path.relative(chcpContext.sourceDirectory, filename).replace(new RegExp("\\\\", "g"), "/");

        callback(null, {
            file: file,
            hash: result
        });
    });
}
