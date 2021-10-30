const ytdl = require('ytdl-core');
const utils = require('./utils.js');
const ffmpeg = require('fluent-ffmpeg');
const YouTube = require('youtube-sr').default;

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

    /**
     * @param {string} url Url to check
     * @return {*} undefined if no playlist id, otherwise string playlits id
     */
    static getYoutubePlaylistID(url) {
        if (!url) return;
        const YT_REGEX = /^.*(youtu.be\/|list=)([^#\&\?]*).*/;
        const m = url.match(YT_REGEX);
        return m ? m[2] : null;
    }

    static getYouTubePlaylistURLs(args) {
        return args.filter(x => this.getYoutubePlaylistID(x));
    }

    static async getPlaylistData(url) {
        return await YouTube.getPlaylist(url).then(playlist => playlist.fetch());
    }

    static async unpackPlaylist(url, message) {
        let songs = [];

        const playlistData = await Song.getPlaylistData(url);
        if (!playlistData)
            return [];

        songs = await Promise.all(playlistData.videos.map(async video =>
            new YouTubeSong(`https://www.youtube.com/watch?v=${video.id}`, message.author, message.channel)
                .finalizeFromData(video.id, video.title, video.duration / 1000, video.channel.name, video.views)));

        return songs;
    }

    static async getSongURLs(args, message, unpackPlaylists = false) {
        let songs = [];
        let playlistSongs = [];

        if (message.attachments.size > 0)
            songs = message.attachments.map(x => x.url);

        for (let arg of args) {
            let playlist = this.getYoutubePlaylistID(arg);
            if (playlist && unpackPlaylists)
                playlistSongs = [...playlistSongs, ...await this.unpackPlaylist(arg, message)];
            else if (utils.isURL(arg))
                songs.push(arg);
        }

        return [[...songs, ...playlistSongs], songs.length === 0];
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
        return embed.addField('YT Channel', this.artist, true);
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

        if (!metadata) return undefined;

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

    if (url.endsWith('.mp3') || url.endsWith('.ogg') || url.endsWith('.flac') || url.endsWith('.webm') || url.endsWith('.mp4') || url.endsWith('.mov'))
        return await new FileSong(url, author, channel).finalize();
}

module.exports = { getSong, Song, YouTubeSong, FileSong };

