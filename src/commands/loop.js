const embeds = require('../embeds.js');
const utils = require('../utils');
const queue = require('../queue.js');
const { REQUIRE_USER_IN_VC } = require('../commands.js');

/**
 * @description Loop the current song
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Optional loop mode
 * @return {Promise<Message>} sent message
 */
module.exports.run = async (client, message, args) => {
    const serverQueue = queue.queueManager.getOrCreate(message, message.member.voice.channel);

    let loopMode = queue.LOOP_MODES[(queue.LOOP_MODES.indexOf(serverQueue.loop) + 1) % queue.LOOP_MODES.length];
    let seekB = await utils.getTimeFromArgument(args[0]);
    if (args[0]) {
        if (seekB > 0) {
            loopMode = seekB;
            loopInfoText = "Looping song from 00:00 to " + seekB;
        }
        else if (queue.LOOP_MODES.includes(args[0].toLowerCase())) {
            loopMode = args[0].toLowerCase();
            loopInfoText = `Loop mode set to ${loopMode}`;
        }
        else
            return message.channel.send(embeds.errorEmbed()
                .setTitle(`Invalid loop mode \`${args[0].toLowerCase()}\``)
                .setDescription(`Loop mode should be one of \`${queue.LOOP_MODES.join(', ')}\``));
    }

    serverQueue.setLoopMode(loopMode);
    utils.log(loopInfoText);
    return message.channel.send(embeds.defaultEmbed().setDescription(loopInfoText));
};

module.exports.names = ['loop', 'l'];
module.exports.help = {
    desc: 'Change looping settings',
    syntax: '[loop | none | queue]'
};
module.exports.requirements = REQUIRE_USER_IN_VC;
