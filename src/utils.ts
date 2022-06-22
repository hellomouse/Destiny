import AsciiTable from 'ascii-table';

import { defaultEmbed } from './embeds.js';
import config from '../config.cjs';
import { queueManager, ServerQueue } from './queue.js';
import ytsr from 'ytsr';
import { VoiceConnectionStatus } from '@discordjs/voice';

export class FlagHelpError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = 'FlagHelpError';
    }
}

export class InactivityHelper {
    static config = InactivityHelper.generateConfig();

    static generateConfig() {
        let generatedConfig = Object.assign({
            waitRejoinSeconds: 60,
            botIdleSeconds: 600
        }, config.inactivity); // Writes default values with ones from written configuration file

        // Convert to milliseconds for timers
        generatedConfig.waitRejoinSeconds *= 1000;
        generatedConfig.botIdleSeconds *= 1000;

        return generatedConfig;
    }

    private aloneTimer: NodeJS.Timeout;
    private inactivityTimer: NodeJS.Timeout;
    private serverQueue: ServerQueue;

    constructor(serverQueue: ServerQueue) {
        this.serverQueue = serverQueue;

        this.aloneTimer = setTimeout(() => { }, 0);
        this.inactivityTimer = setTimeout(() => { }, 0);
    }

    onAlone() {
        clearTimeout(this.aloneTimer);
        if (InactivityHelper.config.waitRejoinSeconds < 0) return;
        this.aloneTimer = setTimeout(() => {
            if (this.serverQueue.connection?.state.status !== VoiceConnectionStatus.Destroyed) {
                queueManager.remove(this.serverQueue.serverID);
                this.serverQueue.textChannel.send({ embeds: [defaultEmbed().setDescription(':wave: Leaving as no one is in VC')] });
            }
        }, InactivityHelper.config.waitRejoinSeconds);
    }

    onPersonJoin() {
        clearTimeout(this.aloneTimer);
    }

    /**
     * When the bot leaves the voice channel clear all timers
     */
    onLeave() {
        clearTimeout(this.aloneTimer);
        clearTimeout(this.inactivityTimer);
    }

    onNotPlaying() {
        clearTimeout(this.inactivityTimer);
        if (InactivityHelper.config.botIdleSeconds < 0) return;
        this.inactivityTimer = setTimeout(() => {
            if (this.serverQueue.connection?.state.status !== VoiceConnectionStatus.Destroyed) {
                queueManager.remove(this.serverQueue.serverID);
                this.serverQueue.textChannel.send({ embeds: [defaultEmbed().setDescription(':wave: Leaving due to inactivity')] });
            }
        }, InactivityHelper.config.botIdleSeconds);
    }

    onPlaying() {
        clearTimeout(this.inactivityTimer);
    }
}

/**
     * @description Sends logs to console and adds the date/time
     * @param {*} content
     */
export function log(content: any) {
    let dateObj = new Date();

    let date = dateObj.getDate().toString();
    let month = (dateObj.getMonth() + 1).toString();
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
export function showTable(loaded: { commands: Array<string>; events: Array<string> }) {
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

export function parseDuration(sec: string) {
    let seekTime = 0;
    // Try to match format: XXhXXm or AA:BB:CC
    const getN = (match: RegExpMatchArray, n: number) => match && match[n] ? +match[n].replace(/[^0-9]/g, '') : 0;
    const TIMESTAMP_REGEX_1 = /^(\d+:)?(\d+):(\d+)$/im;
    const TIMESTAMP_REGEX_2 = /^(\d+h)?(\d+m)?(\d+s)?$/im;

    let m = sec.match(TIMESTAMP_REGEX_1);
    if (m) seekTime = getN(m, 1) * 60 * 60 + getN(m, 2) * 60 + getN(m, 3);

    if (!m) {
        m = sec.match(TIMESTAMP_REGEX_2);
        if (m) seekTime = getN(m, 1) * 60 * 60 + getN(m, 2) * 60 + getN(m, 3);
    }
    if (!m)
        throw new Error('Invalid time format');
    return seekTime;
}

/**
 * Generates a random number between the given min and max.
 * @param min The minimum number.
 * @param max The maximum number.
 */
export function getRandomInt(min: number, max: number): number;
export function getRandomInt(max: number): number;
export function getRandomInt(min: number, max?: number) {
    if (!max) {
        max = min;
        min = 0;
    }
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// what is = 100% volume, note volume command assumes this is 100 (it uses a % sign)
export const VOLUME_BASE_UNIT = 100;
export const MAX_VOLUME = 200;
