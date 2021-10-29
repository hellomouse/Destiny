const Enmap = require('enmap');
const config = require('../config.js');

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
        if (!this.has('playlists', userId)) return {};

        return this.get('playlists', userId);
    }

    hasPlaylist(userId, playlistName) {
        return this.has('playlists', `${userId}.${playlistName}`);
    }
}


module.exports = new LocalData({
    name: 'local-data',
    fetchAll: true,
    autoEnsure: {
        playlists: {}
    }
});
