import { getYouTubeURL, isURL } from '../utils.js';
import ffmpeg from 'fluent-ffmpeg';
import Stream from 'stream';
import { v4 as uuidv4 } from 'uuid';
import type { Message, MessageEmbed } from 'discord.js';
import { SongManager } from './manager.js';
import type { SongReference } from './reference.js';
import { YouTubeSong } from './youtube.js';
import { FileSong } from './file.js';

export class SongAlreadyExistsError extends Error {}
export class SongQueueFullError extends Error {}
export class SongNotFoundError extends Error {}

/**
 * Get a Song object given its url
 * @param {string} url Url to song
*/
export function getSongTypeFromURL(url: string) {
    // return YouTubeSong, FileSong depending on url.
    // move validation to each class? like YouTubeSong.isSong(url)???
    // throw error on it not being a song
    if (YouTubeSong.isSong(url))
        return YouTubeSong;
    else if (FileSong.isSong(url))
        return FileSong;
    throw new Error('Invalid song url');
}


/**
 * Base Song class, do not use directly!
 * @author BWBellairs
 */
export class Song {
    public id: string;
    public references: number;
    public url: string;
    public thumbnail?: string;

    public metadataTTL: number;

    public title: string;
    public formattedDuration: string;
    public duration: number;
    public artist?: string;

    /**
     * Construct a new song
     * @param {string} url Url of the song
     */
    constructor(url: string) {
        this.id = uuidv4();
        this.references = 0;
        this.metadataTTL = Infinity;
        this.url = url;
        this.thumbnail = undefined;

        this.title = 'No title';
        this.formattedDuration = 'XX:XX';
        this.duration = Infinity;
        this.artist = undefined;
    }

    /**
     * Run any async operations after construction,
     * returns itself so you can call await song.finalize()
     * @return {Song}
     */
    async finalize(): Promise<Song> {
        return this;
    }

    /**
     * Return a {@link Stream.PassThrough} that starts at seekTime
     * @param {string} url stream url
     * @param {number} seekTime Seconds to seek to
     * @return {Stream.PassThrough} Stream object
     */
    async seek(url: string, seekTime = 0) {
        let outputStream = new Stream.PassThrough();
        ffmpeg(url)
            .seekInput(seekTime)
            .format('mp3')
            .inputOptions('-fflags', 'nobuffer', '-probesize', '32', '-analyzeduration', '0') // '-ss', seekTime,
            .output(outputStream, { end: true })
            .noVideo()
            .on('error', e => console.error(e))
            .addOutputOption('-strict', '-2')
            .run();

        return outputStream;
    }

    /**
     * Add fields for now playing embed
     * @param {MessageEmbed} embed Embed to modify
     * @return {MessageEmbed}
     */
    getEmbed(embed: MessageEmbed) {
        return embed;
    }

    static async getSongReferences(args: Array<string>, message: Message,
        unpackPlaylists = false): Promise<[Array<SongReference>, boolean]> {
        let songs: Array<SongReference> = [];
        let playlistSongs: Array<SongReference> = [];

        if (message.attachments.size > 0)
            args = [...args, ...message.attachments.map(x => x.url)];

        for (let arg of args) {
            let isPlaylist = YouTubeSong.getYoutubePlaylistID(arg);
            if (isPlaylist && unpackPlaylists) {
                let unpackedPlaylist = await YouTubeSong.unpackPlaylist(arg, message);
                playlistSongs = [...playlistSongs, ...unpackedPlaylist];
            } else if (isURL(arg))
                try {
                    let songReference = await SongManager.getCreateSong(arg, message.author, message.channel);
                    songs.push(songReference);
                } catch (e) {
                    // do nothing i guess?
                }
            else
                try {// can't find any youtube/other links, so perform youtube search and add first song
                    let url = await getYouTubeURL(arg);
                    let songReference = await SongManager.getCreateSong(url, message.author, message.channel);
                    songs.push(songReference);
                } catch (e) {
                    // do nothing, can't add song because search query returned nothing.
                    // maybe be could have song references that are like Promise<Rejected>
                    // so we can pass that up????
                }
        }

        return [[...songs, ...playlistSongs], songs.length === 0];
    }
}
