import embeds from '../embeds.js';
import utils from '../utils';
import { queueManager } from '../queue.js';
import commands from '../commands';

/**
 * @description Resume current song
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
export const run = async (client, message, args) => {
    const serverQueue = queueManager.get(message.guild.id);
    serverQueue.resume();

    utils.log(`Resumed music playback`);
    return message.channel.send(embeds.defaultEmbed().setDescription(`:play_pause: Playback resumed`));
};

export const names = ['resume', 'unpause'];
export const help = {
    desc: 'Resume playback',
    syntax: ''
};
export const requirements = commands.REQUIRE_QUEUE_NON_EMPTY | commands.REQUIRE_USER_IN_VC;
