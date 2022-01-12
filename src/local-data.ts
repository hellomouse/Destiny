import Enmap from 'enmap';

class LocalData extends Enmap {
    constructor(...args: Array<any>) {
        super(...args);
    }

    createPlaylist(userId: string, playlistName: string) {
        if (!playlistName) return undefined;

        if (!this.has('playlists', userId))
            this.set('playlists', {}, userId);

        this.set('playlists', [], `${userId}.${playlistName}`);
        return this.get('playlists', `${userId}.${playlistName}`);
    }

    deletePlaylist(userId: string, playlistName: string) {
        this.delete('playlists', `${userId}.${playlistName}`);
    }

    getPlaylists(userId: string) {
        if (!this.get('playlists', userId)) return {};

        return this.get('playlists', userId);
    }

    hasPlaylist(userId: string, playlistName: string) {
        return this.has('playlists', `${userId}.${playlistName}`);
    }

    addSong(userId: string, playlistName: string, songURL: string) {
        return this.push('playlists', songURL, `${userId}.${playlistName}`);
    }

    removeSong(userId: string, playlistName: string, songURL: string) {
        return this.remove('playlists', songURL, `${userId}.${playlistName}`);
    }

    hasSong(userId: string, playlistName: string, songURL: string) {
        return this.get('playlists', `${userId}.${playlistName}`).filter((x: string) => x === songURL).length;
    }
}


export default new LocalData({
    name: 'local-data',
    fetchAll: true,
    autoEnsure: {
        playlists: {}
    }
});
