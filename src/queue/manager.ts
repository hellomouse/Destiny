import { VoiceConnectionStatus } from '@discordjs/voice';
import type { Message, VoiceBasedChannel } from 'discord.js';
import config from '../../config.cjs';
import { ServerQueue } from './queue.js';

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
            if (serverQueue && serverQueue.connection?.state.status !== VoiceConnectionStatus.Destroyed)
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

export const queueManager = new QueueManager();
