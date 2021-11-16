const embeds = require('../embeds.js');
const utils = require('../utils');
const queue = require('../queue.js');
const { REQUIRE_QUEUE_NON_EMPTY, REQUIRE_USER_IN_VC } = require('../commands.js');

/**
 * @description Seek to a given timestamp
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
module.exports.run = async (client, message, args) => {
    if (!args[0])
        throw new utils.FlagHelpError();

    const serverQueue = queue.queueManager.get(message.guild.id);

    let seekTime = await utils.getTimeFromArgument(args[0]);
    if (!seekTime)
        return message.channel.send(embeds.errorEmbed()
            .setTitle(`Invalid seek parameter \`${args[0]}\``));

    seekTime = await serverQueue.seekTo(seekTime);
    utils.log(`Seeking to ${seekTime}`);
    return message.channel.send(embeds.defaultEmbed().setDescription(`Seeking to \`${utils.formatDuration(seekTime)}\``));
};

module.exports.names = ['seek'];
module.exports.help = {
    desc: 'Seek to a given timestamp',
    syntax: '<Time in seconds | XXhXXmXXs | XX:XX:XX>'
};
module.exports.requirements = REQUIRE_QUEUE_NON_EMPTY | REQUIRE_USER_IN_VC;
