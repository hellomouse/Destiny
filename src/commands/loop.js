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

    if (args[0]) {
        let times = args[0].split(/,|:|-/);

        let loopStart = await utils.getTimeFromArgument(times[0]);
        let loopEnd = await utils.getTimeFromArgument(times[1]);
        if (times.length > 0) {
            if (loopEnd === loopStart) return message.channel.send(embeds.errorEmbed()
                .setTitle('Invalid A/B loop')
                .setDescription('Loop start and end times cannot be the same')); 

            if (loopEnd < loopStart) return message.channel.send(embeds.errorEmbed()
                .setTitle('Invalid A/B loop')
                .setDescription('Loop start time must precede it\'s end')); 

            if (loopEnd === undefined) return message.channel.send(embeds.errorEmbed()
                .setTitle('Invalid A/B loop')
                .setDescription('Both loop start and end positions must be provided')); 

            loopMode = serverQueue.setLoopMode(loopEnd);
            loopInfoText = "Looping song from 00:00 to " + loopEnd;
        }
        else {
            loopMode = serverQueue.setLoopMode(args[0]);
            loopInfoText = `Loop mode set to \`${loopMode}\``;
            if (loopMode === undefined)
                return message.channel.send(embeds.errorEmbed()
                    .setTitle(`Invalid loop mode \`${args[0].toLowerCase()}\``)
                    .setDescription('Loop mode should be one of `none/off, current/song, queue`'));
        }
    }

    utils.log(loopInfoText);
    return message.channel.send(embeds.defaultEmbed().setDescription(loopInfoText));
};

module.exports.names = ['loop', 'l'];
module.exports.help = {
    desc: 'Change looping settings',
    syntax: '[loop | none | queue]'
};
module.exports.requirements = REQUIRE_USER_IN_VC;
