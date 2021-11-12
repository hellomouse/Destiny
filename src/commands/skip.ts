import utils = require('../utils');
import embeds = require('../embeds.js');
import queue = require('../queue.js');
import { REQUIRE_QUEUE_NON_EMPTY, REQUIRE_USER_IN_VC } from '../commands.js';

/**
 * @description Skip the current song
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
module.exports.run = async (client, message, args) => {
    const serverQueue = queue.queueManager.get(message.guild.id);
    utils.log(`Skipped music : ${serverQueue.songs[0].title}`);
    serverQueue.skip();

    return message.channel.send(embeds.songEmbed(serverQueue.currentSong(), 'Skipping', false));
};

module.exports.names = ['skip', 's'];
module.exports.help = {
    desc: 'Skip the current song',
    syntax: ''
};
module.exports.requirements = REQUIRE_QUEUE_NON_EMPTY | REQUIRE_USER_IN_VC;
