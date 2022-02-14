import { readdir } from 'fs/promises';
import { configHandler } from './src/configHandler.js';
import type { Client, Command } from './src/types.js';
import { CommandHelpProvider } from './src/commands.js';
import { resolve as pathResolve } from 'path';
import Enmap from 'enmap';
import './src/local-data.js';
import semver from 'semver';
import { readFileSync } from 'fs';

// Remove this
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

const pkg = JSON.parse(readFileSync('./package.json', 'utf8').toString());
if (!semver.satisfies(process.version, pkg.engines.node)) {
    console.error('Node version must be at least 16.6.0');
    process.exit(1);
}

async function load(client: Client) {
    let utils = await import(`./src/utils.js?ts=${Date.now()}`);
    let config = client.config = await configHandler();

    if (config.token !== client.lastToken) {
        client.lastToken = config.token;
        client.login(config.token);
    }

    utils.log('Logging in...');

    /* ----------------------------------------------- */

    client.commands = new Enmap();

    /* ----------------------------------------------- */

    client.pingInfo = new Map<string, (apiReturnTime: number) => void>();

    let loaded: { events: Array<string>; commands: Array<string> } = { events: [], commands: [] };

    CommandHelpProvider.setPrefix(client.config.prefix);

    try {
        let files = [
            ...(await readdir('./src/events/')).map(x => ({ name: x, type: 'events' })),
            ...(await readdir('./src/commands/')).map(x => ({ name: x, type: 'commands' }))
        ];
        for (let file of files) {
            if (!file.name.endsWith('.js')) continue;
            let path = pathResolve(`./src/${file.type}/${file.name}`);

            let name = file.name.split('.')[0];
            switch (file.type) {
                    case 'events': {
                        let evt = (await import(`${path}?ts=${Date.now()}`)).default;
                        loaded.events.push(name);
                        client.on(name, evt.bind(null, client));
                        break;
                    }
                    case 'commands': {
                        let props: Command = { ...await import(`${path}?ts=${Date.now()}`) };
                        if (Array.isArray(props.names))
                            props.names.forEach((propName, index) => {
                                if (index > 0) props.alias = true;
                                props.help.build();
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
        help: new CommandHelpProvider('reload').setDescription('Reload the modules').build()
    });
    loaded.commands.push('reload');

    client.once('ready', cl =>{
        cl.user.setPresence({
            status: 'online',
            activities: [
                {
                    name: client.config.prefix + 'help',
                    type: ActivityType.Playing
                }
            ]
        });
    });


    // Call post setup hooks for commands
    for (let command of client.commands.values())
        if (typeof command.postLoad === 'function')
            command.postLoad(client);
}

import { ActivityType, Client as DiscordClient, Message } from 'discord.js';
const client = new DiscordClient({
    intents: ['Guilds', 'GuildMessages', 'GuildVoiceStates']
}) as Client;

client.lastToken = null;

load(client);

/* ----------------------------------------------- */
import { start } from 'repl';
start('> ').context.client = client;
