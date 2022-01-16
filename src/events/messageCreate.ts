import strings from '../strings.json';
import { FlagHelpError, log } from '../utils.js';
import embeds from '../embeds';
import config from '../../config';
import COMMAMD_REQUIREMENTS from '../commands';
import { queueManager } from '../queue';

const prefix = config.prefix;
import { DMChannel, Message, NewsChannel, ThreadChannel } from 'discord.js';
import { Client } from '../types';

const MAX_LEN = 1000; // TODO: remove

export default async (client: Client, message: Message) => {
    if (message.content.indexOf(prefix) === 0) {
        // Ignore self messages
        if (message.author.id === client.user!.id)
            return;

        // Verify sender and server are allowed

        const args = message.content.slice(prefix.length).trim().split(/ +/g);
        const command = args.shift()!.toLowerCase();
        const cmd = client.commands.get(command);

        if (!cmd) return;

        log(`[${message.author.tag} / ${message.author.id}] ${message.content.slice(0, MAX_LEN)}`);

        if (!config.allowed.includes(message.author.id) && config.allowed.length > 0) {
            message.channel.send(strings.permissionDenied);
            log(`${message.author.tag} tried to run the command '${message.content.slice(0, MAX_LEN)}' but permission was not accepted`);
            return;
        }

        if (cmd.requirements) {
            if (cmd.requirements & COMMAMD_REQUIREMENTS.REQUIRE_QUEUE_NON_EMPTY) {
                const serverQueue = queueManager.get(message.guild!.id);
                if (!serverQueue)
                    return message.reply({ embeds: [embeds.songQueueEmpty()] });
            }
            if (cmd.requirements & COMMAMD_REQUIREMENTS.REQUIRE_IS_PLAYING) {
                const serverQueue = queueManager.get(message.guild!.id)!;
                if (!serverQueue.isPlaying())
                    return message.channel.send({ embeds: [embeds.queueNotPlaying()] });
            }
            if (cmd.requirements & COMMAMD_REQUIREMENTS.REQUIRE_USER_IN_VC && !message.member!.voice.channel)
                return message.channel.send({ embeds: [embeds.notInVoiceChannelEmbed()] } );
        }

        if (message.channel instanceof NewsChannel || message.channel instanceof DMChannel ||
            message.channel instanceof ThreadChannel)
            return; // commands cannot be run in those channels for now

        try {
            await cmd.run(client, message, args);
        } catch (e) {
            // Show help text because arguments were invalid
            if (e instanceof FlagHelpError)
                message.channel.send({ embeds: [embeds.helpEmbed(cmd)] });
            // Real error occured
            else
                console.log(e);
        }
    }
};
