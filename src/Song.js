const ytdl = require('ytdl-core');
const utils = require('./utils');

class Song {
    constructor(url, author, channel) {
        this.url = url;
        this.thumbnails = ['https://commons.wikimedia.org/wiki/File:No-Image-Placeholder.svg'];
        this.requestedBy = author;
        this.requestedChannel = channel;
        this.title = 'No title';
        this.formattedDuration = 'NaN:NaN';
        this.duration = Infinity;
        this.thumbnails = [];
        this.songAuthor = undefined;
    }
}

class YouTubeSong extends Song {
    constructor(...args) {
        super(args);
        this.parse();
    }

    parse() {
        let songMetadata = ytdl.getInfo();

        this.id = songMetadata.videoDetails.videoId,
        this.thumbnails = [`https://img.youtube.com/vi/${this.id}/maxresdefault.jpg`];
        this.title = songMetadata.videoDetails.title,
        this.formattedDuration = utils.formatDuration(songMetadata.videoDetails.lengthSeconds),
        this.duration = songMetadata.videoDetails.lengthSeconds,
        this.songAuthor = songMetadata.videoDetails.author,
        this.viewCount = songMetadata.videoDetails.viewCount;
    }
}

class FileSong extends Song {
    constructor(...args) {
        super(args);
    }
}

/**
 *
 * @param {string} url
 * @param {Discord.Message.author} author
 * @param {Discord.Message.channel} channel
 * @return {Song} song
 */
function getSong(url, author, channel) {
    if (url.startsWith('https://youtube.com') || url.startsWith('https://youtu.be')) return new YouTubeSong(url, author, channel);

    if (url.endsWith('.mp3') || url.endsWith('.ogg')) return new FileSong(url, author, channel);
    return undefined;
}

module.exports = getSong;
