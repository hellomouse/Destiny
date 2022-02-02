import type { User } from 'discord.js';
import config from '../../config.cjs';
import { SongReference } from './reference.js';
import { SongAlreadyExistsError, SongNotFoundError, SongQueueFullError } from './song.js';
import { getSongTypeFromURL } from './utils.js';
import type { TextLikeChannels } from '../types';
import { SongTypes } from './types.js';

export class SongManager {
    private static songs: Map<string, SongTypes>;
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
     * @throws {@link SongQueueFullError} If the song cache is full
     */
    static async getCreateSong(url: string, requestedBy: User, requestedChannel: TextLikeChannels) {
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

    /** Check if the specified URL is found in the song manager */
    static hasSong(url: string) {
        let songType = getSongTypeFromURL(url);
        let id = songType.generateIdFromUrl(url);

        return SongManager.hasId(id);
    }

    static hasId(id: string) {
        return SongManager.songs.has(id);
    }

    /**
     * Adds a song to the songs hashmap and returns a song reference
     * @param {Song} song Song to add
     * @param {User} requestedBy User that requested the song
     * @param {TextLikeChannels} requestedChannel Channel in which the song was requested
     * @throws {@link SongAlreadyExistsError} If the song already exists
     * @throws {@link SongQueueFullError} If the song cache is full
     */
    static async addSong(song: SongTypes, requestedBy: User, requestedChannel: TextLikeChannels) {
        if (SongManager.songs.size >= config.songManager.hardNumLimit) throw new SongQueueFullError('Song cache full');
        if (SongManager.hasId(song.id)) throw new SongAlreadyExistsError('Song already exists'); // !!!!

        SongManager.songs.set(song.id, song);

        SongManager.checkCleanup();

        return this.getSongReference(song.id, requestedBy, requestedChannel);
    }

    /**
     * Get the song with the specified id
     * @throws {@link SongNotFoundError} If the song is not found
     */
    static getSong(id: string): SongTypes {
        let song = SongManager.songs.get(id);
        if (typeof song === 'undefined') throw new SongNotFoundError();

        return song;
    }

    /**
     * Gets a song from the songs hashmap and returns a {@link SongReference} containing it
     * @param {Song} song Song to add
     * @param {User} requestedBy User that requested the song
     * @param {TextLikeChannels} requestedChannel Channel in which the song was requested
     * @throws {@link SongNotFoundError} If the song is not found
     */
    static getSongReference(id: string, requestedBy: User, requestedChannel: TextLikeChannels) {
        let song = SongManager.getSong(id);
        if (typeof song === 'undefined') throw new SongNotFoundError(); // need to change to throw error

        return new SongReference(song.id, requestedBy, requestedChannel);
    }

    /**
     * Cleans the songs hashmap of songs that are not in use
     */
    static clean() {
        SongManager.songs.forEach((song, key, songs) => {
            if (song.references === 0) songs.delete(key);
        });
        SongManager.cacheCleanTimeoutDestroyed = true;
    }

    /**
     * Checks if the cache cleanup timeout is running, if not then start it if it should be running
     */
    static checkCleanup() {
        if (this.songs.size > config.songManager.softNumLimit)
            if (SongManager.cacheCleanTimeoutDestroyed) {
                SongManager.cacheCleanTimeoutDestroyed = false;
                SongManager.cacheCleanTimeout = setTimeout(SongManager.clean, SongManager.cacheCleanTimeoutDuration);
            }
    }

    /**
     * Refreshes the song metadata
     */
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
