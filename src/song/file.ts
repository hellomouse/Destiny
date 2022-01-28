import ffmpeg from 'fluent-ffmpeg';
import type { MessageEmbed } from 'discord.js';
import { formatDuration } from '../utils.js';
import { Song } from './song.js';

/**
 * Song from a file source (url)
 * @author BWBellairs
 */
export class FileSong extends Song {
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

        return await this.seek(this.url, seek);
    }
}
