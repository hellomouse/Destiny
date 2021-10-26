const utils = require('../utils');
const queue = require('../queue.js');
const embeds = require('../embeds.js');

const { REQUIRE_USER_IN_VC } = require('../commands.js');
const getSong = require('../song');
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
        if (!attachment) return; // Cannot find a song url
        songs.push(attachment.url);
    } else if (utils.isURL(args[0])) {
        let url = args[0];

        // Handle youtube playlists
        console.log(url + ' ' + url.startsWith('https://www.youtube.com/playlist?list='));
        if (url.startsWith('https://www.youtube.com/playlist?list='))
            YouTube.getPlaylist(url)
                .then(playlist => {
                    console.log(playlist.videos[0]);
                    console.log(Object.getOwnPropertyNames(playlist.videos));
                });
        else
            songs.push(await utils.getUrl(args));
    }

    // TODO song search by text again whered it go

    let song = await getSong(songs[0], message.author, message.channel);
    console.log(song);
    if (!song) return message.channel.send(embeds.errorEmbed().setTitle('Could not find song'));

    let voiceChannel = message.member.voice.channel;
    let serverQueue = queue.queueManager.getOrCreate(message, voiceChannel);

    utils.log('Got music details, preparing the music to be played...');

    let playingNow = false;

    if (!serverQueue.isPlaying()) {
        serverQueue.songs.push(song);

        let connection = await voiceChannel.join();
        serverQueue.connection = connection;
        serverQueue.play();
        serverQueue.resume();
        playingNow = true;
    } else {
        serverQueue.songs.push(song);
        utils.log(`Added music to the queue : ${song.title}`);
    }

    if (!playingNow)
        return message.channel.send(embeds.songEmbed(song, 'Added to Queue'));
};

module.exports.names = ['play', 'p'];
module.exports.help = {
    desc: 'Add a song to the queue',
    syntax: '<youtube url | playlist | file | search query>'
};
module.exports.requirements = REQUIRE_USER_IN_VC;
