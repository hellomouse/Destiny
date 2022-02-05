import strings from '../strings.json';
import { FlagHelpError, log } from '../utils.js';
import { helpEmbed, notInVoiceChannelEmbed, queueNotPlaying, songQueueEmpty } from '../embeds.js';
import COMMAMD_REQUIREMENTS from '../commands.js';
import { queueManager } from '../queue.js';

import type { Message } from 'discord.js';
import type { Client } from '../types';

const MAX_LEN = 1000; // TODO: remove

export default async (client: Client, message: Message) => {
    if (message.author.id === client.user!.id) {
        // gateway ping time tracking
        let pingMatch = message.content.match(/^\(ping (\w+)\)$/);
        if (pingMatch) {
            let id = pingMatch[1];
            let callback = client.pingInfo.get(id);
            if (callback) callback(Date.now());
        }
    }

    if (message.content.startsWith(client.config.prefix)) {
        // Ignore self messages
        if (message.author.id === client.user!.id)
            return;

        // Verify sender and server are allowed

        const args = message.content.slice(client.config.prefix.length).trim().split(/ +/g);
        const command = args.shift()!.toLowerCase();
        const cmd = client.commands.get(command);

        if (!cmd) return;

        log(`[${message.author.tag} / ${message.author.id}] ${message.content.slice(0, MAX_LEN)}`);

        if (!client.config.allowed.includes(message.author.id) && client.config.allowed.length > 0) {
            message.channel.send(strings.permissionDenied);
            log(`${message.author.tag} tried to run the command '${message.content.slice(0, MAX_LEN)}' but permission was not accepted`);
            return;
        }

        if (cmd.requirements) {
            if (cmd.requirements & COMMAMD_REQUIREMENTS.REQUIRE_QUEUE_NON_EMPTY) {
                const serverQueue = queueManager.get(message.guild!.id);
                if (!serverQueue)
                    return message.reply({ embeds: [songQueueEmpty()] });
            }
            if (cmd.requirements & COMMAMD_REQUIREMENTS.REQUIRE_IS_PLAYING) {
                const serverQueue = queueManager.get(message.guild!.id)!;
                if (!serverQueue.isPlaying())
                    return message.reply({ embeds: [queueNotPlaying()] });
            }
            if (cmd.requirements & COMMAMD_REQUIREMENTS.REQUIRE_USER_IN_VC && !message.member!.voice.channel)
                return message.reply({ embeds: [notInVoiceChannelEmbed()] } );
        }

        if (message.channel.type !== 'GUILD_TEXT')
            return; // commands cannot be run in the other channel types for now
        try {
            await cmd.run(client, message, args);
        } catch (e) {
            // Show help text because arguments were invalid
            if (e instanceof FlagHelpError)
                message.reply({ embeds: [helpEmbed(cmd)] });
            // Real error occured
            else
                console.log(e);
        }
    }
};
