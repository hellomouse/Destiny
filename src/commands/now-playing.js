const utils = require('../utils');
const queue = require('../queue.js');
const embeds = require('../embeds.js');
const { REQUIRE_QUEUE_NON_EMPTY, REQUIRE_IS_PLAYING } = require('../commands.js');

/**
 * @description Get current playing song
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
module.exports.run = async (client, message, args) => {
    const serverQueue = queue.queueManager.get(message.guild.id);
    const song = serverQueue.currentSong();

    if (!song) return message.channel.send(embeds.queueNotPlaying());

    const time = utils.formatDuration(serverQueue.connection.dispatcher.streamTime / 1000);
    const embed = song.getEmbed(
        embeds.songEmbed(song, 'Now Playing', false)
            .addField('Duration', `${time} / ${song.formattedDuration}`, true)
            .addField('Action', serverQueue.isPaused() ? 'Paused' : 'Playing', true)
    );

    return message.channel.send(embed);
};

module.exports.names = ['nowplaying', 'now_playing', 'np', 'playing', 'song', 'current'];
module.exports.help = {
    desc: 'Get the currently playing song',
    syntax: ''
};
module.exports.requirements = REQUIRE_QUEUE_NON_EMPTY | REQUIRE_IS_PLAYING;
