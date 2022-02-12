import ffmpegPath from 'ffmpeg-static';
import Stream from 'stream';
import { v4 as uuidv4 } from 'uuid';
import type { MessageEmbed } from 'discord.js';
import { spawn } from 'child_process';

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
        const { stdout } = spawn(ffmpegPath,
            [' -i', url, '-ss', seekTime.toString(), '-f', 'mp3', '-fflags', 'nobuffer', '-probesize', '32', '-analyzeduration', '0', '-vn', '-strict', '2', 'pipe:1']);

        stdout.pipe(outputStream);
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
