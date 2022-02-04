import { defaultEmbed, errorEmbed } from '../embeds.js';
import { FlagHelpError, formatDuration, log, parseDuration } from '../utils.js';
import { queueManager } from '../queue.js';
import COMMAMD_REQUIREMENTS, { CommandArgument, CommandArgumentNecessity, CommandHelpProvider } from '../commands.js';
import type { Client } from '../types';
import type { Message } from 'discord.js';

/**
 * @description Seek to a given timestamp
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
export const run = async (client: Client, message: Message, args: Array<string>) => {
    if (!args[0])
        throw new FlagHelpError();

    const serverQueue = queueManager.get(message.guild!.id)!;

    if (serverQueue.isIdle()) return message.channel.send({ embeds: [errorEmbed().setDescription('Nothing is playing right now')] });

    let seekTime = +args[0];
    if (Number.isNaN(seekTime))
        try {
            seekTime = parseDuration(args[0]);
        } catch (e) {
            return message.reply({
                embeds: [errorEmbed()
                    .setTitle(`Invalid seek parameter \`${args[0]}\``)]
            });
        }

    seekTime = Math.max(0, seekTime);
    seekTime = Math.min(serverQueue.currentSong().song.duration, seekTime);
    await serverQueue.play(seekTime);
    log(`Seeking to ${seekTime}`);
    return message.channel.send({ embeds: [defaultEmbed().setDescription(`Seeking to \`${formatDuration(seekTime)}\``)] });
};

export const names = ['seek'];
// export const help = {
//     desc: 'Seek to a given timestamp',
//     syntax: '<Time in seconds | XXhXXmXXs | XX:XX:XX>'
// };
export let help = new CommandHelpProvider('seek')
    .setDescription('Seek to a given time in the current song')
    .setSyntax([new CommandArgument('time', CommandArgumentNecessity.Necessary)]);
export const requirements = COMMAMD_REQUIREMENTS.REQUIRE_QUEUE_NON_EMPTY | COMMAMD_REQUIREMENTS.REQUIRE_USER_IN_VC;
