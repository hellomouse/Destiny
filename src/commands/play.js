const utils = require('../utils');
const queue = require('../queue.js');
const embeds = require('../embeds.js');

const { REQUIRE_USER_IN_VC } = require('../commands.js');
const { YouTubeSong, Song, getSong } = require('../song');
const YouTube = require('youtube-sr').default;

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

    let songs = [];

    if (!args[0] && message.attachments.size > 0) {
        let attachment = message.attachments.find(x => ['mp3', 'ogg', 'flac', 'webm'].some(extension => x.url.includes(extension)));
        if (!attachment)
            throw new utils.FlagHelpError();
        songs.push(attachment.url);
    } else if (utils.isURL(args[0])) {
        let url = args[0];

        // Handle youtube playlists
        let playlistID = utils.getYoutubePlaylistID(url);
        if (playlistID) {
            const playlistData = await YouTube.getPlaylist(url);
            if (!playlistData)
                return message.channel.send(embeds.errorEmbed().setTitle('Could not load playlist'));

            songs = await Promise.all(playlistData.videos.map(async video =>
                new YouTubeSong(url, message.author, message.channel)
                    .finalizeFromData(video.id, video.title, video.duration, video.channel.name, video.views)));

            message.channel.send(embeds.playlistEmbed(
                url, playlistData.title, playlistData.videoCount, playlistData.thumbnail));
        } else
            songs.push(await utils.getUrl(args));
    }

    // TODO song search by text again whered it go

    let voiceChannel = message.member.voice.channel;
    let serverQueue = queue.queueManager.getOrCreate(message, voiceChannel);

    for (let s of songs) {
        let song = s instanceof Song ? s : await getSong(s, message.author, message.channel);
        if (song) serverQueue.songs.push(song);
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
