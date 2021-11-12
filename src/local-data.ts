import Enmap from 'enmap';

class LocalData extends Enmap {
    constructor(...args) {
        super(...args);
    }

    createPlaylist(userId, playlistName) {
        if (!playlistName) return undefined;

        if (!this.has('playlists', userId))
            this.set('playlists', {}, userId);

        this.set('playlists', [], `${userId}.${playlistName}`);
        return this.get('playlists', `${userId}.${playlistName}`);
    }

    deletePlaylist(userId, playlistName) {
        this.delete('playlists', `${userId}.${playlistName}`);
    }

    getPlaylists(userId) {
        if (!this.get('playlists', userId)) return {};

        return this.get('playlists', userId);
    }

    hasPlaylist(userId, playlistName) {
        return this.has('playlists', `${userId}.${playlistName}`);
    }

    addSong(userId, playlistName, songURL) {
        return this.push('playlists', songURL, `${userId}.${playlistName}`);
    }

    removeSong(userId, playlistName, songURL) {
        return this.remove('playlists', songURL, `${userId}.${playlistName}`);
    }

    hasSong(userId, playlistName, songURL) {
        return this.get('playlists', `${userId}.${playlistName}`).filter(x => x === songURL).length;
    }
}


export default new LocalData({
    name: 'local-data',
    fetchAll: true,
    autoEnsure: {
        playlists: {}
    }
});
