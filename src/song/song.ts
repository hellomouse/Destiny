import ffmpeg from 'fluent-ffmpeg';
import Stream from 'stream';
import { v4 as uuidv4 } from 'uuid';
import type { MessageEmbed } from 'discord.js';

export class SongAlreadyExistsError extends Error {}
export class SongQueueFullError extends Error {}
export class SongNotFoundError extends Error {}


/**
 * Base Song class, do not use directly!
 * @author BWBellairs
 * @abstract
 */
export abstract class Song {
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
     * @param {MessageEmbed} embed Embed to modify
     * @return {MessageEmbed}
     */
    getEmbed(embed: MessageEmbed) {
        return embed;
    }
}
