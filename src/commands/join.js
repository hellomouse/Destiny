const utils = require('../utils');
const embeds = require('../embeds.js');
const { REQUIRE_USER_IN_VC } = require('../commands.js');

/**
 * @description Make the bot join the current voice channel the user is in
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
module.exports.run = async (client, message, args) => {
    const voiceChannel = message.member.voice.channel;
    utils.log(`Joined the channel : ${voiceChannel.name}`);
    return message.channel.send(embeds.defaultEmbed()
        .setDescription(`Joining ${voiceChannel.toString()}`));
};

module.exports.names = ['summon', 'join', 'j'];
module.exports.help = {
    desc: 'Summon the bot to the voice channel the user is in',
    syntax: ''
};
module.exports.requirements = REQUIRE_USER_IN_VC;