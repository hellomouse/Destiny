import embeds from '../embeds.js';
import Song from '../song.js';
import localData from '../local-data.js';
import config from '../../config.js';
import { queueManager } from '../queue.js';
import { run as playRun } from './play.js'; // This is a hack for now
import { Client, Message } from 'discord.js';

/**
 * @description Manage playlists
 * @param {Discord.Client} client the client thats runs the commands
 * @param {Discord.Message} message the command's message
 * @param {Array<string>} args Unused
 * @return {Promise<Message>} sent message
 */
export const run = async (client: Client, message: Message, args: Array<string>) => {
    // TODO: validate playlist names

    if (args[0] === 'list' && ['create', 'delete', 'add', 'remove'].includes(args[1]))
        return message.channel.send({ embeds: [embeds.errorEmbed().setDescription('Cannot use `list` as a playlist name. It is a subcommand')] });

    let userId = message.author.id;
    let playlistName = args[0] === 'list' ? args[1] : args[0];
    let playlists = localData.getPlaylists(userId);
    let playlistsLength = Object.keys(playlists).length;
    let hasPlaylist = localData.hasPlaylist(userId, playlistName);
    let playlist = playlists[playlistName] || [];
    let [songs] = await Song.getSongReferences(args.slice(2), message);

    switch (args[0] === 'list' ? args[0] : args[1]) {
            case 'create': {
                if (playlistsLength === config.playlists.maximum)
                    return message.channel.send({ embeds: [embeds.errorEmbed().setDescription(`You have reached the maximum amount of playlists you can create`)] });
                if (hasPlaylist)
                    return message.channel.send({ embeds: [embeds.errorEmbed().setDescription(`Playlist with that name already exists`)] });

                localData.createPlaylist(userId, args[0]);
                message.channel.send({ embeds: [embeds.defaultEmbed().setDescription(`Successfully created playlist: ` + args[0])] });
                break;
            }
            case 'delete': {
                if (!hasPlaylist) return message.channel.send({ embeds: [embeds.errorEmbed().setDescription(`No such playlist exists`)] });

                if (playlist.length === 0 || args[2] === '--confirm') {
                    localData.deletePlaylist(userId, playlistName);
                    message.channel.send({ embeds: [embeds.defaultEmbed().setDescription(`Successfully deleted playlist: ` + playlistName)] });
                } else if (playlist.length > 0)
                    message.channel.send({ embeds: [embeds.errorEmbed().setDescription(`Playlist has ${playlist.length} items. Please add \`--confirm\` to delete it`)] });
                break;
            }
            case 'list': {
                if (playlistsLength === 0) return message.channel.send({ embeds: [embeds.defaultEmbed().setDescription('No playlists')] });

                if (!playlistName) {
                    let formattedPlaylists = Object.keys(playlists).join(', ');
                    message.channel.send({ embeds: [embeds.defaultEmbed().setDescription(`Your playlists:\n${formattedPlaylists}`)] });
                } else if (playlist.length === 0)
                    message.channel.send({ embeds: [embeds.defaultEmbed().setDescription('Playlist is empty')] });
                else
                    message.channel.send({ embeds: [embeds.defaultEmbed().setDescription(`Playlist contents: ${playlist.join('\n')}`)] });

                break;
            }
            case 'add': {
                if (!hasPlaylist) return message.channel.send({ embeds: [embeds.errorEmbed().setDescription(`No such playlist exists`)] });
                if (!songs.length) return message.channel.send({ embeds: [embeds.errorEmbed().setDescription(`Not a valid song(s)`)] });
                if (playlist.length === config.playlists.maximumItemsPerPlaylist)
                    return message.channel.send({ embeds: [embeds.errorEmbed().setDescription(`Playlist has reached maximum number of items`)] });

                songs.forEach(async x => localData.addSong(userId, playlistName, x.song.url));
                message.channel.send({ embeds: [embeds.defaultEmbed().setDescription(`Added ${songs.length} song(s) to playlist`)] });
                break;
            }
            case 'remove': {
                if (!hasPlaylist) return message.channel.send({ embeds: [embeds.errorEmbed().setDescription(`No such playlist exists`)] });
                if (!songs.length) return message.channel.send({ embeds: [embeds.errorEmbed().setDescription(`Not a valid song(s)`)] });

                let occurences = [...new Set(songs)]
                    .map(x => localData.hasSong(userId, playlistName, x.song.url) ? 1 : 0)
                    .reduce((prev, current) => prev + current);
                if (occurences === 0) return message.channel.send({ embeds: [embeds.defaultEmbed().setDescription('Song(s) not found in playlist')] });

                songs.forEach(async x => localData.removeSong(userId, playlistName, x.song.url));
                message.channel.send({ embeds: [embeds.defaultEmbed().setDescription(`Removed ${occurences} song(s) from playlist`)] });

                break;
            }
            case 'play': {
                if (!hasPlaylist) return message.channel.send({ embeds: [embeds.errorEmbed().setDescription(`No such playlist exists`)] });
                if (playlist.length === 0) return message.channel.send({ embeds: [embeds.defaultEmbed().setDescription(`Playlist is empty`)] });

                let voiceChannel = message.member!.voice.channel;
                if (!voiceChannel) return message.channel.send({ embeds: [embeds.errorEmbed().setDescription('You need to be in a voice channel to use this subcommand')] });
                let serverQueue = queueManager.getOrCreate(message, voiceChannel);
                // Clear queue before playing local playlist
                if (['-o', '--overwrite'].includes(args[2]))
                    serverQueue.clear();

                await playRun(client, message, [playlist.join(' | ')]);
                break;
            }
            default:
                return message.channel.send({ embeds: [embeds.errorEmbed().setDescription('Not a valid subcommand')] });
    }
};

export const names = ['playlist', 'playlists', 'pl'];
export const help = {
    desc: 'Manage user playlists',
    syntax: ''
};
