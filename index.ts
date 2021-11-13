import fs from 'fs';
import Enmap from 'enmap';
import { Client, Command } from './src/types.js';
import './src/local-data.js';

function load(client: Client) {
    let utils = require('./src/utils');
    let config = require('./config.js');

    if (!process.env.TOKEN)
        try {
            require('./config.js');
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

    let loaded: { events: string[], commands: string[]} = { events: [], commands: [] };

    let promise = new Promise(resolve => {
        fs.readdir('./src/events/', (err, files) => {
            if (err) return console.error;
            files.forEach(file => {
                if (!file.endsWith('.js')) return;
                let path = require.resolve(`./src/events/${file}`);
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
            if (!file.endsWith('.js')) return;
            let path = require.resolve(`./src/commands/${file}`);
            delete require.cache[path];
            let props: Command = require(path);
            if (Array.isArray(props.names))
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
        run: function reload(cl: Client, message: Message, args: string[]) {
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

import { Client as DiscordClient, Intents, Message } from 'discord.js';
const client = new DiscordClient({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] }) as Client;

client.lastToken = null;

load(client);

/* ----------------------------------------------- */
import { start } from 'repl';
start('> ').context.client = client;
