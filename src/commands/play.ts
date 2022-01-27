import { log } from '../utils.js';
import { queueManager } from '../queue.js';
import { errorEmbed, playlistEmbed, songEmbed, warningEmbed } from '../embeds.js';

import COMMAMD_REQUIREMENTS, { hasEnoughArgs } from '../commands.js';
import { Song, SongReference, YouTubeSong } from '../song.js';
import { Client, Message, MessageEmbed } from 'discord.js';

/**
 * @description Play a song with the provided link
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args args[0] must be a link, or args is the song name
 * @return {Promise<Message>} sent message
 */
export const run = async (client: Client, message: Message, args: Array<string>) => {
    hasEnoughArgs(args, message);

    log('Looking for music details...');
    // !!play youtube_link | your favorite song query here | spotify link | direct video link
    let songs: Array<SongReference> = [];
    let onlyPlaylistSongs: boolean;
    try {
        [songs, onlyPlaylistSongs] = await Song.getSongReferences(args.join(' ').split(' | '), message, true);
    } catch (e: any) {
        if (e.message === 'Mixes not supported')
            message.reply({ embeds: [errorEmbed().setDescription('Cannot play YouTube Mixes at this time.')] });
        throw e;
    }

    let playlists = await Promise.all(
        YouTubeSong.getYouTubePlaylistURLs(args)
            .map(x => YouTubeSong.getPlaylistData(x)))
        .then(list => list.filter(x => x.items.length > 0));

    let actualVideoNum = playlists.reduce((prev, current) => prev += current.items.length, 0);
    let expectedVideoNum = playlists.reduce((prev, current) => prev += current.estimatedItemCount, 0);

    if (!songs.length) return message.reply({ embeds: [warningEmbed().setDescription('Could not find any songs')] });

    let enqueuedEmbed: MessageEmbed;
    if (playlists.length === 0) {
        enqueuedEmbed = songEmbed(songs[0], 'Added to Queue', false);
        if (songs.length > 1) enqueuedEmbed.setDescription(enqueuedEmbed.description + ` and ${songs.length - 1} others`);
    } else if (onlyPlaylistSongs)
        if (playlists.length === 1)
            enqueuedEmbed = playlistEmbed(playlists[0], undefined, `Added ${playlists[0].items.length}/${playlists[0].estimatedItemCount} songs`);
        else
            enqueuedEmbed = playlistEmbed(playlists[0], 'Added to Queue', `Added ${actualVideoNum}/${expectedVideoNum} songs`);
    else
        enqueuedEmbed = playlistEmbed(playlists[0], 'Added to Queue', `Added ${songs.length} songs with ${actualVideoNum}/${expectedVideoNum} songs from ${playlists.length} playlists`);

    message.channel.send({ embeds: [enqueuedEmbed] });

    let serverQueue = queueManager.getOrCreate(message, message.member!.voice.channel!);

    log('Requested by: ' + message.author.toString()); // maybe bundle into a json-like console message, !!play from <user>, arguments: truncated, server: foo

    // we have an array of songreferences, which *should* all be valid songs
    // just pass them to serverQueue.play(songsreferences: [SongReference])
    // play function should resume if paused... well... just play regardless
    serverQueue.join();
    serverQueue.add(songs);
    serverQueue.playIfIdle();

    log('Got music details, preparing the music to be played...'); // don't really like this, not a lot of information
};

// perhaps we can improve how commands work?
export const names = ['play', 'p'];
export const help = {
    desc: 'Add a song to the queue',
    syntax: '<youtube url | playlist | file | search query>'
};
export const requirements = COMMAMD_REQUIREMENTS.REQUIRE_USER_IN_VC;
