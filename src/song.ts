import ytdl from 'ytdl-core';
import utils from './utils.js';
import config from '../config';
import ffmpeg from 'fluent-ffmpeg';
import playlist from 'ytpl';
import Stream from 'stream';
import { v4 as uuidv4 } from 'uuid';
import type { Message, MessageEmbed, TextChannel, User } from 'discord.js';

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
     * @param {MessageAuthor} author Author of the request
     * @param {TextChannel} channel Channel command was run
     */
    constructor(url: string, author: User, channel: TextChannel) {
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

    static async getSongURLs(args: Array<string>, message: Message,
        unpackPlaylists = false): Promise<[(Song | Promise<Song> | undefined)[], boolean]> {
        let songs: Array<Song | undefined> = [];
        let playlistSongs: Array<Promise<Song>> = [];

        if (message.attachments.size > 0)
            args = [...args, ...message.attachments.map(x => x.url)];

        for (let arg of args) {
            let isPlaylist = YouTubeSong.getYoutubePlaylistID(arg);
            if (isPlaylist && unpackPlaylists)
                playlistSongs = [...playlistSongs, ...await YouTubeSong.unpackPlaylist(arg, message)];
            else if (utils.isURL(arg))
                songs.push(await getSong(arg, message.author, message.channel));
            else
                await utils.getUrl(arg).then(song => songs.push(song)).catch(err => { });
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

    constructor(url: string, author: User, channel: TextChannel) {
        super(url, author, channel);
    }

    async finalize(id?: string, title?: string, duration?: number,
        artist?: string, viewCount?: number): Promise<YouTubeSong> {
        const defaultSongMetadata = {
            videoDetails: {
                videoId: id,
                title: 'Unknown Title',
                lengthSeconds: 0,
                author: { name: 'Unknown' },
                viewCount: 0
            }
        };
        let songMetadata = !id ? await ytdl.getInfo(this.url) : defaultSongMetadata;

        this.youtubeId = id || songMetadata.videoDetails.videoId;
        this.id = `${this.youtubeId}_${this.id}`;
        this.metadataTTL = Date.now() + (config.songManager.metadataRefreshInterval.YouTubeSong || this.metadataTTL);
        this.thumbnail = `https://img.youtube.com/vi/${this.youtubeId}/maxresdefault.jpg`;
        this.title = title || songMetadata.videoDetails.title;
        this.duration = duration || +songMetadata.videoDetails.lengthSeconds || this.duration;
        this.formattedDuration = utils.formatDuration(this.duration);
        this.artist = artist || songMetadata.videoDetails.author.name;
        this.viewCount = viewCount || +songMetadata.videoDetails.viewCount;

        return this;
    }

    async getStreamURL() {
        let formats = (await ytdl.getInfo(this.url)).formats;
        return formats.filter(format => format.mimeType?.includes('audio/mp4'))[0].url;
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
        return m ? m[2] : null;
    }

    static getYouTubePlaylistURLs(args: Array<string>) {
        return args.filter(x => this.getYoutubePlaylistID(x));
    }

    static async getPlaylistData(url: string) {
        return await playlist(url);
    }

    static async unpackPlaylist(url: string, message: Message) {
        let songs: Array<Promise<Song>> = [];

        const playlistData = await YouTubeSong.getPlaylistData(url);
        if (!playlistData)
            return [];

        playlistData.items.forEach((song: playlist.Item) => {
            songs.push(new YouTubeSong(
                `https://www.youtube.com/watch?v=${song.id}`,
                message.author,
                message.channel
            ).finalize(
                song.id,
                song.title,
                song.durationSec || undefined,
                song.author.name
            ));
        });

        return songs;
    }
}

/**
 * Song from a file source (url)
 * @author BWBellairs
 */
class FileSong extends Song {
    public album?: string;

    constructor(url: string, author: User, channel: TextChannel) {
        super(url, author, channel);
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
        this.formattedDuration = utils.formatDuration(this.duration);

        return this;
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

enum SongManagerErrors {
    CacheFull,
    SongAlreadyExists,
    SongDoesNotExist
}
export class SongManager {
    private static songs: Map<string, Song>;
    private static cacheCleanTimeout: NodeJS.Timeout;
    private static cacheCleanTimeoutDestroyed: boolean;
    private static cacheCleanTimeoutDuration: number;

    constructor() {
        SongManager.songs = new Map();
        SongManager.cacheCleanTimeout = setTimeout(() => { }, 0);
        SongManager.cacheCleanTimeoutDuration = config.songManager.cacheCleanTimeoutDuration *= 1000;
        SongManager.cacheCleanTimeoutDestroyed = true;
    }

    static async addSong(song: Song) {
        if (SongManager.songs.size >= config.songManager.hardNumLimit) return SongManagerErrors.CacheFull;
        if (await SongManager.getSong(song.id)) return SongManagerErrors.SongAlreadyExists;

        SongManager.songs.set(song.id, song);

        SongManager.checkCleanup();
    }

    static async getSong(id: string) {
        let song = SongManager.songs.get(id);
        if (song === undefined) return undefined;

        if (Date.now() > song.metadataTTL) return SongManager.songs.get(id)?.finalize();
        return SongManager.songs.get(id);
    }

    static getSongReference(id: string, requestedBy: User, requestedChannel: TextChannel) {
        let song = SongManager.getSong(id);
        if (song === undefined) return SongManagerErrors.SongDoesNotExist;

        return new SongReferemce(song.id, requestedBy, requestedChannel);
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
}

new SongManager();

class SongReferemce {
    public readonly id: string;
    public readonly requestedBy: User;
    public requestedChannel: TextChannel;

    constructor(id: string, requestedBy: User, requestedChannel: TextChannel) {
        this.id = id;
        this.requestedBy = requestedBy;
        this.requestedChannel = requestedChannel;
    }

    get song() {
        return SongManager.getSong(this.id);
    }
}

/**
 * Get a Song object given its url
 * @param {string} url Url to song
 * @param {Discord.Message.author} author
 * @param {Discord.Message.channel} channel
 * @return {Song} song
 */
async function getSong(url: string, author: User, channel: TextChannel) {
    if (!url) return undefined;

    if (url.startsWith('https://www.youtube.com') || url.startsWith('https://youtu.be'))
        return await new YouTubeSong(url, author, channel).finalize();

    if (url.endsWith('.mp3') || url.endsWith('.ogg') || url.endsWith('.flac') || url.endsWith('.webm') || url.endsWith('.mp4') || url.endsWith('.mov'))
        return await new FileSong(url, author, channel).finalize();
}

export { getSong, Song, YouTubeSong, FileSong, SongManagerErrors };

