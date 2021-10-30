const config = require('../config.js');
const utils = require('./utils.js');
const embeds = require('./embeds.js');
const uuid = require('uuid');

const LOOP_MODES = 'none,off,song,queue'.split(',');

/**
 * A queue for a specified server
 * Tracks current song, dispatcher, etc...
 * @author Bowserinator
 */
class ServerQueue {
    /**
     * Construct a server queue
     * @param {Message} message Message for the play command
     * @param {VoiceChannel} voiceChannel Voice channel to play in
     */
    constructor(message, voiceChannel) {
        this.serverID = message.guild.id;
        this.textChannel = message.channel;
        this.voiceChannel = voiceChannel;

        this.connection = null;

        this.songs = [];
        this.shuffleWaiting = []; // Songs to be played in shuffle mode
        this.volume = 50;
        this._paused = false;
        this.loop = 'none'; // in LOOP_MODES
        this.skipped = false;

        this.shuffle = false;
        this.index = 0;
        this._isPlaying = false;

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

    index() {
        return this.index;
    }

    setLoopMode(loop) {
        this.loop = loop;
    }

    currentSong() {
        return this.songs[this.index];
    }

    isPlaying() {
        return this._isPlaying;
    }

    /**
     * Play the current song in the queue
     * @param {number} errorCounter Number of retries when error occurs
     * @return {*} The dispatcher
     */
    play(errorCounter = 0) {
        if (this.isEmpty() || this.index < 0 || this.index >= this.size() ||
            ['none', 'off'].includes(this.loop) && !this.shuffleWaiting.length) {
            this._isPlaying = false;
            this.textChannel.send(embeds.defaultEmbed()
                .setDescription('Finished playing!'));
            utils.inactivity.onNotPlaying(this);
            return;
        }
        if (this.loop === 'queue')
            this.index %= this.size();

        this._isPlaying = true;
        utils.inactivity.onPlaying();

        const song = this.songs[this.index];
        this.textChannel = song.requestedChannel; // Update text channel
        this._isPlaying = true;

        if (this.loop !== 'song' && errorCounter < 1)
            song.requestedChannel.send(embeds.songEmbed(song, 'Now Playing'));

        utils.log(`Started playing the music : ${song.title} ${this.index}`);

        // todo: add short link
        let dispatcher = this.connection.play(song.get());

        dispatcher.on('finish', () => {
            if (this.songs[this.index + 1])
                utils.log(`Finished playing the music : ${this.songs[this.index].title}`);
            else
                utils.log(`Finished playing all musics, no more musics in the queue`);

            this.skipped = false;
            if (this.songs.length === 0) return;

            if (this.loop !== 'song' || this.skipped === true)
                if (this.shuffle) {
                    if (this.shuffleWaiting.length === 0 && ['none', 'off'].includes(this.loop)) this.shuffleWaiting = this.songs.map(x => x.uuid);
                    let uuidIndex = utils.getRandomInt(this.shuffleWaiting.length - 1);
                    let uuidFind = this.shuffleWaiting[uuidIndex];
                    this.index = this.songs.findIndex(x => x.uuid === uuidFind);
                    this.shuffleWaiting.splice(uuidIndex, 1);
                } else
                    this.index++;

            this.play();
        });

        dispatcher.on('error', error => {
            console.log('dispatcher errored: ' + error);
            this.skipped = false;
            this.play(errorCounter + 1);
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
        if (this.connection.dispatcher)
            this.connection.dispatcher.end();
    }

    /**
     * Stop current song from playing and
     * clear the queue
     */
    clear() {
        this.skip();
        this.skipped = false;
        this._isPlaying = false;
        this.songs = [];
        this.shuffleWaiting = [];
        this.index = 0;
    }

    /** Pause currently playing song */
    pause() {
        if (this._paused) return;
        this._paused = true;
        this.connection.dispatcher.pause();
        utils.inactivity.onNotPlaying(this);
    }

    shuffleOn() {
        this.shuffleWaiting = this.songs.map(x => x.uuid);
        this.shuffle = true;
    }

    shuffleOff() {
        this.shuffleWaiting = [];
        this.shuffle = false;
    }

    /** Resume currently playing song */
    resume() {
        if (!this._paused) return;
        this._paused = false;

        // Hacky fix for a bug that was never fixed
        // This resume-pause-resume must be followed if running
        // node > v14.15.5
        this.connection.dispatcher.resume();
        this.connection.dispatcher.pause();
        this.connection.dispatcher.resume();
    }

    /**
     * Add a song to the queue
     * @arg {Song} song
    */
    add(song) {
        song.uuid = uuid.v4();
        this.songs.push(song);

        if (this.shuffle)
            this.shuffleWaiting.push(song.uuid);
    }
}

/**
 * Queue manager
 * @author Bowserinator
 */
class QueueManager {
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
    getOrCreate(message, voiceChannel) {
        const serverID = message.guild.id;
        if (this._queues[serverID])
            return this._queues[serverID];
        return this.add(new ServerQueue(message, voiceChannel));
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
    add(queue) {
        if (this._queues[queue.serverID])
            return this._queues[queue.serverID];
        if (config.onlyOneVoiceChannel) {
            Object.values(this._queues).filter(x => x).forEach(q => q.clear());
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
    remove(serverID) {
        if (this._queues[serverID])
            this._queues[serverID].clear();
        this._queues[serverID] = undefined;
    }

    /**
     * Get a queue by server ID
     * @param {string} serverID guild ID
     * @return {ServerQueue}
     */
    get(serverID) {
        return this._queues[serverID];
    }
}

const queueManager = new QueueManager();

module.exports = { ServerQueue, queueManager, LOOP_MODES };
