const AsciiTable = require('ascii-table/ascii-table');
const YouTube = require('youtube-sr').default;

const embeds = require('./embeds.js');
const config = require('../config');

class FlagHelpError extends Error {
    constructor(message) {
        super(message);
        this.name = 'FlagHelpError';
    }
}

class Inactivity { // TODO: each ServerQueue should have it's own instance, also not all timers are cleared. Only dereferenced
    constructor() {
        this.config = Object.assign({
            waitRejoinSeconds: 60,
            botIdleSeconds: 600
        }, config.inactivity); // Writes default values with ones from written configuration file

        // Convert to milliseconds for timers
        this.config.waitRejoinSeconds *= 1000;
        this.config.botIdleSeconds *= 1000;

        this.aloneTimer = setTimeout(() => {}, 0);
        this.inactivityTimer = setTimeout(() => {}, 0);
    }

    onAlone(serverQueue) {
        clearTimeout(this.aloneTimer);
        if (this.config.waitRejoinSeconds < 0) return;
        setTimeout(() => {
            serverQueue.voiceChannel.leave();
            serverQueue.textChannel.send(embeds.defaultEmbed().setDescription(':wave: Leaving as no one is in VC'));
        }, this.config.waitRejoinSeconds);
    }

    onPersonJoin() {
        clearTimeout(this.aloneTimer);
    }

    onNotPlaying(serverQueue) {
        clearTimeout(this.inactivityTimer);
        if (this.config.botIdleSeconds < 0) return;
        setTimeout(() => {
            serverQueue.voiceChannel.leave();
            serverQueue.textChannel.send(embeds.defaultEmbed().setDescription(':wave: Leaving due to inactivity'));
        }, this.config.botIdleSeconds);
    }

    onPlaying() {
        clearTimeout(this.inactivityTimer);
    }
}

/**
 * @param {string} url Url to check
 * @return {*} undefined if no playlist id, otherwise string playlits id
 */
function getYoutubePlaylistID(url) {
    if (!url) return;
    const YT_REGEX = /^.*(youtu.be\/|list=)([^#\&\?]*).*/;
    const m = url.match(YT_REGEX);
    return m ? m[2] : null;
}

async function unpackPlaylist(url, message) {
    const { YouTubeSong } = require('./song.js');

    let songs = [];

    const playlistData = await YouTube.getPlaylist(url).then(playlist => playlist.fetch());
    if (!playlistData)
        return [];

    songs = await Promise.all(playlistData.videos.map(async video =>
        new YouTubeSong(`https://www.youtube.com/watch?v=${video.id}`, message.author, message.channel)
            .finalizeFromData(video.id, video.title, video.duration / 1000, video.channel.name, video.views)));

    return songs;
}


/**
 * @description Checks if the provided string is an url
 * @param {string} url
 * @return {boolean} Is url?
 */
function isURL(url) {
    if (!url) return false;
    let pattern = new RegExp('^(https?:\\/\\/)?' +
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' +
        '((\\d{1,3}\\.){3}\\d{1,3}))|' +
        'localhost' +
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' +
        '(\\?[;&a-z\\d%_.~+=-]*)?' +
        '(\\#[-a-z\\d_]*)?$', 'i');
    return pattern.test(url);
}

module.exports = {
    /**
     * @description Sends logs to console and adds the date/time
     * @param {*} content
     */
    log: content => {
        let dateObj = new Date();

        let date = dateObj.getDate().toString();
        let month = dateObj.getMonth().toString();
        let year = dateObj.getFullYear().toString();

        if (date.length === 1) date = '0' + date;
        if (month.length === 1) month = '0' + month;

        let dmy = date + '/' + month + '/' + year;

        /* Gets hours, minutes and seconds */
        let hms = dateObj.toLocaleTimeString();

        console.log(`[ ${dmy} | ${hms} ] ${content}`);
    },

    isURL,

    /**
     * @description Create an ascii-table shown in the console on startup with the loaded events & commands
     * @param {object} loaded
     * @return {string} ASCII table
     */
    showTable: loaded => {
        let table = new AsciiTable('Loading content...');
        table.setHeading('Commands', 'Events');
        for (let i = 0; i <= Math.max(loaded.commands.length, loaded.events.length) - 1; i++)
            table.addRow(loaded.commands[i], loaded.events[i]);

        return table.render();
    },

    getUrl: async words => {
        let stringOfWords = words.join(' ');
        let lookingOnYtb = new Promise(resolve => {
            YouTube.search(stringOfWords, { limit: 1 })
                .then(result => {
                    resolve('https://www.youtube.com/watch?v=' + result[0].id);
                });
        });

        let link = await lookingOnYtb;
        return link;
    },

    unpackPlaylist,
    getYoutubePlaylistID,

    async getSongURLs(args, message, unpackPlaylists = false) {
        let songs = [];

        if (message.attachments.size > 0)
            songs = message.attachments.map(x => x.url);

        for (let arg of args) {
            let playlist = getYoutubePlaylistID(arg);
            if (playlist && unpackPlaylists)
                songs = [...songs, ...await unpackPlaylist(arg, message)];
            else if (isURL(arg))
                songs.push(arg);
        }

        return songs;
    },

    formatDuration: sec => {
        sec = Math.round(sec);
        let min = Math.floor(sec / 60);
        let hours = Math.floor(min / 60);
        min %= 60;
        sec %= 60;

        let result = hours > 0 ? `${hours}h ` : '';
        result += min < 10 ? '0' + min : min;
        result += ':';
        result += sec < 10 ? '0' + sec : sec;
        return result;
    },

    FlagHelpError,

    inactivity: new Inactivity(),

    VOLUME_BASE_UNIT: 100, // what is = 100% volume, note volume command assumes this is 100 (it uses a % sign)
    MAX_VOLUME: 200
};
