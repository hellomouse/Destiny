const utils = require('../utils');
const queue = require('../queue.js');
const embeds = require('../embeds.js');

const { REQUIRE_USER_IN_VC } = require('../commands.js');
const { Song, getSong } = require('../song');

/**
 * @description Play a song with the provided link
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args args[0] must be a link, or args is the song name
 * @return {Promise<Message>} sent message
 */
module.exports.run = async (client, message, args) => {
    if (!args[0] && message.attachments.size === 0)
        throw new utils.FlagHelpError();

    utils.log('Looking for music details...');

    let [songs, onlyPlaylistSongs] = await Song.getSongURLs(args, message, true);
    let playlists = await Promise.all(
        Song.getYouTubePlaylistURLs(args)
            .map(x => Song.getPlaylistData(x)))
        .then(list => list.filter(async x => x.videos.length > 0 ));

    if (!songs.length)
        songs.push(await utils.getUrl(args));

    let enqueuedEmbed;
    if (onlyPlaylistSongs)
        if (playlists.length === 1)
            enqueuedEmbed = embeds.playlistEmbed(
                playlists[0].url,
                playlists[0].title,
                `${playlists[0].videos.length}/${playlists[0].videoCount}`,
                playlists[0].thumbnail.replace('hqdefault.jpg', 'maxresdefault.jpg')
            );

    message.channel.send(enqueuedEmbed);

    let voiceChannel = message.member.voice.channel;
    let serverQueue = queue.queueManager.getOrCreate(message, voiceChannel);

    for (let s of songs) {
        let song = s instanceof Song ? s : await getSong(s, message.author, message.channel);
        if (song) serverQueue.add(song);
    }

    let song = serverQueue.currentSong();
    if (!song) return message.channel.send(embeds.errorEmbed().setTitle('Could not find song'));

    utils.log('Got music details, preparing the music to be played...');

    if (!serverQueue.isPlaying()) {
        let connection = await voiceChannel.join();
        serverQueue.connection = connection;
        serverQueue.play();
        serverQueue.resume();
    } else {
        utils.log(`Added music to the queue : ${song.title}`);
        return message.channel.send(embeds.songEmbed(song, 'Added to Queue'));
    }
};

module.exports.names = ['play', 'p'];
module.exports.help = {
    desc: 'Add a song to the queue',
    syntax: '<youtube url | playlist | file | search query>'
};
module.exports.requirements = REQUIRE_USER_IN_VC;
