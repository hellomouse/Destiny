const utils = require('../utils');
const embeds = require('../embeds.js');
const queue = require('../queue.js');

/**
 * @description Stops the music and make the bot leave the channel
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
module.exports.run = async (client, message, args) => {
    const serverQueue = queue.queueManager.get(message.guild.id);
    if (!serverQueue) // Not in VC, ignore
        return;

    utils.log('Stopped playing music');
    serverQueue.clear();
    serverQueue.voiceChannel.leave();

    return message.channel.send(embeds.defaultEmbed().setDescription(':wave:'));
};

module.exports.names = ['leave', 'die', 'fuckoff'];
module.exports.help = {
    desc: 'Disconnect the bot',
    syntax: ''
};
