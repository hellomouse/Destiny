import { FlagHelpError, log } from '../utils.js';
import { songEmbed, queueNotPlaying } from '../embeds.js';
import { queueManager } from '../queue.js';
import COMMAMD_REQUIREMENTS from '../commands.js';
import { Client, Message } from 'discord.js';

/**
 * @description Jump to a specific position in the queue
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
export const run = async (client: Client, message: Message, args: Array<string>) => {
    if (!args[0]) throw new FlagHelpError('You need to specify a position');

    const serverQueue = queueManager.get(message.guild!.id)!;
    log(`Jumped to : ${serverQueue!.songs[0].song.title}`);

    await serverQueue!.jump(+args[0]);

    const currentSong = serverQueue.currentSong();
    if (currentSong)
        return message.channel.send({ embeds: [songEmbed(currentSong, 'Skipping', false)] });

    return message.channel.send({ embeds: [queueNotPlaying()] });
};

export const names = ['jump'];
export const help = {
    desc: 'Jump to a specific position in the queue',
    syntax: ''
};
export const requirements = COMMAMD_REQUIREMENTS.REQUIRE_QUEUE_NON_EMPTY | COMMAMD_REQUIREMENTS.REQUIRE_USER_IN_VC;
