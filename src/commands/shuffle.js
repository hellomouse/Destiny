const embeds = require('../embeds.js');
const queue = require('../queue.js');
const { REQUIRE_QUEUE_NON_EMPTY, REQUIRE_USER_IN_VC } = require('../commands.js');

/**
 * @description Shuffle the playlist
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
module.exports.run = async (client, message, args) => {
    const serverQueue = queue.queueManager.get(message.guild.id);

    if (serverQueue.shuffle) {
        serverQueue.shuffleOff();
        message.channel.send(embeds.defaultEmbed().setDescription('Shuffle mode is now disabled'));
    } else {
        serverQueue.shuffleOn();
        message.channel.send(embeds.defaultEmbed().setDescription('Shuffle mode is now enabled'));
    }
};

module.exports.names = ['shuffle'];
module.exports.help = {
    desc: 'Shuffle playlist',
    syntax: ''
};
module.exports.requirements = REQUIRE_QUEUE_NON_EMPTY | REQUIRE_USER_IN_VC;
