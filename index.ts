import { readdir } from 'fs/promises';
import { configHandler } from './src/configHandler.js';
import { Client, Command } from './src/types.js';
import Enmap from 'enmap';
import './src/local-data.js';

// Remove this
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

async function load(client: Client) {
    let utils = await import('./src/utils.js');
    let config = await configHandler();

    if (config.token !== client.lastToken) {
        client.lastToken = config.token;
        client.login(config.token);
    }

    utils.log('Logging in...');

    /* ----------------------------------------------- */

    client.commands = new Enmap();

    /* ----------------------------------------------- */

    let loaded: { events: Array<string>, commands: Array<string> } = { events: [], commands: [] };

    try {
        let files = [
            ...(await readdir('./src/events/')).map(x => ({ name: x, type: 'events' })),
            ...(await readdir('./src/commands/')).map(x => ({ name: x, type: 'commands' }))
        ];
        for (let file of files) {
            if (!file.name.endsWith('.js')) continue;
            let path = require.resolve(`./src/${file.type}/${file.name}`);
            delete require.cache[path];

            let name = file.name.split('.')[0];
            switch (file.type) {
                    case 'events': {
                        let evt = (await import(path)).default;
                        loaded.events.push(name);
                        client.on(name, evt.bind(null, client));
                        break;
                    }
                    case 'commands': {
                        let props: Command = await import(path);
                        if (Array.isArray(props.names))
                            props.names.forEach(propName => {
                                client.commands.set(propName, props);
                            });
                        loaded.commands.push(name);
                        break;
                    }
            }
        }
    } catch (error) {
        utils.log(error);
    }

    utils.log(`Table of commands and events :\n${utils.showTable(loaded)}`);

    client.commands.set('reload', {
        run: function reload(cl: Client, message: Message, args: Array<string>) {
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
const client = new DiscordClient({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES]
}) as Client;

client.lastToken = null;

load(client);

/* ----------------------------------------------- */
import { start } from 'repl';
start('> ').context.client = client;
