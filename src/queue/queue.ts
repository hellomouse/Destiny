import { InactivityHelper, log, VOLUME_BASE_UNIT } from '../utils.js';
import { songEmbed } from '../embeds.js';

import type { Message, VoiceBasedChannel } from 'discord.js';
import type { AudioPlayer, AudioResource, DiscordGatewayAdapterCreator, VoiceConnection } from '@discordjs/voice';
import { AudioPlayerStatus, createAudioPlayer, createAudioResource, joinVoiceChannel, NoSubscriberBehavior, VoiceConnectionStatus } from '@discordjs/voice';
import type { SongReference } from '../song.js';
import MessageCollection, { SongQueueMessage, SingletonMessage, NormalMessage } from '../messages.js';
import { LOOP_MODES } from './loop.js';
import type { TextLikeChannels } from '../types';

/**
 * A queue for a specified server
 * Tracks current song, dispatcher, etc...
 * @author Bowserinator
 */
export class ServerQueue {

    public serverID: string;
    public voiceChannel: VoiceBasedChannel;
    public textChannel: TextLikeChannels;
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
    inactivityHelper: InactivityHelper;
    private isSeeking: any;

    /**
     * Construct a server queue
     * @param {Message} message Message for the play command
     * @param {VoiceChannel} voiceChannel Voice channel to play in
     */
    constructor(message: Message, voiceChannel: VoiceBasedChannel) {
        this.serverID = message.guild!.id!;
        this.textChannel = message.channel;
        this.voiceChannel = voiceChannel;

        this.inactivityHelper = new InactivityHelper(this);

        this.connection = undefined;
        this.audioPlayer = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause
            }
        });

        this.audioPlayer.on(AudioPlayerStatus.Idle, this.onSongFinish.bind(this));
        this.audioPlayer.on(AudioPlayerStatus.Playing, () => this.inactivityHelper.onPlaying());
        this.audioPlayer.on(AudioPlayerStatus.Buffering, () => this.inactivityHelper.onPlaying());
        this.audioPlayer.on(AudioPlayerStatus.Paused, () => this.inactivityHelper.onNotPlaying());
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
        this.isSeeking = false;
    }

    /** Check if the song queue is empty */
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

    /** Get current index */
    getIndex() {
        return this.index;
    }

    /**
     * Get the song at the specified index
     * @param {number} index Index of the song to get
     */
    getSongAtIndex(index: number) {
        return this.songs[index];
    }

    /**
     * Sets the loop mode
     * @param loop Loop mode to set
     */
    setLoopMode(loop: LOOP_MODES) {
        this.loop = loop;
    }

    /**
     * Returns the current loop mode
     * @returns
     */
    getLoopMode() {
        return this.loop;
    }

    /**
     * Get the {@link SongReference} at the current index
     */
    currentSong() {
        return this.songs[this.index];
    }

    /**
     * Check if the audio player is playing
     */
    isPlaying() {
        return this.audioPlayer.state.status === AudioPlayerStatus.Playing;
    }

    async sendNowPlayingEmbed(songReference: SongReference) {
        await this.messages.get('nowPlaying')?.send(songReference.requestedChannel, { embeds: [songEmbed(songReference, 'Now Playing')] });
    }

    /**
     * Finds the next song in the queue that can be played | TODO: skip invalid songs
     * Respects loop mode
     */
    findNextValidSong() {
        // Should we return the amount of songs that can't be played?
        let nextIndex; // Next valid index

        // A good thing to note is even if the song queue may be populated
        // and the loop mode is queue, all songs could be invalid
        // A message should be provided as such and playback stopped

        // This should return the index if the next invalid song
        // which is an attribute that isn't implemented yet so
        // TODO: update
        let nextSongIndex = this.index + 1;
        let nextSongExists = typeof this.getSongAtIndex(nextSongIndex) !== 'undefined';
        if (this.loop === LOOP_MODES.QUEUE)
            if (!nextSongExists)
                nextIndex = this.getSongAtIndex(0) ? 0 : undefined;
            else
                nextIndex = nextSongIndex;
        else if (this.loop === LOOP_MODES.SONG && typeof this.currentSong() !== 'undefined')
            nextIndex = this.index;
        else if (this.loop === LOOP_MODES.OFF)
            nextIndex = nextSongExists ? nextSongIndex : undefined;
        // this.index %= this.size();

        // On looping song, check if the song still exists
        // what about bugs...
        // remove song?
        // insert song?
        // shuffling songs?
        // Index will change and we'll lose track of this one, need to update this.index accordingly


        return nextIndex;
    }

    /**
     * Executes on song finish
     */
    async onSongFinish() {
        // this.isIdle() is used here because you could skip a song during playback or after it's ended
        // this.isSeeking is used here because the player is in the idle state
        if (this.ignoreNextSongEnd && !this.isIdle() || this.isSeeking || this.skipped) {
            this.ignoreNextSongEnd = false;
            this.isSeeking = false;
            this.skipped = false;
            return;
        }

        let nextIndex = this.findNextValidSong();

        if (typeof nextIndex !== 'undefined') {
            log(`Finished playing the music : ${(this.currentSong().song).title}`);
            this.index = nextIndex;
            await this.play();
        } else {
            log(`Finished playing all musics, no more musics in the queue`);
            await this.messages.get('finishedPlaying')?.send(this.textChannel, { embeds: [songEmbed(this.currentSong(), 'Finished Playing')] });
            await this.messages.get('nowPlaying')?.delete();
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
        if (!this.isIdle() && seekTime > 0) {
            this.isSeeking = true;
            this.audioPlayer.stop(true);
        }

        let player = this.audioPlayer;

        const currentSongReference = this.currentSong();
        const song = currentSongReference.song;

        this.textChannel = currentSongReference.requestedChannel; // Update text channel

        if (errorCounter < 1 && !(seekTime > 0))
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
            throw new RangeError('Position is out of bounds');

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

    /**
     * Remove a song from the queue at the specified index
     * @param index The index of the song to remove
     */
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

    /**
     * Set the volume of the player to the specified value
     * @param volume The volume to set
     */
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
     * Adds {@link SongReference}' to the queue
     * @param {Array<SongReference>} song Song to add
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
        if (typeof this.connection === 'undefined' ||
            typeof this.connection !== 'undefined' && this.connection.state.status === VoiceConnectionStatus.Destroyed) {
            this.connection = joinVoiceChannel({
                channelId: this.voiceChannel.id,
                guildId: this.voiceChannel.guild.id,
                adapterCreator: this.voiceChannel.guild.voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator,
                selfDeaf: true
            });
            this.connection.on(VoiceConnectionStatus.Destroyed, () => this.inactivityHelper.onLeave());
            log(`Joined the channel : ${this.voiceChannel.name}`);
        }
    }

    /**
     * Disconnects from the queue's linked voice channel and clears the queue
     */
    leave() {
        this.connection?.destroy();
        (this.messages.get('queue') as SongQueueMessage).disableButtons();
        this.clear(true);
    }
}
