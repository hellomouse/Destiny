import utils from'../utils';
import queue from'../queue';
import embeds from'../embeds';

import REQUIRE_USER_IN_VC from '../commands';
import { Song, getSong } from '../song';

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

    let [songs, onlyPlaylistSongs] = await Song.getSongURLs(args.join(' ').split(' | '), message, true);
    let playlists = await Promise.all(
        Song.getYouTubePlaylistURLs(args)
            .map(x => Song.getPlaylistData(x)))
        .then(list => list.filter(async x => x.videos.length > 0 ));

    let actualVideoNum = playlists.reduce((prev, current) => prev += current.videos.length, 0);
    let expectedVideoNum = playlists.reduce((prev, current) => prev += current.videoCount, 0);

    let enqueuedEmbed;
    if (playlists.length === 0)
        enqueuedEmbed = embeds.defaultEmbed()
            .setTitle('Added to Queue')
            .setDescription(`Added ${songs.length} songs`);
    else if (onlyPlaylistSongs)
        if (playlists.length === 1)
            enqueuedEmbed = embeds.playlistEmbed(playlists[0], undefined, `Added ${playlists[0].videos.length}/${playlists[0].videoCount} songs`);
        else
            enqueuedEmbed = embeds.playlistEmbed(playlists[0], 'Added to Queue', `Added ${actualVideoNum}/${expectedVideoNum} songs`);
    else
        enqueuedEmbed = embeds.playlistEmbed(playlists[0], 'Added to Queue', `Added ${songs.length} songs with ${actualVideoNum}/${expectedVideoNum} songs from ${playlists.length} playlists`);

    message.channel.send(enqueuedEmbed);

    let voiceChannel = message.member.voice.channel;
    let serverQueue = queue.queueManager.getOrCreate(message, voiceChannel);
    let song;

    for (let s of songs) {
        song = s instanceof Song ? s : await getSong(s, message.author, message.channel);
        if (song) serverQueue.add(song);
    }

    utils.log('Got music details, preparing the music to be played...');

    if (!serverQueue.isPlaying()) {
        let connection = await voiceChannel.join();
        serverQueue.connection = connection;
        await serverQueue.play();
        serverQueue.resume();
    }
};

module.exports.names = ['play', 'p'];
module.exports.help = {
    desc: 'Add a song to the queue',
    syntax: '<youtube url | playlist | file | search query>'
};
module.exports.requirements = REQUIRE_USER_IN_VC;
