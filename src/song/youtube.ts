import { EmbedBuilder, Message } from 'discord.js';
import ytdl from 'ytdl-core';
import playlist from 'ytpl';
import { Song } from './song.js';
import { SongManager } from './manager.js';
import type { SongReference } from './reference.js';

/**
 * Youtube Song
 * @author BWBellairs
 */
export class YouTubeSong extends Song {
    public youtubeId?: string;
    public viewCount?: number;

    constructor(url: string) {
        super(url);
    }

    /**
     * Checks if a url is a valid youtube url
     * @param url URL to check
     */
    static isSong(url: string) {
        return ytdl.validateURL(url);
    }

    async finalize(id?: string, title?: string, duration?: number,
        artist?: string, viewCount?: number): Promise<this> {
        const defaultSongMetadata = {
            videoDetails: {
                videoId: id || '0',
                title: 'Unknown Title',
                lengthSeconds: 0,
                author: { name: 'Unknown' },
                viewCount: 0
            }
        };
        let songMetadata = !id ? await ytdl.getBasicInfo(this.url) : defaultSongMetadata;

        this.youtubeId = id || songMetadata.videoDetails.videoId;
        this.id = YouTubeSong.generateId(this.youtubeId);
        this.title = title || songMetadata.videoDetails.title;
        this.duration = duration || +songMetadata.videoDetails.lengthSeconds || this.duration;
        this.artist = artist || songMetadata.videoDetails.author.name;
        this.viewCount = viewCount || +songMetadata.videoDetails.viewCount;

        return this;
    }

    public get thumbnail() {
        return `https://img.youtube.com/vi/${this.youtubeId}/maxresdefault.jpg`;
    }

    /**
     * Returns a stream url to be used with ffmpeg for seeking
     */
    async getStreamURL() {
        // This call takes about a second which is noticable, can it be improved?
        let formats = (await ytdl.getInfo(this.url)).formats;
        return formats.filter(format => format.mimeType?.includes('audio/mp4'))[0].url;
    }

    /**
     * Generate a unique id for the song to be used with SongManager
     */
    static generateId(id: string) {
        return `youtube_${id}`;
    }

    /**
     * Generate a unique id from a youtube url
     */
    static generateIdFromUrl(url: string) {
        return YouTubeSong.generateId(ytdl.getURLVideoID(url));
    }

    getEmbed(embed: EmbedBuilder) {
        return embed.addFields({ name: 'YT Channel', value: this.artist || 'No artist', inline: true });
    }

    /**
     * @param {number} seek Seek time
     * Returns a stream to be used with {@link ServerQueue.play}
     */
    async getStream(seek = 0) {
        if (!seek) return ytdl(this.url, {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25
        });

        return await this.seek(await this.getStreamURL(), seek);
    }

    /**
     * @param {string} url Potential playlist url
     * @return {string|undefined} Returns undefined if url provided isn't a valid playlist url or is a watch later one
     */
    static getYoutubePlaylistID(url: string) {
        if (!url) return;
        const YT_REGEX = /^.*(youtu\.be|youtube.com)\/(.*list=)([^#&?].*)/;
        const m = url.match(YT_REGEX);
        return m && m[3] !== 'WL' ? m[3] : undefined;
    }

    /**
     * Get song URLs from a given YouTube playlist ID
     */
    static getYouTubePlaylistURLs(args: Array<string>) {
        return args.filter(x => this.getYoutubePlaylistID(x));
    }

    /**
     * Gets the metadata of a given YouTube playlist
     * @param url YouTube playlist url
     */
    static async getPlaylistData(url: string) {
        return await playlist(url, { limit: Infinity, pages: Infinity });
    }

    /**
     * Processes videos in a youtube playlist
     * If the video has been cached, a {@link SongReference} will be added to the array to be returned
     * else a new {@link YouTubeSong} is created with the metadata given from the playlist metdata call
     */
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
