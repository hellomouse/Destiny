import embeds from '../embeds.js';
import utils from '../utils';
import { queueManager } from '../queue.js';
const { REQUIRE_QUEUE_NON_EMPTY, REQUIRE_USER_IN_VC } = require('../commands.js');

/**
 * @description Pause current song
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
export const run = async (client, message, args) => {
    const serverQueue = queueManager.get(message.guild.id);
    serverQueue.pause();

    utils.log(`Paused music playback`);
    return message.channel.send(embeds.defaultEmbed().setDescription(`:pause_button: Playback paused`));
};

export const names = ['pause', 'unresume'];
export const help = {
    desc: 'Pause playback',
    syntax: ''
};
export const requirements = REQUIRE_QUEUE_NON_EMPTY | REQUIRE_USER_IN_VC;
