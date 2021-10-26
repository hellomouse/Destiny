const ytdl = require('ytdl-core');
const utils = require('./utils');
const embeds = require('./embeds.js');
const ffmpeg = require('fluent-ffmpeg');

/**
 * Base Song class, do not use directly!
 * @author BWBellairs
 */
class Song {
    /**
     * Construct a new song
     * @param {string} url Url of the song
     * @param {MessageAuthor} author Author of the request
     * @param {TextChannel} channel Channel command was run
     */
    constructor(url, author, channel) {
        this.url = url;
        this.thumbnail = null;
        this.requestedBy = author;
        this.requestedChannel = channel;

        this.title = 'No title';
        this.formattedDuration = 'XX:XX';
        this.duration = Infinity;
        this.artist = undefined;
    }

    /**
     * Run any async operations after construction,
     * returns itself so you can call await song.finalize()
     * @return {Song}
     */
    async finalize() {
        return this;
    }

    /**
     * Add fields for now playing embed
     * @param {MessageEmbed} embed Embed to modify
     * @return {MessageEmbed}
     */
    getEmbed(embed) {
        return embed;
    }
}

/**
 * Youtube Song
 * @author BWBellairs
 */
class YouTubeSong extends Song {
    constructor(url, author, channel) {
        super(url, author, channel);
    }

    async finalize() {
        let songMetadata = await ytdl.getBasicInfo(this.url);

        this.id = songMetadata.videoDetails.videoId;
        this.thumbnail = `https://img.youtube.com/vi/${this.id}/maxresdefault.jpg`;
        this.title = songMetadata.videoDetails.title;
        this.formattedDuration = utils.formatDuration(songMetadata.videoDetails.lengthSeconds);
        this.duration = songMetadata.videoDetails.lengthSeconds;
        this.artist = songMetadata.videoDetails.author;
        this.viewCount = songMetadata.videoDetails.viewCount;
        return this;
    }

    async finalizeFromData(id, title, duration, artist, viewCount) {
        this.id = id;
        this.thumbnail = `https://img.youtube.com/vi/${this.id}/maxresdefault.jpg`;
        this.title = title;
        this.duration = duration;
        this.formattedDuration = utils.formatDuration(duration);
        this.artist = artist;
        this.viewCount = viewCount;
        return this;
    }

    getEmbed(embed) {
        return embed.addField('YT Channel', this.artist.name, true);
    }

    get() {
        return ytdl(this.url, {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25
        });
    }
}

/**
 * Song from a file source (url)
 * @author BWBellairs
 */
class FileSong extends Song {
    constructor(url, author, channel) {
        super(url, author, channel);
    }

    async finalize() {
        let metadata = await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(this.url, (err, data) => {
                resolve(data);
            });
        });

        let format = metadata.format;
        let tags = format.tags || {};

        let searchTags = ['title', 'artist', 'album'];
        Object.entries(tags).forEach(([tag, value]) => {
            tag = tag.toLowerCase();
            if (searchTags.includes(tag)) this[tag] = value;
        });

        this.duration = format.duration || this.duration;
        this.duration = Math.round(this.duration);
        this.formattedDuration = utils.formatDuration(this.duration);

        return this;
    }

    getEmbed(embed) {
        if (this.artist) embed.addField('Artist', this.artist, true);
        if (this.album) embed.addField('Album', this.album, true);
        return embed;
    }

    get() {
        return this.url;
    }
}

/**
 * Get a Song object given its url
 * @param {string} url Url to song
 * @param {Discord.Message.author} author
 * @param {Discord.Message.channel} channel
 * @return {Song} song
 */
async function getSong(url, author, channel) {
    if (!url) return;

    if (url.startsWith('https://www.youtube.com') || url.startsWith('https://youtu.be'))
        return await new YouTubeSong(url, author, channel).finalize();

    if (url.endsWith('.mp3') || url.endsWith('.ogg') || url.endsWith('.flac') || url.endsWith('.webm'))
        return await new FileSong(url, author, channel).finalize();
}

module.exports = { getSong, Song, YouTubeSong, FileSong };

