const embeds = require('../embeds.js');
const utils = require('../utils');
const localData = require('../local-data.js');
const config = require('../../config.js');

/**
 * @description Manage playlists
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
module.exports.run = async (client, message, args) => {
    // TODO: validate playlist names

    let userId = message.author.id;
    let playlistName = args[0];
    let playlists = localData.getPlaylists(userId);
    let playlistsLength = Object.keys(playlists).length;
    let hasPlaylist = localData.hasPlaylist(userId, playlistName);
    let playlist = playlists[playlistName] || [];

    if (playlistName === 'list' && ['create', 'delete', 'add', 'remove'].includes(args[1]))
        return message.channel.send(embeds.errorEmbed().setDescription('Cannot use `list` as a playlist name. It is a subcommand'));

    switch (args[1] || args[0]) {
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
        let formattedPlaylists = Object.keys(playlists).join(', ');
        message.channel.send(embeds.defaultEmbed().setDescription(`Your playlists:\n${formattedPlaylists}`));
        break;
    }
    default:
        return message.channel.send(embeds.errorEmbed().setDescription(`Not a valid subcommand`));
    }
};

module.exports.names = ['playlist', 'playlists', 'pl'];
module.exports.help = {
    desc: 'Manage user playlists',
    syntax: ''
};
