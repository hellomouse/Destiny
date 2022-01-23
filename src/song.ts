import ytdl from 'ytdl-core';
import { formatDuration, getYouTubeURL, isURL } from './utils.js';
import config from '../config.cjs';
import ffmpeg from 'fluent-ffmpeg';
import playlist from 'ytpl';
import Stream from 'stream';
import { v4 as uuidv4 } from 'uuid';
import type { Message, MessageEmbed, User } from 'discord.js';

class SongAlreadyExistsError extends Error {}
class SongQueueFullError extends Error {}
class SongNotFoundError extends Error {}

/**
 * Get a Song object given its url
 * @param {string} url Url to song
*/
function getSongTypeFromURL(url: string) {
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
export default class Song {
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
     * Return a stream that starts at seekTime
     * @param {string} url stream url
     * @param {number} seekTime Seconds to seek to
     * @return {*} Stream object
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

/**
 * Youtube Song
 * @author BWBellairs
 */
class YouTubeSong extends Song {
    public youtubeId?: string;
    public viewCount?: number;

    constructor(url: string) {
        super(url);
    }

    static isSong(url: string) {
        return ytdl.validateURL(url);
    }

    async finalize(id?: string, title?: string, duration?: number,
        artist?: string, viewCount?: number): Promise<YouTubeSong> {
        const defaultSongMetadata = {
            videoDetails: {
                videoId: id || '0',
                title: 'Unknown Title',
                lengthSeconds: 0,
                author: { name: 'Unknown' },
                viewCount: 0
            }
        };
        let songMetadata = !id ? await ytdl.getInfo(this.url) : defaultSongMetadata;

        this.youtubeId = id || songMetadata.videoDetails.videoId;
        this.id = YouTubeSong.generateId(this.youtubeId);
        this.metadataTTL = Date.now() +
            (config.songManager.metadataRefreshInterval.YouTubeSong! * 1000 || this.metadataTTL);
        this.thumbnail = `https://img.youtube.com/vi/${this.youtubeId}/maxresdefault.jpg`;
        this.title = title || songMetadata.videoDetails.title;
        this.duration = duration || +songMetadata.videoDetails.lengthSeconds || this.duration;
        this.formattedDuration = formatDuration(this.duration);
        this.artist = artist || songMetadata.videoDetails.author.name;
        this.viewCount = viewCount || +songMetadata.videoDetails.viewCount;

        return this;
    }

    async getStreamURL() {
        let formats = (await ytdl.getInfo(this.url)).formats;
        return formats.filter(format => format.mimeType?.includes('audio/mp4'))[0].url;
    }

    static generateId(id: string) {
        return `youtube_${id}`;
    }

    static generateIdFromUrl(url: string) {
        return YouTubeSong.generateId(ytdl.getURLVideoID(url));
    }

    getEmbed(embed: MessageEmbed) {
        return embed.addField('YT Channel', this.artist || 'No artist', true);
    }

    async getStream(seek = 0) {
        if (!seek) return ytdl(this.url, {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25
        });

        return this.seek(await this.getStreamURL(), seek);
    }

    /**
     * @param {string} url Url to check
     * @return {*} undefined if no playlist id, otherwise string playlits id
     */
    static getYoutubePlaylistID(url: string) {
        if (!url) return;
        const YT_REGEX = /^.*(youtu.be\/|list=)([^#&?]*).*/;
        const m = url.match(YT_REGEX);
        return m ? m[2] : undefined;
    }

    static getYouTubePlaylistURLs(args: Array<string>) {
        return args.filter(x => this.getYoutubePlaylistID(x));
    }

    static async getPlaylistData(url: string) {
        return await playlist(url);
    }

    static async unpackPlaylist(url: string, message: Message) {
        let songs: Array<SongReference> = [];

        const playlistData = await YouTubeSong.getPlaylistData(url);
        if (!playlistData)
            return [];

        for (let song of playlistData.items) {
            let id = YouTubeSong.generateId(song.id);

            let songReference: SongReference;
            if (!SongManager.hasId(id)) {
                const ytSong = new YouTubeSong(
                    `https://www.youtube.com/watch?v=${song.id}`
                );
                songReference = await SongManager.addSong(
                    await ytSong.finalize(
                        song.id,
                        song.title,
                        song.durationSec!,
                        song.author.name,
                        undefined
                    ),
                    message.author,
                    message.channel
                );
            } else
                songReference = SongManager.getSongReference(id, message.author, message.channel);

            songs.push(songReference);
        }

        return songs;
    }
}

/**
 * Song from a file source (url)
 * @author BWBellairs
 */
class FileSong extends Song {
    public album?: string;

    constructor(url: string) {
        super(url);
    }

    static isSong(url: string) {
        let urlSplit = url.split('.');

        let extension = urlSplit[urlSplit.length];
        return ['.mp3', '.ogg', '.flac', '.webm', 'mp4', 'mov'].includes(extension);
    }
    async finalize() {
        let metadata: ffmpeg.FfprobeData = await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(this.url, (err, data) => {
                resolve(data);
            });
        });

        if (!metadata) return this;

        let format = metadata.format;
        let tags = format.tags || {};

        let searchTags = ['title', 'artist', 'album'];
        Object.entries(tags).forEach(([tag, value]) => {
            tag = tag.toLowerCase();
            if (searchTags.includes(tag)) Object.assign(this, { tag: value });
        });

        this.duration = format.duration || this.duration;
        this.duration = Math.round(this.duration);
        this.formattedDuration = formatDuration(this.duration);

        return this;
    }

    static generateIdFromUrl(url: string) {
        return url;
    }

    getEmbed(embed: MessageEmbed) {
        if (this.artist) embed.addField('Artist', this.artist, true);
        if (this.album) embed.addField('Album', this.album, true);
        return embed;
    }

    async getStream(seek = 0) {
        if (seek === 0) return this.url;

        return this.seek(this.url, seek);
    }
}

export class SongManager {
    private static songs: Map<string, YouTubeSong | FileSong>;
    private static cacheCleanTimeout: NodeJS.Timeout;
    private static cacheCleanTimeoutDestroyed: boolean;
    private static cacheCleanTimeoutDuration: number;

    constructor() {
        SongManager.songs = new Map();
        SongManager.cacheCleanTimeout = setTimeout(() => { }, 0);
        SongManager.cacheCleanTimeoutDuration = config.songManager.cacheCleanTimeoutDuration *= 1000;
        SongManager.cacheCleanTimeoutDestroyed = true;
    }

    /**
     * Creates a new song in the songs hashmap, if it already exists then return it
     */
    static async getCreateSong(url: string, requestedBy: User, requestedChannel: Message['channel']): Promise<SongReference> {
        // Stupid eslint... We throw an error if the song is not a known song type
        // eslint-disable-next-line no-useless-catch
        try {
            let songType = getSongTypeFromURL(url);
            let id = songType.generateIdFromUrl(url);

            if (SongManager.songs.has(id)) return SongManager.getSongReference(id, requestedBy, requestedChannel);

            // eslint-disable-next-line new-cap
            let song = await new songType(url).finalize();
            let songReference = await SongManager.addSong(song, requestedBy, requestedChannel);

            return songReference;
        } catch (error) {
            throw error;
        }
    }

    static async hasSong(url: string) {
        let songType = getSongTypeFromURL(url);
        let id = songType.generateIdFromUrl(url);

        return SongManager.hasId(id);
    }

    static hasId(id: string) {
        return SongManager.songs.has(id);
    }

    static async addSong(song: YouTubeSong | FileSong, requestedBy: User, requestedChannel: Message['channel']) {
        if (SongManager.songs.size >= config.songManager.hardNumLimit) throw new SongQueueFullError('Song cache full');
        if (SongManager.hasId(song.id)) throw new SongAlreadyExistsError('Song already exists'); // !!!!

        SongManager.songs.set(song.id, song);

        SongManager.checkCleanup();

        return this.getSongReference(song.id, requestedBy, requestedChannel);
    }

    static getSong(id: string): YouTubeSong | FileSong {
        let song = SongManager.songs.get(id);
        if (typeof song === 'undefined') throw new SongNotFoundError();

        return song;
    }

    static getSongReference(id: string, requestedBy: User, requestedChannel: Message['channel']) {
        let song = SongManager.getSong(id);
        if (typeof song === 'undefined') throw new SongNotFoundError(); // need to change to throw error

        return new SongReference(song.id, requestedBy, requestedChannel);
    }

    static clean() {
        SongManager.songs.forEach((song: Song, key: string, songs: Map<string, Song>) => {
            if (song.references === 0) songs.delete(key);
        });
        SongManager.cacheCleanTimeoutDestroyed = true;
    }

    static checkCleanup() {
        if (this.songs.size > config.songManager.softNumLimit)
            if (SongManager.cacheCleanTimeoutDestroyed) {
                SongManager.cacheCleanTimeoutDestroyed = false;
                SongManager.cacheCleanTimeout = setTimeout(SongManager.clean, SongManager.cacheCleanTimeoutDuration);
            }
    }

    static refreshMetadata() {
        let date = Date.now();
        SongManager.songs.forEach(async song => {
            // If the song metadata is old then update it
            if (date > song.metadataTTL)
                await song.finalize();
        });
    }
}

export const songManager = new SongManager(); // need to export this so queue.ts can use it
setInterval(SongManager.refreshMetadata, 600000); // Check for song available metadata refreshes every 10 minutes

export class SongReference {
    public readonly id: string;
    public readonly requestedBy: User;
    public requestedChannel: Message['channel'];


    // when we ask for a song reference, increment the link song.references variable by one
    // songreference is like a proxy
    // have delete method here, when we remove it from a SongQueue we call delete. song.references--
    // this will allow cleanup of unused songs from the global songs map
    constructor(id: string, requestedBy: User, requestedChannel: Message['channel']) {
        this.id = id;
        this.requestedBy = requestedBy;
        this.requestedChannel = requestedChannel;
    }

    get song() {
        return SongManager.getSong(this.id);
    }
}

export { Song, YouTubeSong, FileSong };

