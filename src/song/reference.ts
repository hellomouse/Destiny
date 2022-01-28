import type { User, Message } from 'discord.js';
import { SongManager } from './manager.js';

export class SongReference {
    public readonly id: string;
    public readonly requestedBy: User;
    public requestedChannel: Message['channel'];


    // when we ask for a song reference, increment the link song.references variable by one
    // songreference is like a proxy
    // have delete method here, when we remove it from a SongQueue we call delete. song.references--
    // this will allow cleanup of unused songs from the global songs map
    constructor(id: string, requestedBy: User, requestedChannel: Message['channel']) {
        this.id = id;
        this.requestedBy = requestedBy;
        this.requestedChannel = requestedChannel;
    }

    get song() {
        return SongManager.getSong(this.id);
    }
}
