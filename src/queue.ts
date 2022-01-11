import config from '../config.js';
import utils from './utils.js';
import embeds from './embeds.js';

import type { Message, VoiceBasedChannel } from 'discord.js';
import { AudioPlayer, AudioPlayerStatus, AudioResource, createAudioPlayer, createAudioResource, DiscordGatewayAdapterCreator, getVoiceConnection, joinVoiceChannel, NoSubscriberBehavior, VoiceConnection, VoiceConnectionReadyState } from '@discordjs/voice';
import { FileSong, Song, YouTubeSong, SongReference, SongManager } from './song';

// const LOOP_MODES = ['none', 'off', 'song', 'queue'] as const;
// type LOOP_MODES = typeof LOOP_MODES[number];
enum LOOP_MODES {
    'none' = 0,
    'off' = 0,
    'song' = 1,
    'queue' = 2
}

/**
 * A queue for a specified server
 * Tracks current song, dispatcher, etc...
 * @author Bowserinator
 */
export class ServerQueue {

    public serverID: string;
    public voiceChannel: VoiceBasedChannel;
    public textChannel: Message['channel'];
    public connection?: VoiceConnection;
    private audioPlayer!: AudioPlayer;
    public songs: Array<SongReference>;
    public shuffleWaiting: Array<string>;
    public volume: number;
    public _paused: boolean;
    public loop: number;
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
    audioResource?: AudioResource;

    /**
     * Construct a server queue
     * @param {Message} message Message for the play command
     * @param {VoiceChannel} voiceChannel Voice channel to play in
     */
    constructor(message: Message, voiceChannel: VoiceBasedChannel) {
        this.serverID = message.guild!.id!;
        this.textChannel = message.channel;
        this.voiceChannel = voiceChannel;

        this.connection = undefined;

        this.songs = [];
        this.shuffleWaiting = []; // Songs to be played in shuffle mode
        this.volume = ServerQueue.consts.DEFAULT_VOLUME;
        this._paused = false;
        this.loop = LOOP_MODES['none']; // in LOOP_MODES
        this.skipped = false;

        this.shuffle = false;
        this.shuffled = false;
        this.index = 0;
        this._isPlaying = false;

        this.lastNowPlayingMessage;

        this.ignoreNextSongEnd = false; // Don't run anything after dispatcher ends for next end, for seeking
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

    setLoopMode(loop: LOOP_MODES) {
        this.loop = loop;
    }

    currentSong() {
        return this.songs[this.index].song;
    }

    isPlaying() {
        return this._isPlaying;
    }

    async sendNowPlayingEmbed(song: Song) {
        if (this.lastNowPlayingMessage)
            this.lastNowPlayingMessage.delete()
                .catch(err => console.log(err));

        this.lastNowPlayingMessage = await song.requestedChannel.send({ embeds: [embeds.songEmbed(song, 'Now Playing')] });
    }

    /**
     * Seek current song to seekTime (validated)
     * @param {number} seekTime Seek time in seconds
     * @param {number} errorCounter Errors occured
     * @return {number} Validated seek time
     */
    async seekTo(seekTime: number, errorCounter = 0) {
        const song = await this.currentSong()!;

        seekTime = Math.max(0, seekTime);
        seekTime = Math.min(song.duration, seekTime);

        this.ignoreNextSongEnd = true;
        let connection = getVoiceConnection(this.serverID);
        let audioPlayer = this.audioPlayer;
        let audio = this.audioResource = createAudioResource(await song.getStream(seekTime), { inlineVolume: true });
        audioPlayer.play(audio);

        audioPlayer.on(AudioPlayerStatus.Idle, this.onSongFinish.bind(this));
        audioPlayer.on('error', async error => {
            console.log('seek dispatcher errored: ' + error);
            this.ignoreNextSongEnd = true;
            await this.seekTo(seekTime, errorCounter + 1);
        });
        audio.volume!.setVolumeLogarithmic(this.volume / utils.VOLUME_BASE_UNIT);

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
            utils.log(`Finished playing the music : ${(await this.songs[this.index].song).title}`);
        else
            utils.log(`Finished playing all musics, no more musics in the queue`);

        this.skipped = false;
        if (this.songs.length === 0) return;

        if (this.loop !== LOOP_MODES['song'] || this.skipped)
            if (this.shuffle) {
                if (this.shuffleWaiting.length === 0 && this.loop === LOOP_MODES['queue'])
                    this.shuffleWaiting = this.songs.map(x => x.id);

                let uuidIndex = utils.getRandomInt(this.shuffleWaiting.length);
                let uuidFind = this.shuffleWaiting[uuidIndex];

                // Check there are more songs to shuffle
                if (uuidFind) {
                    this.index = this.songs.findIndex(x => x.id === uuidFind);
                    this.shuffled = true;
                }

                this.shuffleWaiting.splice(uuidIndex, 1);
            } else
                this.index++;

        if (this.loop === LOOP_MODES['queue'])
            this.index %= this.size();

        await this.play();
    }

    /**
     * Play the current song in the queue
     * @param {number} errorCounter Number of retries when error occurs
     * @return {*} The dispatcher
     */
    async play(errorCounter = 0) {
        this.audioPlayer = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause
            }
        });

        this._isPlaying = true;

        this.shuffled = false;

        const song = await this.currentSong()!;
        this.textChannel = song.requestedChannel; // Update text channel
        this._isPlaying = true;

        if (errorCounter < 1)
            await this.sendNowPlayingEmbed(song);

        utils.log(`Started playing the music : ${song.title} ${this.index}`);

        let player = createAudioPlayer();
        let audio = this.audioResource = createAudioResource(await song.getStream(), { inlineVolume: true });

        this.connection!.subscribe(player);
        player.play(audio);

        player.on(AudioPlayerStatus.Idle, this.onSongFinish.bind(this));
        player.on('error', async error => {
            console.log('dispatcher errored: ' + error);
            this.ignoreNextSongEnd = true;
            await this.play(errorCounter + 1);
        });
        audio.volume!.setVolumeLogarithmic(this.volume / utils.VOLUME_BASE_UNIT);
        return player;
    }

    /**
     * Stop the current song from playing
     * and advance the queue
     */
    skip() {
        this.skipped = true;
        let connection = getVoiceConnection(this.serverID);
        let audioPlayer = (connection?.state as VoiceConnectionReadyState)?.subscription?.player;
        audioPlayer?.stop();
        this.audioResource = undefined; // Remove reference to audio resource, to prevent memory leak
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
            this.setLoopMode(LOOP_MODES['off']);
            this.shuffleOff();
            this.setVolume(ServerQueue.consts.DEFAULT_VOLUME);
        }
    }

    /**
     * Initially, ServerQueue is not paused
     * This function will start playing the queue if that is the case
     * but will not resume if user has paused the player
     */
    async playIfNewInstance() {
        if (!this.isPlaying()) {
            await this.play();
            this.resume();
        }
    }

    /** Pause currently playing song */
    pause() {
        if (this._paused) return;
        this._paused = true;
        let connection = getVoiceConnection(this.serverID);
        let audioPlayer = (connection?.state as VoiceConnectionReadyState)?.subscription!.player;
        audioPlayer.pause();
        utils.inactivity.onNotPlaying(this);
    }

    shuffleOn() {
        let uuidFind = typeof this.currentSong() !== 'undefined' ? this.currentSong()!.id : '';
        this.shuffleWaiting = this.songs.filter(x => x.id !== uuidFind).map(x => x.id);
        this.shuffle = true;
    }

    shuffleOff() {
        this.shuffleWaiting = [];
        this.shuffle = false;
    }

    setVolume(volume: number) {
        this.volume = volume;
        if (this.isPlaying())
            this.audioResource?.volume?.setVolumeLogarithmic(volume / utils.VOLUME_BASE_UNIT);
    }

    /** Resume currently playing song */
    resume() {
        if (!this._paused) return;
        this._paused = false;

        let connection = getVoiceConnection(this.serverID);
        let audioPlayer = (connection?.state as VoiceConnectionReadyState)?.subscription!.player;
        audioPlayer.unpause();
    }

    /**
     * Adds SongReferences' to the queue
     * @param {Song} song Song to add
     */
    add(songReferences: Array<SongReference>) {
        for (let songReference of songReferences)
            this.songs.push(songReference);
    }

    /**
     * Connects to the queue's linked voice channel
     */
    join() {
        this.connection = joinVoiceChannel({
            channelId: this.voiceChannel.id,
            guildId: this.voiceChannel.guild.id,
            adapterCreator: this.voiceChannel.guild.voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator,
            selfDeaf: true
        });
        utils.log(`Joined the channel : ${this.voiceChannel.name}`);
    }

    leave() {
        this.connection?.destroy();
        this.clear(true);
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
    getOrCreate(message: Message, voiceChannel: VoiceBasedChannel): ServerQueue {
        const serverID = message.guild?.id;
        if (typeof serverID !== 'undefined') {
            let queue = this._queues[serverID];

            if (typeof queue !== 'undefined')
                return queue;
        }
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
