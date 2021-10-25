const ytdl = require('ytdl-core');
const utils = require('./utils');
const embeds = require('./embeds.js');

class Song {
    constructor(url, author, channel) {
        this.url = url;
        this.thumbnails = [{ url: 'https://cdn.discordapp.com/avatars/741961294415921232/6ccf59489615bb4d7e48072449c85584.webp?size=512' }];
        this.requestedBy = author;
        this.requestedChannel = channel;
        this.title = 'No title';
        this.formattedDuration = 'NaN:NaN';
        this.duration = Infinity;
        this.songAuthor = undefined;
    }

    getEmbed(time, isPaused) {
        return embeds
            .songEmbed(this, `Now Playing`, false)
            .addField('Duration', `${time} / ${this.formattedDuration}`, true)
            .addField('Action', isPaused ? 'Paused' : 'Playing', true);
    }

}

class YouTubeSong extends Song {
    constructor(url, author, channel) {
        super(url, author, channel);
    }

    async parse() {
        let songMetadata = await ytdl.getBasicInfo(this.url);

        this.id = songMetadata.videoDetails.videoId;
        this.thumbnails = [{ url: `https://img.youtube.com/vi/${this.id}/maxresdefault.jpg` }];
        this.title = songMetadata.videoDetails.title;
        this.formattedDuration = utils.formatDuration(songMetadata.videoDetails.lengthSeconds);
        this.duration = songMetadata.videoDetails.lengthSeconds;
        this.songAuthor = songMetadata.videoDetails.author;
        this.viewCount = songMetadata.videoDetails.viewCount;
        return this;
    }

    getEmbed(time, isPaused) {
        return embeds
            .songEmbed(this, `Now Playing`, false)
            .addField('Duration', `${time} / ${this.formattedDuration}`, true)
            .addField('Action', isPaused ? 'Paused' : 'Playing', true)
            .addField('YT Channel', this.songAuthor.name, true);
    }

    get() {
        return ytdl(this.url, {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25
        });
    }
}

class FileSong extends Song {
    constructor(url, author, channel) {
        super(url, author, channel);
    }

    get() {
        return this.url;
    }
}

/**
 *
 * @param {string} url
 * @param {Discord.Message.author} author
 * @param {Discord.Message.channel} channel
 * @return {Song} song
 */
async function getSong(url, author, channel) {
    if (url.startsWith('https://www.youtube.com') || url.startsWith('https://youtu.be'))
        return await new YouTubeSong(url, author, channel).parse();

    if (url.endsWith('.mp3') || url.endsWith('.ogg'))
        return new FileSong(url, author, channel);
    return undefined;
}

module.exports = getSong;
