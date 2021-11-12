import fs = require('fs');
import Enmap = require('enmap');
import './src/local-data.js';

function load(client: Client) {
    let utils = require('./src/utils');
    let config = require('./config.js');

    if (!process.env.TOKEN)
        try {
            require('./config.ts');
        } catch (e) {
            console.error('No config file found, create it or use environnement variables.');
            process.exit(1);
        }
    else {
        if (!process.env.PREFIX) process.env.PREFIX = '$';
        config = { 'token': process.env.TOKEN, 'prefix': process.env.PREFIX };
    }
    if (!process.env.ALLOWED)
        try {
            config.allowed = require('./allowed.json').allowed;
        } catch (e) {
            config.allowed = [];
        }
    else
        config.allowed = process.env.ALLOWED;

    if (config.token !== client.lastToken) {
        client.lastToken = config.token;
        client.login(config.token);
    }

    utils.log('Logging in...');

    /* ----------------------------------------------- */

    client.commands = new Enmap();

    /* ----------------------------------------------- */

    let loaded = { events: [], commands: [] };

    let promise = new Promise(resolve => {
        fs.readdir('./src/events/', (err, files) => {
            if (err) return console.error;
            files.forEach(file => {
                if (!file.endsWith('.ts')) return;
                let path = require.resolve('./src/events/${file}');
                delete require.cache[path];
                let evt = require(path);
                let evtName = file.split('.')[0];
                loaded.events.push(evtName);
                client.on(evtName, evt.bind(null, client));
            });
            resolve(undefined);
        });
    });


    fs.readdir('./src/commands/', async (err, files) => {
        if (err) return console.error;
        files.forEach(file => {
            if (!file.endsWith('.ts')) return;
            let path = require.resolve(`./src/commands/${file}`);
            delete require.cache[path];
            let props = require(path);
            props.names.forEach(name => {
                client.commands.set(name, props);
            });
            let cmdName = file.split('.')[0];
            loaded.commands.push(cmdName);
        });
        promise.then(() => {
            utils.log(`Table of commands and events :\n${utils.showTable(loaded)}`);
        });
    });

    client.commands.set('reload', {
        run: function reload(cl, message, args) {
            client._events = {};

            load(cl);
            return message.channel.send('Reloaded.');
        },
        names: 'reload',
        help: {
            desc: 'Reload the modules',
            syntax: ''
        }
    });
    loaded.commands.push('reload');
}

import { Client, Intents } from 'discord.js';
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

client.lastToken = null;

load(client);

/* ----------------------------------------------- */

require('repl').start('> ').context.client = client;