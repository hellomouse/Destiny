import { log } from '../utils';
import { songEmbed, queueNotPlaying } from '../embeds.js';
import { queueManager } from '../queue.js';
import COMMAMD_REQUIREMENTS from '../commands.js';
import { Client, Message } from 'discord.js';

/**
 * @description Skip the current song
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
export const run = async (client: Client, message: Message, args: Array<string>) => {
    const serverQueue = queueManager.get(message.guild!.id)!;
    log(`Skipped music : ${serverQueue!.songs[0].song.title}`);
    serverQueue!.skip();

    const currentSong = serverQueue.currentSong();
    if (currentSong)
        return message.channel.send({ embeds: [songEmbed(currentSong, 'Skipping', false)] });

    return message.channel.send({ embeds: [queueNotPlaying()] });
};

export const names = ['skip', 's'];
export const help = {
    desc: 'Skip the current song',
    syntax: ''
};
export const requirements = COMMAMD_REQUIREMENTS.REQUIRE_QUEUE_NON_EMPTY | COMMAMD_REQUIREMENTS.REQUIRE_USER_IN_VC;
