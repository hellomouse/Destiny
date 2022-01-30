import type { User, Message } from 'discord.js';
import { isURL, getYouTubeURL } from '../utils.js';
import { SongManager } from './manager.js';
import { YouTubeSong } from './youtube.js';

export async function getSongReferences(args: Array<string>, message: Message,
    unpackPlaylists = false): Promise<[Array<SongReference>, boolean]> {
    let songs: Array<SongReference> = [];
    let playlistSongs: Array<SongReference> = [];

    if (message.attachments.size > 0)
        args = [...args, ...message.attachments.map(x => x.url)];

    for (let arg of args) {
        let isPlaylist = YouTubeSong.getYoutubePlaylistID(arg);
        if (isPlaylist && unpackPlaylists) {
            let unpackedPlaylist = await YouTubeSong.unpackPlaylist(arg, message);
            playlistSongs = [...playlistSongs, ...unpackedPlaylist];
        } else if (isURL(arg))
            try {
                let songReference = await SongManager.getCreateSong(arg, message.author, message.channel);
                songs.push(songReference);
            } catch (e) {
                // do nothing i guess?
            }
        else
            try {// can't find any youtube/other links, so perform youtube search and add first song
                let url = await getYouTubeURL(arg);
                let songReference = await SongManager.getCreateSong(url, message.author, message.channel);
                songs.push(songReference);
            } catch (e) {
                // do nothing, can't add song because search query returned nothing.
                // maybe be could have song references that are like Promise<Rejected>
                // so we can pass that up????
            }
    }

    return [[...songs, ...playlistSongs], songs.length === 0];
}

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
