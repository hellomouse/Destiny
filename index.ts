import { readdir } from 'fs/promises';
import { Client, Command } from './src/types.js';
import Enmap from 'enmap';
import './src/local-data.js';

async function load(client: Client) {
    let utils = (await import('./src/utils')).default;
    let config = (await import('./config')).default;

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
            config.allowed = (await import('./allowed.json')).allowed;
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

    try {
        let files = await readdir('./src/events/');
        for (let file of files) {
            if (!file.endsWith('.js')) continue;
            let path = require.resolve(`./src/events/${file}`);
            delete require.cache[path];
            let evt = (await import(path)).default;
            let evtName = file.split('.')[0];
            loaded.events.push(evtName);
            client.on(evtName, evt.bind(null, client));
        }
    } catch (error) {
        utils.log(error);
    }

    try {
        let files = await readdir('./src/commands/');
        for (let file of files) {
            if (!file.endsWith('.js')) continue;
            let path = require.resolve(`./src/commands/${file}`);
            delete require.cache[path];
            let props: Command = await import(path);
            if (Array.isArray(props.names))
                props.names.forEach(name => {
                    client.commands.set(name, props);
                });

            let cmdName = file.split('.')[0];
            loaded.commands.push(cmdName);
        }
    } catch (error) {
        utils.log(error);
    }

    utils.log(`Table of commands and events :\n${utils.showTable(loaded)}`);

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
