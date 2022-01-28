import { User, Message } from 'discord.js';
import config from '../../config.cjs';
import { SongReference } from './reference.js';
import { getSongTypeFromURL, Song, SongAlreadyExistsError, SongNotFoundError, SongQueueFullError } from './song.js';
import { FileSong } from './file.js';
import { YouTubeSong } from './youtube.js';

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
