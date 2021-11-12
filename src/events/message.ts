import strings from '../strings.json';
import utils from '../utils';
import embeds from '../embeds.js';
import config from '../../config.js';
import commands from '../commands.js';
import { queueManager } from '../queue.js';

import prefix = config.prefix;
import { Client, Message } from 'discord.js';

const MAX_LEN = 1000; // TODO: remove

export default async (client: Client, message: Message) => {
    if (message.content.indexOf(prefix) === 0) {
        // Ignore self messages
        if (message.author.id === client.user.id)
            return;

        // Verify sender and server are allowed

        const args = message.content.slice(prefix.length).trim().split(/ +/g);
        const command = args.shift().toLowerCase();
        const cmd = client.commands.get(command);

        if (!cmd) return;

        utils.log(`[${message.author.tag} / ${message.author.id}] ${message.content.slice(0, MAX_LEN)}`);

        if (!config.allowed.includes(message.author.id) && config.allowed.length > 0) {
            message.channel.send(strings.permissionDenied);
            utils.log(`${message.author.tag} tried to run the command '${message.content.slice(0, MAX_LEN)}' but permission was not accepted`);
            return;
        }

        if (cmd.requirements) {
            if (cmd.requirements & commands.REQUIRE_QUEUE_NON_EMPTY) {
                const serverQueue = queueManager.get(message.guild.id);
                if (!serverQueue)
                    return message.channel.send(embeds.songQueueEmpty());
            }
            if (cmd.requirements & commands.REQUIRE_IS_PLAYING) {
                const serverQueue = queueManager.get(message.guild.id);
                if (!serverQueue.isPlaying())
                    return message.channel.send(embeds.queueNotPlaying());
            }
            if (cmd.requirements & commands.REQUIRE_USER_IN_VC && !message.member.voice.channel)
                return message.channel.send(embeds.notInVoiceChannelEmbed());
        }

        try {
            await cmd.run(client, message, args);
        } catch (e) {
            // Show help text because arguments were invalid
            if (e instanceof utils.FlagHelpError)
                message.channel.send(embeds.helpEmbed(cmd));
            // Real error occured
            else
                console.log(e);
        }
    }
};
