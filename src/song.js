const ytdl = require('ytdl-core');
const utils = require('./utils.js');
const ffmpeg = require('fluent-ffmpeg');
const YouTube = require('youtube-sr').default;
const Stream = require('stream');
const request = require('request');

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
     * Return a stream that starts at seekTime
     * @param {string} url stream url
     * @param {number} seekTime Seconds to seek to
     * @return {*} Stream object
     */
    async seek(url, seekTime = 0) {
        let outputStream = new Stream.PassThrough();
        ffmpeg(url)
            .seekInput(seekTime)
            .format('mp3')
            .inputOptions( '-fflags', 'nobuffer', '-probesize', '32', '-analyzeduration', '0') // '-ss', seekTime,
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
                .finalize(video.id, video.title, video.duration / 1000, video.channel.name, video.views)));

        return songs;
    }

    static async getSongURLs(args, message, unpackPlaylists = false) {
        let songs = [];
        let playlistSongs = [];
        let attachmentSongs = [];

        if (message.attachments.size > 0)
            attachmentSongs = message.attachments.map(x => x.url);

        // A file could link to itself? Maybe have recursive depth limit
        // Currently, only file playlists can be used from attatchments but what about .txt links in args?
        // ^ also means recursion is impossible unless you guess the link to be generated for the attatchment
        attachmentSongs = await Promise.all(attachmentSongs.flatMap(async song =>
            await new Promise((resolve, reject) => {
                if (!song.endsWith('.txt')) resolve(song);
                request(song, async (error, response, body) => {
                    if (error) resolve([]);

                    let lines = body.split('\n');
                    let [songs_] = await this.getSongURLs(lines, { attachments: [] }, false);
                    resolve(songs_);
                });
            })));

        args = [...args, ...attachmentSongs.flat()];

        for (let arg of args) {
            let playlist = this.getYoutubePlaylistID(arg);
            if (playlist && unpackPlaylists)
                playlistSongs = [...playlistSongs, ...await this.unpackPlaylist(arg, message)];
            else if (utils.isURL(arg))
                songs.push(arg);
            else
                await utils.getUrl(arg).then(song => songs.push(song)).catch(err => {});
        }

        return [[...songs, ...playlistSongs], songs.length === 0, args];
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

    async finalize(id, title, duration, artist, viewCount) {
        const defaultSongMetadata = {
            videoDetails: {
                videoId: id,
                title: 'Unknown Title',
                lengthSeconds: 0,
                author: { name: 'Unknown' },
                viewCount: 0
            }
        };
        let songMetadata = !id ? await ytdl.getInfo(this.url) : defaultSongMetadata;

        this.id = id || songMetadata.videoDetails.videoId;
        this.thumbnail = `https://img.youtube.com/vi/${this.id}/maxresdefault.jpg`;
        this.title = title || songMetadata.videoDetails.title;
        this.duration = duration || +songMetadata.videoDetails.lengthSeconds || this.duration;
        this.formattedDuration = utils.formatDuration(this.duration);
        this.artist = artist || songMetadata.videoDetails.author.name;
        this.viewCount = viewCount || songMetadata.videoDetails.viewCount;
        return this;
    }

    async getStreamURL() {
        let formats = (await ytdl.getInfo(this.url)).formats;
        return formats.filter(format => format.mimeType.includes('audio/mp4'))[0].url;
    }

    getEmbed(embed) {
        return embed.addField('YT Channel', this.artist, true);
    }

    async getStream(seek = 0) {
        if (!seek) return ytdl(this.url, {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25
        });

        return this.seek(await this.getStreamURL(), seek);
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

    async getStream(seek = 0) {
        if (seek === 0) return this.url;

        return this.seek(this.url, seek);
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

