import path from "path";
import prompt from "prompt";
import fs from "fs";
import {getInput, writeFile} from "./utils";

const configFile = path.join(process.cwd(), 'cordova-hcp.json');
const loginFile = path.join(process.cwd(), '.chcplogin');
let config;

const loginSchema = {
    properties: {
        pushMode: {
            description: 'Choose a method to push your code: (s3 | ftp)',
            message: 'You need to choose a method to push your code',
            required: true,
            pattern: /(s3|ftp)/,
            default: function() {
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
                    ask: function() {
                        return prompt.history('pushMode').value == 'ftp';
                    }
                },
                password: {
                    description: 'Enter FTP password (required)',
                    message: 'FTP password',
                    hidden: true,
                    required: true,
                    ask: function() {
                        return prompt.history('pushMode').value == 'ftp';
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
                    ask: function () {
                        return prompt.history('pushMode').value == 's3';
                    }
                },
                secret: {
                    description: 'Amazon Secret Access Key',
                    message: 'You need to provide the Secret Access Key',
                    hidden: true,
                    required: true,
                    ask: function () {
                        return prompt.history('pushMode').value == 's3';
                    }
                }
            }
        }
    }
};

export function execute(context) {
    validateConfig();

    prompt.override = context.argv;
    prompt.message = 'Please provide';
    prompt.delimiter = ': ';
    prompt.start();

    getInput(prompt, loginSchema)
        .then(content => writeFile(loginFile, content))
        .then(done);
}

function validateConfig() {
    try {
        config = fs.readFileSync(configFile, 'utf8');

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
