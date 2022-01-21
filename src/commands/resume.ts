import { defaultEmbed } from '../embeds.js';
import { log } from '../utils.js';
import { queueManager } from '../queue.js';
import COMMAMD_REQUIREMENTS from '../commands.js';
import { Client, Message } from 'discord.js';

/**
 * @description Resume current song
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
export const run = async (client: Client, message: Message, args: Array<string>) => {
    const serverQueue = queueManager.get(message.guild!.id)!;
    serverQueue.resume();

    log(`Resumed music playback`);
    return message.channel.send({ embeds: [defaultEmbed().setDescription(`:play_pause: Playback resumed`)] });
};

export const names = ['resume', 'unpause'];
export const help = {
    desc: 'Resume playback',
    syntax: ''
};
export const requirements = COMMAMD_REQUIREMENTS.REQUIRE_QUEUE_NON_EMPTY | COMMAMD_REQUIREMENTS.REQUIRE_USER_IN_VC;
