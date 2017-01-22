import path from 'path';
import fs from 'fs-extra';
import _ from 'lodash';

const ignoredFilesConfigPath = path.join(process.cwd(), '.chcpignore');
const defaultWwwFolder = path.join(process.cwd(), 'www');
const defaultCliConfig = path.join(process.cwd(), 'cordova-hcp.json');
const defaultIgnoreList = [
    '.DS_Store',
    'node_modules/*',
    'node_modules\\*',
    'chcp.json',
    'chcp.manifest',
    '.chcp*',
    '.gitignore',
    '.gitkeep',
    '.git',
    'package.json'
];

class Context {
    constructor(argv) {
        this.argv = argv ? argv : {};
        this.defaultConfig = defaultCliConfig;
        this.sourceDirectory = getSourceDirectory(argv);
        this.manifestFilePath = path.join(this.sourceDirectory, 'chcp.manifest');
        this.projectsConfigFilePath = path.join(this.sourceDirectory, 'chcp.json');
        this.ignoredFiles = getIgnoredFiles();
    }
}

export function context(argv) {
    return new Context(argv);
}

function getSourceDirectory(argv) {
    const consoleArgs = argv._;

    if (!consoleArgs || consoleArgs.length !== 2) {
        return defaultWwwFolder;
    }

    return path.join(process.cwd(), consoleArgs[1]);
}

function getIgnoredFiles() {
    const projectIgnore = readIgnoredFilesProjectConfig(ignoredFilesConfigPath);
    const ignoredList = _.union(defaultIgnoreList, projectIgnore);

    // remove comments and empty items
    _.remove(ignoredList, function (item) {
        return item.indexOf('#') === 0 || _.trim(item).length === 0;
    });

    return ignoredList;
}

function readIgnoredFilesProjectConfig(pathToConfig) {
    try {
        return _trim(fs.readFileSync(pathToConfig, 'utf8')).split(/\n/);
    } catch (e) {
    }

    return [];
}
