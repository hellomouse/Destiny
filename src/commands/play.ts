import { queueManager } from '../queue';
import embeds from '../embeds';
import { log } from '../utils.js';

import COMMAMD_REQUIREMENTS, { hasEnoughArgs } from '../commands';
import { Song, YouTubeSong } from '../song';
import { Client, Message } from 'discord.js';

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
    let [songs, onlyPlaylistSongs] = await Song.getSongReferences(args.join(' ').split(' | '), message, true);
    let playlists = await Promise.all(
        YouTubeSong.getYouTubePlaylistURLs(args)
            .map(x => YouTubeSong.getPlaylistData(x)))
        .then(list => list.filter(async x => x.items.length > 0));

    let actualVideoNum = playlists.reduce((prev, current) => prev += current.items.length, 0);
    let expectedVideoNum = playlists.reduce((prev, current) => prev += current.estimatedItemCount, 0);

    // Have no embed at all, user has no idea what's happening
    // Have two embeds, like we currently do.
    // "Adding songs..." embed then edit to say "Added 3/4 songs".
    // * how to do this then, new module called messages.ts, info.ts? or move to queue.ts?
    // message/info.ts could handle user callback/delegate it
    // bad idea, we give function conditions and messages
    // like sendResponse(messagestuff, [playlists.length === 0, ddd], callback or `Added ${songs.length} songs`...)
    let enqueuedEmbed;
    if (playlists.length === 0)
        enqueuedEmbed = embeds.defaultEmbed()
            .setTitle('Added to Queue')
            .setDescription(`Added ${songs.length} songs`);
    else if (onlyPlaylistSongs)
        if (playlists.length === 1)
            enqueuedEmbed = embeds.playlistEmbed(playlists[0], undefined, `Added ${playlists[0].items.length}/${playlists[0].estimatedItemCount} songs`);
        else
            enqueuedEmbed = embeds.playlistEmbed(playlists[0], 'Added to Queue', `Added ${actualVideoNum}/${expectedVideoNum} songs`);
    else
        enqueuedEmbed = embeds.playlistEmbed(playlists[0], 'Added to Queue', `Added ${songs.length} songs with ${actualVideoNum}/${expectedVideoNum} songs from ${playlists.length} playlists`);

    message.channel.send({ embeds: [enqueuedEmbed] });

    let serverQueue = queueManager.getOrCreate(message, message.member!.voice.channel!);

    log('Requested by: ' + message.author.toString()); // maybe bundle into a json-like console message, !!play from <user>, arguments: truncated, server: foo
    // for (let s of songs)
    //     try {
    //         song = typeof s === 'string' ? await SongManager.getCreateSong(s, message.author, message.channel) : s;
    //         log(`Adding ${song?.title} to queue`);
    //         if (song) serverQueue.add(song);
    //     } catch (e) {
    //         log(e);
    //     }

    // we have an array of songreferences, which *should* all be valid songs
    // just pass them to serverQueue.play(songsreferences: [SongReference])
    // play function should resume if paused... well... just play regardless
    serverQueue.join();
    serverQueue.add(songs);
    serverQueue.playIfNewInstance();

    log('Got music details, preparing the music to be played...'); // don't really like this, not a lot of information
};

// perhaps we can improve how commands work?
export const names = ['play', 'p'];
export const help = {
    desc: 'Add a song to the queue',
    syntax: '<youtube url | playlist | file | search query>'
};
export const requirements = COMMAMD_REQUIREMENTS.REQUIRE_USER_IN_VC;
