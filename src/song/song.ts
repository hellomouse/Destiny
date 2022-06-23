import ffmpeg from 'fluent-ffmpeg';
import Stream from 'stream';
import { v4 as uuidv4 } from 'uuid';
import type { EmbedBuilder } from 'discord.js';
import { formatDuration } from '../utils.js';

/**
 * Base Song class, do not use directly!
 * @author BWBellairs
 * @abstract
 */
export abstract class Song {
    public id: string;
    public references: number;
    public url: string;
    private _thumbnail?: string;
    public get thumbnail(): string | undefined {
        return this._thumbnail;
    }
    public set thumbnail(value: string | undefined) {
        this._thumbnail = value;
    }
    public get formattedDuration() {
        return formatDuration(this.duration);
    }

    public title: string;
    /** Song duration, in seconds */
    public duration: number;
    public artist?: string;

    /**
     * Construct a new song
     * @param {string} url Url of the song
     */
    constructor(url: string) {
        this.id = uuidv4();
        this.references = 0;
        this.url = url;

        this.title = 'No title';
        this.duration = Infinity;
        this.artist = undefined;
    }

    /**
     * Run any async operations after construction,
     * returns itself so you can call {@link finalize}
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
     * @param {EmbedBuilder} embed Embed to modify
     * @return {EmbedBuilder}
     */
    getEmbed(embed: EmbedBuilder) {
        return embed;
    }
}
