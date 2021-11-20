import config from '../config.js';
import utils from './utils.js';
import embeds from './embeds.js';

import type { Channel, Message, NewsChannel, StreamDispatcher, TextChannel, VoiceChannel, DMChannel, VoiceConnection } from 'discord.js';
import type { FileSong, Song, YouTubeSong } from './song';

const LOOP_MODES = ['none', 'off', 'song', 'queue'] as const;
type LOOP_MODES = typeof LOOP_MODES[number];

/**
 * A queue for a specified server
 * Tracks current song, dispatcher, etc...
 * @author Bowserinator
 */
export class ServerQueue {

    public serverID: string | undefined;
    public textChannel: TextChannel | DMChannel | NewsChannel;
    public voiceChannel: VoiceChannel;
    public connection?: VoiceConnection;
    public songs: Array<YouTubeSong | FileSong>;
    public shuffleWaiting: Array<string>;
    public volume: number;
    public _paused: boolean;
    public loop: 'song' | 'none' | 'off' | 'queue';
    public skipped: boolean;
    public shuffle: boolean;
    public shuffled: boolean;
    public index: number;
    public _isPlaying: boolean;
    public lastNowPlayingMessage?: Message;
    public ignoreNextSongEnd: boolean;

    static consts = {
        DEFAULT_VOLUME: 70
    };

    /**
     * Construct a server queue
     * @param {Message} message Message for the play command
     * @param {VoiceChannel} voiceChannel Voice channel to play in
     */
    constructor(message: Message, voiceChannel: VoiceChannel) {
        this.serverID = message.guild?.id;
        this.textChannel = message.channel;
        this.voiceChannel = voiceChannel;

        this.connection = undefined;

        this.songs = [];
        this.shuffleWaiting = []; // Songs to be played in shuffle mode
        this.volume = ServerQueue.consts.DEFAULT_VOLUME;
        this._paused = false;
        this.loop = 'none'; // in LOOP_MODES
        this.skipped = false;

        this.shuffle = false;
        this.shuffled = false;
        this.index = 0;
        this._isPlaying = false;

        this.lastNowPlayingMessage;

        this.ignoreNextSongEnd = false; // Don't run anything after dispatcher ends for next end, for seeking

        utils.inactivity.onNotPlaying(this);
    }

    isEmpty() {
        return !this.songs.length;
    }

    isPaused() {
        return this._paused;
    }

    size() {
        return this.songs.length;
    }

    getIndex() {
        return this.index;
    }

    setLoopMode(loop: 'song' | 'none' | 'off' | 'queue') {
        this.loop = loop;
    }

    currentSong() {
        return this.songs[this.index];
    }

    isPlaying() {
        return this._isPlaying;
    }

    async sendNowPlayingEmbed(song: Song) {
        if (this.lastNowPlayingMessage)
            this.lastNowPlayingMessage.delete()
                .catch(err => console.log(err));

        this.lastNowPlayingMessage = await song.requestedChannel.send(embeds.songEmbed(song, 'Now Playing'));
    }

    /**
     * Seek current song to seekTime (validated)
     * @param {number} seekTime Seek time in seconds
     * @param {number} errorCounter Errors occured
     * @return {number} Validated seek time
     */
    async seekTo(seekTime: number, errorCounter = 0) {
        const song = this.currentSong();

        seekTime = Math.max(0, seekTime);
        seekTime = Math.min(song.duration, seekTime);

        this.ignoreNextSongEnd = true;
        this.connection?.dispatcher.end();
        let dispatcher = this.connection?.play(await song.getStream(seekTime))!;

        dispatcher.on('finish', this.onSongFinish.bind(this));
        dispatcher.on('error', async (error: string) => {
            console.log('seek dispatcher errored: ' + error);
            this.ignoreNextSongEnd = true;
            await this.seekTo(seekTime, errorCounter + 1);
        });
        dispatcher.setVolumeLogarithmic(this.volume / utils.VOLUME_BASE_UNIT);

        return seekTime;
    }

    /**
     * Executes on song finish
     */
    async onSongFinish() {
        if (this.ignoreNextSongEnd) {
            this.ignoreNextSongEnd = false;
            return;
        }

        if (this.songs[this.index + 1])
            utils.log(`Finished playing the music : ${this.songs[this.index].title}`);
        else
            utils.log(`Finished playing all musics, no more musics in the queue`);

        this.skipped = false;
        if (this.songs.length === 0) return;

        if (this.loop !== 'song' || this.skipped)
            if (this.shuffle) {
                if (this.shuffleWaiting.length === 0 && this.loop === 'queue')
                    this.shuffleWaiting = this.songs.map(x => x.uuid);

                let uuidIndex = utils.getRandomInt(this.shuffleWaiting.length);
                let uuidFind = this.shuffleWaiting[uuidIndex];

                // Check there are more songs to shuffle
                if (uuidFind) {
                    this.index = this.songs.findIndex(x => x.uuid === uuidFind);
                    this.shuffled = true;
                }

                this.shuffleWaiting.splice(uuidIndex, 1);
            } else
                this.index++;

        if (this.loop === 'queue')
            this.index %= this.size();

        await this.play();
    }

    /**
     * Play the current song in the queue
     * @param {number} errorCounter Number of retries when error occurs
     * @return {*} The dispatcher
     */
    async play(errorCounter = 0) {
        if (this.isEmpty() || this.index < 0 || this.index >= this.size() ||
            this.loop !== 'queue' && ['none', 'off'].includes(this.loop) && !this.shuffleWaiting.length && this.shuffle && !this.shuffled) {
            this._isPlaying = false;
            this.textChannel.send(embeds.defaultEmbed()
                .setDescription('Finished playing!'));
            utils.inactivity.onNotPlaying(this);
            return;
        }

        this._isPlaying = true;
        utils.inactivity.onPlaying();

        this.shuffled = false;

        const song = this.currentSong();
        this.textChannel = song.requestedChannel; // Update text channel
        this._isPlaying = true;

        if (errorCounter < 1)
            await this.sendNowPlayingEmbed(song);

        utils.log(`Started playing the music : ${song.title} ${this.index}`);

        let dispatcher = this.connection?.play(await song.getStream())!;

        dispatcher.on('finish', this.onSongFinish.bind(this));
        dispatcher.on('error', async (error: string) => {
            console.log('dispatcher errored: ' + error);
            this.ignoreNextSongEnd = true;
            await this.play(errorCounter + 1);
        });
        dispatcher.setVolumeLogarithmic(this.volume / utils.VOLUME_BASE_UNIT);

        return dispatcher;
    }

    /**
     * Stop the current song from playing
     * and advance the queue
     */
    skip() {
        this.skipped = true;
        if (this.connection?.dispatcher)
            this.connection.dispatcher.end();
    }

    /**
     * Stop current song from playing and
     * clear the queue
     * @param {boolean} restoreDefaults Restore ServerQueue defaults
     */
    clear(restoreDefaults = false) {
        this.skip();
        this.skipped = false;
        this._isPlaying = false;
        this.songs = [];
        this.shuffleWaiting = [];
        this.index = 0;

        if (restoreDefaults) {
            this.setLoopMode('off');
            this.shuffleOff();
            this.setVolume(ServerQueue.consts.DEFAULT_VOLUME);
        }
    }

    /** Pause currently playing song */
    pause() {
        if (this._paused) return;
        this._paused = true;
        this.connection?.dispatcher.pause();
        utils.inactivity.onNotPlaying(this);
    }

    shuffleOn() {
        let uuidFind = this.currentSong() ? this.currentSong().uuid : '';
        this.shuffleWaiting = this.songs.filter(x => x.uuid !== uuidFind).map(x => x.uuid);
        this.shuffle = true;
    }

    shuffleOff() {
        this.shuffleWaiting = [];
        this.shuffle = false;
    }

    setVolume(volume: number) {
        this.volume = volume;
    }

    /** Resume currently playing song */
    resume() {
        if (!this._paused) return;
        this._paused = false;

        // Hacky fix for a bug that was never fixed
        // This resume-pause-resume must be followed if running
        // node > v14.15.5
        this.connection?.dispatcher.resume();
        this.connection?.dispatcher.pause();
        this.connection?.dispatcher.resume();
    }

    /**
     * Add a song to the queue
     * @param {Song} song Song to add
     */
    add(song: YouTubeSong | FileSong) {
        this.songs.push(song);

        if (this.shuffle && this.songs.length > 1)
            this.shuffleWaiting.push(song.uuid);
    }
}

/**
 * Queue manager
 * @author Bowserinator
 */
export class QueueManager {
    private _queues: Record<string, ServerQueue | undefined>;

    constructor() {
        this._queues = {};
    }

    /**
     * Get server queue instance for server. If one does not
     * exist it will be created.
     *
     * @param {Message} message message for command
     * @param {VoiceChannel} voiceChannel voice channel
     * @return {ServerQueue} Server queue instance for server
     */
    getOrCreate(message: Message, voiceChannel: VoiceChannel): ServerQueue {
        const serverID = message.guild?.id;
        if (typeof serverID !== 'undefined')
            if (typeof this._queues[serverID] !== 'undefined')
                return this._queues[serverID]!;

        return this.add(new ServerQueue(message, voiceChannel))!;
    }

    /**
     * Add a new server to the list of queues. If only one voice
     * channel is enabled in config adding a new queue of a different
     * server will clear all other queues. If there is already a queue
     * for the server THAT INSTANCE will be returned (not the one you
     * passed in!)
     *
     * Thus it's recommended you do queue = queueManager.add(queue);
     *
     * @param {ServerQueue} queue Queue to add
     * @return {ServerQueue} Queue instance
     */
    add(queue: ServerQueue) {
        if (queue.serverID === undefined) return;

        if (this._queues[queue.serverID])
            return this._queues[queue.serverID];
        if (config.onlyOneVoiceChannel) {
            Object.values(this._queues).filter(x => x).forEach(q => q?.clear());
            this._queues = {};
        }
        this._queues[queue.serverID] = queue;
        return queue;
    }

    /**
     * Remove a queue by guild ID. Clears queue
     * if it exists.
     * @param {string} serverID guild ID
     */
    remove(serverID: string) {
        if (this._queues[serverID]) {
            let serverQueue = this._queues[serverID];
            if (serverQueue) serverQueue.clear();
        }
        this._queues[serverID] = undefined;
    }

    /**
     * Get a queue by server ID
     * @param {string} serverID guild ID
     * @return {ServerQueue}
     */
    get(serverID: string) {
        return this._queues[serverID];
    }
}

const queueManager = new QueueManager();

export { queueManager, LOOP_MODES };