import utils from '../utils';
import { queueManager } from '../queue';
import embeds from '../embeds';

import COMMAMD_REQUIREMENTS from '../commands';
import { Song, getSong, YouTubeSong } from '../song';
import { Client, Message } from 'discord.js';
import { joinVoiceChannel } from '@discordjs/voice';

/**
 * @description Play a song with the provided link
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args args[0] must be a link, or args is the song name
 * @return {Promise<Message>} sent message
 */
export const run = async (client: Client, message: Message, args: Array<string>) => {
    if (!args[0] && message.attachments.size === 0)
        throw new utils.FlagHelpError();

    utils.log('Looking for music details...');

    let [songs, onlyPlaylistSongs] = await Song.getSongURLs(args.join(' ').split(' | '), message, true);
    let playlists = await Promise.all(
        YouTubeSong.getYouTubePlaylistURLs(args)
            .map(x => YouTubeSong.getPlaylistData(x)))
        .then(list => list.filter(async x => x.items.length > 0));

    let actualVideoNum = playlists.reduce((prev, current) => prev += current.items.length, 0);
    let expectedVideoNum = playlists.reduce((prev, current) => prev += current.estimatedItemCount, 0);

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

    let voiceChannel = message.member!.voice.channel!;
    let serverQueue = queueManager.getOrCreate(message, voiceChannel);
    let song;

    for (let s of songs) {
        song = typeof s === 'string' ? await getSong(s, message.author, message.channel) : s;
        if (song) serverQueue.add(song);
    }

    utils.log('Got music details, preparing the music to be played...');

    if (!serverQueue.isPlaying()) {
        let connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator
        });
        serverQueue.connection = connection;
        await serverQueue.play();
        serverQueue.resume();
    }
};

export const names = ['play', 'p'];
export const help = {
    desc: 'Add a song to the queue',
    syntax: '<youtube url | playlist | file | search query>'
};
export const requirements = COMMAMD_REQUIREMENTS.REQUIRE_USER_IN_VC;
