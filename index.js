const fs = require('fs');
const Enmap = require('enmap');
require('./src/local-data.js');

function load(client) {
    const utils = require('./src/utils');
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

    let loaded = { events: [], commands: [] };

    let promise = new Promise(resolve => {
        fs.readdir('./src/events/', (err, files) => {
            if (err) return console.error;
            files.forEach(file => {
                if (!file.endsWith('.js')) return;
                const path = require.resolve(`./src/events/${file}`);
                delete require.cache[path];
                const evt = require(path);
                let evtName = file.split('.')[0];
                loaded.events.push(evtName);
                client.on(evtName, evt.bind(null, client));
            });
            resolve();
        });
    });


    fs.readdir('./src/commands/', async (err, files) => {
        if (err) return console.error;
        files.forEach(file => {
            if (!file.endsWith('.js')) return;
            const path = require.resolve(`./src/commands/${file}`);
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

const Discord = require('discord.js');
const client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS] });

client.lastToken = null;

load(client);

/* ----------------------------------------------- */

require('repl').start('> ').context.client = client;