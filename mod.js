// can be modified to deconflict with other mods
const headerId = 'restart';
const restartId = 'restart';

// file name to log spawned process output to, or null to disable logging
const logFile = null;

const cp = require('child_process');
const fs = require('fs');

function dependenciesLoaded() {
    // localization
    ig.lang.labels.sc.gui.options.controls.keys[restartId] = 'Restart';
    ig.lang.labels.sc.gui.options.headers[headerId] = 'restart';

    // add option
    const tab = 5;
    const defaultKey = 'L'.charCodeAt(0);
    const defaultKeys = {key1: defaultKey, key2: undefined};
    simplify.options.addEntry('keys-'+restartId, 'CONTROLS', defaultKeys, tab, undefined, undefined, headerId);
    ig.input.bind(defaultKey, restartId); // have to manually bind default keys
    simplify.options.reload(); // apply changes

    // listen for key press
    simplify.registerUpdate(() => {
        if(ig.input.state(restartId)) {
            restart();
        }
    });
}

function getScriptsDir() {
    for(const mod of window.activeMods) {
        if(mod.name === 'Restart Button') {
            return mod.baseDirectory + 'scripts/';
        }
    }
    throw new Error('Failed to find Restart Button mod, did the name change?');
}

function getRestartProcessCmd() {
    const dir = getScriptsDir();

    switch(process.platform) {
        case 'win32':
            // Theoretically doing something like this should work, but I could not get it to
            //     cp.spawn(file, [], {shell:true, detached:true, windowsHide:true})
            // github issue that may be relavent: https://github.com/nodejs/node/issues/21825
            // instead I am using `start /B` as a workaround to get a hidden detached process
            return {
                shell: true,
                detached: false,
                file: 'start',
                args: ['/B', dir.replace(/\//g, '\\') + 'windows.bat']
            };
        case 'linux':
            return {
                shell: false,
                detached: true,
                file: dir + 'linux.sh',
                args: []
            };
        case 'darwin':
            // I am still confused how this works without detaching,
            // but I will leave it as is until this does not work for someone
            return {
                shell: false,
                detached: false,
                file: dir + 'macos.sh',
                args: []
            };
        default:
            throw new Error('Restarting the process is not supported for \''+process.platform+'\' systems yet.');
    }
}

const cmd = getRestartProcessCmd();

const listeners = [];
function addListener(listener) {
    listeners.push(listener);
}

function restart(skipListeners = false) {
    if(!skipListeners) {
        for(const listener of listeners) {
            listener();
        }
    }
    const options = {
        shell: cmd.shell,
        stdio: 'ignore',
        detached: cmd.detached
    };
    if(logFile) {
        const log = fs.openSync(logFile, 'w');
        options.stdio = ['ignore', log, log];
    }
    cp.spawn(cmd.file, cmd.args, options).unref();
    window.parent.nw.App.quit();
}

// public api
window.restartButton = {addListener, restart};

// wait for dependencies to load
document.body.addEventListener('modsLoaded', dependenciesLoaded);
