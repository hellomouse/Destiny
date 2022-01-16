import AsciiTable from 'ascii-table';

import embeds from './embeds';
import config from '../config';
import type { ServerQueue } from './queue';
import ytsr from 'ytsr';

export class FlagHelpError extends Error {
    constructor(message?: string) {
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
            serverQueue.leave();
            serverQueue.textChannel.send({ embeds: [embeds.defaultEmbed().setDescription(':wave: Leaving as no one is in VC')] });
        }, this.config.waitRejoinSeconds);
    }

    onPersonJoin() {
        clearTimeout(this.aloneTimer);
    }

    onNotPlaying(serverQueue: ServerQueue) {
        clearTimeout(this.inactivityTimer);
        if (this.config.botIdleSeconds < 0) return;
        setTimeout(() => {
            serverQueue.leave();
            serverQueue.textChannel.send({ embeds: [embeds.defaultEmbed().setDescription(':wave: Leaving due to inactivity')] });
        }, this.config.botIdleSeconds);
    }

    onPlaying() {
        clearTimeout(this.inactivityTimer);
    }
}

export const inactivity = new Inactivity();

/**
     * @description Sends logs to console and adds the date/time
     * @param {*} content
     */
export function log(content: any) {
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
}

/**
 * @description Checks if the provided string is an url
 * @param {string} url
 * @return {boolean} Is url?
 */
export function isURL(url: string): boolean {
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

/**
 * @description Create an ascii-table shown in the console on startup with the loaded events & commands
 * @param {object} loaded
 * @return {string} ASCII table
 */
export function showTable(loaded: { commands: Array<string>, events: Array<string> }) {
    let table = new AsciiTable('Loading content...');
    table.setHeading('Commands', 'Events');
    for (let i = 0; i <= Math.max(loaded.commands.length, loaded.events.length) - 1; i++)
        table.addRow(loaded.commands[i], loaded.events[i]);

    return table.render();
}

export async function getYouTubeURL(words: string | Array<string>): Promise<string> {
    let stringOfWords = Array.isArray(words) ? words.join(' ') : words;
    let filter = (await ytsr.getFilters(stringOfWords)).get('Type')!.get('Video')!;
    let lookingOnYtb = await ytsr(filter.url!, { limit: 1 });

    return (lookingOnYtb.items[0] as ytsr.Video).url;
}

export function formatDuration(sec: number) {
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
}

export function getRandomInt(max:number): number {
    return Math.floor(Math.random() * max);
}

// what is = 100% volume, note volume command assumes this is 100 (it uses a % sign)
export const VOLUME_BASE_UNIT = 100;
export const MAX_VOLUME = 200;
