import { YouTubeSong } from './youtube.js';
import { FileSong } from './file.js';

// Errors
export class SongAlreadyExistsError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = 'SongAlreadyExistsError';
    }
}
export class SongQueueFullError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = 'SongQueueFullError';
    }
}
export class SongNotFoundError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = 'SongNotFoundError';
    }
}

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
