import config from '../config.cjs';
import { inactivity, log, VOLUME_BASE_UNIT } from './utils.js';
import { songEmbed } from './embeds.js';

import type { Message, VoiceBasedChannel } from 'discord.js';
import { AudioPlayer, AudioPlayerStatus, AudioResource, createAudioPlayer, createAudioResource, joinVoiceChannel, NoSubscriberBehavior, VoiceConnection } from '@discordjs/voice';
import { SongReference } from './song.js';
import MessageCollection, { SongQueueMessage, SingletonMessage, NormalMessage } from './messages.js';

// const LOOP_MODES = ['none', 'off', 'song', 'queue'] as const;
// type LOOP_MODES = typeof LOOP_MODES[number];
enum LOOP_MODES {
    'NONE' = 0,
    'OFF' = 0,
    'SONG' = 1,
    'QUEUE' = 2
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
    private audioPlayer: AudioPlayer;
    public songs: Array<SongReference>;
    public volume: number;
    public loop: number;
    public skipped: boolean;
    public index: number;
    public lastNowPlayingMessage?: Message;
    public ignoreNextSongEnd: boolean;

    static consts = {
        DEFAULT_VOLUME: 70
    };
    audioResource?: AudioResource;
    messages: MessageCollection;

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
        this.audioPlayer = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause
            }
        });

        this.audioPlayer.on(AudioPlayerStatus.Idle, this.onSongFinish.bind(this));
        this.audioPlayer.on('error', async error => {
            console.log('dispatcher errored: ' + error);
            this.ignoreNextSongEnd = true;
            await this.play();
        });

        this.songs = [];
        this.volume = ServerQueue.consts.DEFAULT_VOLUME;
        this.loop = LOOP_MODES['NONE']; // in LOOP_MODES
        this.skipped = false;

        this.index = 0;

        this.messages = new MessageCollection();
        this.messages.set('nowPlaying', new SingletonMessage());
        this.messages.set('finishedPlaying', new NormalMessage());
        this.messages.set('queue', new SongQueueMessage());

        this.ignoreNextSongEnd = false; // Don't run anything after dispatcher ends for next end, for seeking
    }

    isEmpty() {
        return !this.songs.length;
    }

    /** Check if the audio player is paused */
    isPaused() {
        return this.audioPlayer.state.status === AudioPlayerStatus.Paused ||
            this.audioPlayer.state.status === AudioPlayerStatus.AutoPaused;
    }

    /** Check if the audio player is idle */
    isIdle() {
        return this.audioPlayer.state.status === AudioPlayerStatus.Idle;
    }

    /**
     * Get the queues size
     * @returns {number} The size of the queue
     */
    size() {
        return this.songs.length;
    }

    getIndex() {
        return this.index;
    }

    getSongAtIndex(index: number) {
        return this.songs[index];
    }

    setLoopMode(loop: LOOP_MODES) {
        this.loop = loop;
    }

    getLoopMode() {
        return this.loop;
    }

    currentSong() {
        return this.songs[this.index];
    }

    isPlaying() {
        return this.audioPlayer.state.status === AudioPlayerStatus.Playing;
    }

    async sendNowPlayingEmbed(songReference: SongReference) {
        await this.messages.get('nowPlaying')?.send(songReference.requestedChannel, { embeds: [songEmbed(songReference, 'Now Playing')] });
    }

    /**
     * Executes on song finish
     */
    async onSongFinish() {
        if (this.ignoreNextSongEnd) {
            this.ignoreNextSongEnd = false;
            return;
        }

        if (this.songs.length === 0) return;

        // Increment index if we're not looping the current song
        if (this.loop !== LOOP_MODES['SONG'])
            this.index++;

        this.skipped = false;

        if (this.loop === LOOP_MODES['QUEUE'])
            this.index %= this.size();

        const previousIndex = this.index - 1 < 0 ? 0 : this.index - 1;
        if (this.songs[this.index]) {
            log(`Finished playing the music : ${(this.songs[previousIndex].song).title}`);
            await this.play();
        } else {
            log(`Finished playing all musics, no more musics in the queue`);
            await this.messages.get('finishedPlaying')?.send(this.textChannel, { embeds: [songEmbed(this.songs[previousIndex], 'Finished Playing')] });
        }
    }

    /**
     * Play the current song in the queue
     * @param {number} errorCounter Number of retries when error occurs
     * @return {*} The dispatcher
     */
    async play(seekTime = 0, errorCounter = 0) {
        // When we seek we want to end the currently playing song,
        // but not increment the index
        if (!this.isIdle() && seekTime > 0)
            this.ignoreNextSongEnd = true;
        this.audioPlayer.stop(true);

        let player = this.audioPlayer;

        const currentSongReference = this.currentSong();
        const song = currentSongReference.song;

        this.textChannel = currentSongReference.requestedChannel; // Update text channel

        if (errorCounter < 1)
            await this.sendNowPlayingEmbed(currentSongReference);

        log(`Started playing the music : ${song.title} ${this.index}`);

        let audio = this.audioResource = createAudioResource(await song.getStream(seekTime), { inlineVolume: true });

        this.connection!.subscribe(player);
        player.play(audio);

        audio.volume!.setVolumeLogarithmic(this.volume / VOLUME_BASE_UNIT);
        return player;
    }

    /**
     * Stop the current song from playing
     * and advance the queue
     */
    skip() {
        this.skipped = true;
        this.audioPlayer.stop();
        this.audioResource = undefined; // Remove reference to audio resource, to prevent memory leak
    }

    /**
     * Stop the current song from playing
     * and jump to a specific position in the queue
     */
    jump(position: number) {
        if (position > this.songs.length)
            throw new Error('Position is out of bounds');

        this.index = position - 1; // Convert to 0-based index
        this.skipped = true;
        this.ignoreNextSongEnd = true;
        this.audioPlayer.stop();
        this.audioResource = undefined; // Remove reference to audio resource, to prevent memory leak
        this.play();
    }

    /**
     * Stop current song from playing and
     * clear the queue
     * @param {boolean} restoreDefaults Restore ServerQueue defaults
     */
    clear(restoreDefaults = false) {
        this.skip();
        this.skipped = false;

        for (let songReference of this.songs)
            songReference.song.references--;

        this.songs = [];
        this.index = 0;

        if (restoreDefaults) {
            this.setLoopMode(LOOP_MODES['OFF']);
            this.shuffleOff();
            this.setVolume(ServerQueue.consts.DEFAULT_VOLUME);
        }
    }

    removeSong(index: number) {
        let songReference = this.songs.splice(index, 1)[0];
        songReference!.song.references--;
        return songReference;
    }

    /**
     * Only play songs if user hasn't explictly paused
     */
    async playIfIdle() {
        if (this.isIdle())
            await this.play();
    }

    /** Pause currently playing song */
    pause() {
        if (!this.isPlaying()) return;
        this.audioPlayer.pause();
    }

    shuffleOn() {

    }

    shuffleOff() {

    }

    setVolume(volume: number) {
        this.volume = volume;
        if (this.isPlaying())
            this.audioResource?.volume?.setVolumeLogarithmic(volume / VOLUME_BASE_UNIT);
    }

    /** Resume currently playing song, or resume the queue */
    resume() {
        if (this.isIdle()) {
            // If the queue is not empty, and we are not playing, play the queue from the beginning
            if (this.songs.length) {
                this.index = 0;
                this.play();
            }
            return;
        }

        this.audioPlayer.unpause();
    }

    /**
     * Adds SongReferences' to the queue
     * @param {Song} song Song to add
     */
    add(songReferences: Array<SongReference>) {
        for (let songReference of songReferences) {
            this.songs.push(songReference);
            songReference.song.references++;
        }
    }

    /**
     * Connects to the queue's linked voice channel
     */
    join() {
        this.connection = joinVoiceChannel({
            channelId: this.voiceChannel.id,
            guildId: this.voiceChannel.guild.id,
            adapterCreator: this.voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: true
        });
        log(`Joined the channel : ${this.voiceChannel.name}`);
    }

    leave() {
        inactivity.onLeave();
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
            if (serverQueue)
                serverQueue.leave();
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
