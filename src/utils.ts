import AsciiTable from 'ascii-table/ascii-table';
import YouTube from 'youtube-sr';

import embeds from './embeds.js';
import config from '../config';
import type { ServerQueue } from './queue';

class FlagHelpError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FlagHelpError';
    }
}
 
class Inactivity {
    private config: {
        waitRejoinSeconds: number,
        botIdleSeconds: number
    };
    private aloneTimer: NodeJS.Timeout;
    private inactivityTimer: NodeJS.Timeout;

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

    onAlone(serverQueue: ServerQueue) {
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

    onNotPlaying(serverQueue: ServerQueue) {
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

export default {
    /**
     * @description Sends logs to console and adds the date/time
     * @param {*} content
     */
    log: (content: any) => {
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
    isURL: (url: string): boolean => {
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
    showTable: (loaded: {commands: Array<string>, events: Array<string>}) => {
        let table = new AsciiTable('Loading content...');
        table.setHeading('Commands', 'Events');
        for (let i = 0; i <= Math.max(loaded.commands.length, loaded.events.length) - 1; i++)
            table.addRow(loaded.commands[i], loaded.events[i]);

        return table.render();
    },

    getUrl: async (words: string | Array<string>): Promise<string> => {
        let stringOfWords = Array.isArray(words) ? words.join(' ') : words;
        let lookingOnYtb: Promise<string> = new Promise((resolve, reject) => {
            YouTube.search(stringOfWords, { type: 'playlist', limit: 1 })
                .then(result => {
                    resolve('https://www.youtube.com/watch?v=' + result[0].id);
                })
                .catch(err => reject(err));
        });

        return await lookingOnYtb;
    },

    formatDuration: (sec: number) => {
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

    getRandomInt(max:number): number {
        return Math.floor(Math.random() * max);
    },

    FlagHelpError,

    inactivity: new Inactivity(),

    VOLUME_BASE_UNIT: 100, // what is = 100% volume, note volume command assumes this is 100 (it uses a % sign)
    MAX_VOLUME: 200
};
