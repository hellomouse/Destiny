const embeds = require('../embeds.js');
const { Song } = require('../song.js');
const localData = require('../local-data.js');
const config = require('../../config.js');
const queue = require('../queue.js');
const play = require('./play.js'); // This is a hack for now

/**
 * @description Manage playlists
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
module.exports.run = async (client, message, args) => {
    // TODO: validate playlist names

    if ([args[0]] === 'list' && ['create', 'delete', 'add', 'remove'].includes(args[1]))
        return message.channel.send(embeds.errorEmbed().setDescription('Cannot use `list` as a playlist name. It is a subcommand'));

    let userId = message.author.id;
    let playlistName = args[0] === 'list' ? args[1] : args[0];
    let playlists = localData.getPlaylists(userId);
    let playlistsLength = Object.keys(playlists).length;
    let hasPlaylist = localData.hasPlaylist(userId, playlistName);
    let playlist = playlists[playlistName] || [];
    let songs = await Song.getSongURLs(args.slice(2), message)[0];

    switch (args[0] === 'list' ? args[0] : args[1]) {
    case 'create': {
        if (playlistsLength === config.playlists.maximum)
            return message.channel.send(embeds.errorEmbed().setDescription(`You have reached the maximum amount of playlists you can create`));
        if (hasPlaylist)
            return message.channel.send(embeds.errorEmbed().setDescription(`Playlist with that name already exists`));

        localData.createPlaylist(userId, args[0]);
        message.channel.send(embeds.defaultEmbed().setDescription(`Successfully created playlist: ` + args[0]));
        break;
    }
    case 'delete': {
        if (!hasPlaylist) return message.channel.send(embeds.errorEmbed().setDescription(`No such playlist exists`));

        if (playlist.length === 0 || args[2] === '--confirm') {
            localData.deletePlaylist(userId, playlistName);
            message.channel.send(embeds.defaultEmbed().setDescription(`Successfully deleted playlist: ` + playlistName));
        }
        if (playlist.length > 0)
            message.channel.send(embeds.errorEmbed().setDescription(`Playlist has ${playlist.length} items. Please add \`--confirm\` to delete it`));
        break;
    }
    case 'list': {
        if (playlistsLength === 0) return message.channel.send(embeds.defaultEmbed().setDescription('No playlists'));

        if (!playlistName) {
            let formattedPlaylists = Object.keys(playlists).join(', ');
            message.channel.send(embeds.defaultEmbed().setDescription(`Your playlists:\n${formattedPlaylists}`));
        } else if (playlist.length === 0)
            message.channel.send(embeds.defaultEmbed().setDescription('Playlist is empty'));
        else
            message.channel.send(embeds.defaultEmbed().setDescription(`Playlist contents: ${playlist.join('\n')}`));

        break;
    }
    case 'add': {
        if (!hasPlaylist) return message.channel.send(embeds.errorEmbed().setDescription(`No such playlist exists`));
        if (!songs.length) return message.channel.send(embeds.errorEmbed().setDescription(`Not a valid song(s)`));
        if (playlist.length === config.playlists.maximumItemsPerPlaylist)
            return message.channel.send(embeds.errorEmbed().setDescription(`Playlist has reached maximum number of items`));

        songs.forEach(x => localData.addSong(userId, playlistName, x));
        message.channel.send(embeds.defaultEmbed().setDescription(`Added ${songs.length} song(s) to playlist`));
        break;
    }
    case 'remove': {
        if (!hasPlaylist) return message.channel.send(embeds.errorEmbed().setDescription(`No such playlist exists`));
        if (!songs.length) return message.channel.send(embeds.errorEmbed().setDescription(`Not a valid song(s)`));

        let occurences = [...new Set(songs)]
            .map(x => localData.hasSong(userId, playlistName, x) ? 1 : 0)
            .reduce((prev, current) => prev + current);
        if (occurences === 0) return message.channel.send(embeds.defaultEmbed().setDescription('Song(s) not found in playlist'));

        songs.forEach(x => localData.removeSong(userId, playlistName, x));
        message.channel.send(embeds.defaultEmbed().setDescription(`Removed ${occurences} song(s) from playlist`));

        break;
    }
    case 'play': {
        if (!hasPlaylist) return message.channel.send(embeds.errorEmbed().setDescription(`No such playlist exists`));

        let voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.channel.send(embeds.errorEmbed().setDescription('You need to be in a voice channel to use this subcommand'));
        let serverQueue = queue.queueManager.getOrCreate(message, voiceChannel);
        // Clear queue before playing local playlist
        if (['-o', '--overwrite'].includes(args[2]))
            serverQueue.clear();

        await play.run(client, message, playlist);
        break;
    }
    default:
        return message.channel.send(embeds.errorEmbed().setDescription('Not a valid subcommand'));
    }
};

module.exports.names = ['playlist', 'playlists', 'pl'];
module.exports.help = {
    desc: 'Manage user playlists',
    syntax: ''
};
