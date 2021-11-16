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

class Inactivity {
    constructor() {
        this.config = Object.assign({
            waitRejoinSeconds: 60,
            botIdleSeconds: 600
        }, config.inactivity); // Writes default values with ones from written configuration file

        // Convert to milliseconds for timers
        this.config.waitRejoinSeconds *= 1000;
        this.config.botIdleSeconds *= 1000;

        this.aloneTimer = setTimeout(() => { }, 0);
        this.inactivityTimer = setTimeout(() => { }, 0);
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

    /**
     * @description Checks if the provided string is an url
     * @param {string} url
     * @return {boolean} Is url?
     */
    isURL: url => {
        if (!url) return false;
        let pattern = new RegExp('^(https?:\\/\\/)?' +
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' +
            '((\\d{1,3}\\.){3}\\d{1,3}))|' +
            'localhost' +
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' +
            '(\\?[;&a-z\\d%_.~+=-]*)?' +
            '(\\#[-a-z\\d_]*)?$', 'i');
        return pattern.test(url);
    },

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
        let stringOfWords = words.join ? words.join(' ') : words;
        let lookingOnYtb = new Promise((resolve, reject) => {
            YouTube.search(stringOfWords, { limit: 1 })
                .then(result => {
                    resolve('https://www.youtube.com/watch?v=' + result[0].id);
                })
                .catch(err => reject(err));
        });

        let link = await lookingOnYtb;
        return link;
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

    getRandomInt(max) {
        return Math.floor(Math.random() * max);
    },

    async getTimeFromArgument(arg) {
        if (arg === undefined) return undefined;

        seekTime = +arg;
        if (Number.isNaN(+arg)) {
            // Try to match format: XXhXXm or AA:BB:CC
            const getN = (match, n) => match && match[n] ? +match[n].replace(/[^0-9]/g, '') : 0;
            const TIMESTAMP_REGEX_1 = /^(\d+:)?(\d+):(\d+)$/im;
            const TIMESTAMP_REGEX_2 = /^(\d+h)?(\d+m)?(\d+s)?$/im;
    
            let m = arg.match(TIMESTAMP_REGEX_1);
            if (m) seekTime = getN(m, 1) * 60 * 60 + getN(m, 2) * 60 + getN(m, 3);
    
            if (!m) {
                m = arg.match(TIMESTAMP_REGEX_2);
                if (m) seekTime = getN(m, 1) * 60 * 60 + getN(m, 2) * 60 + getN(m, 3);
            }

            return seekTime;
        }

        return seekTime;
    },

    FlagHelpError,

    inactivity: new Inactivity(),

    VOLUME_BASE_UNIT: 100, // what is = 100% volume, note volume command assumes this is 100 (it uses a % sign)
    MAX_VOLUME: 200
};
