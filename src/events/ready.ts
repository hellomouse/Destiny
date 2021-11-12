import { Client } from 'discord.js';
import utils from '../utils';

export default (client: Client) => {
    // client.user.setActivity("gud music", {type: "LISTENING"});

    utils.log(`Logged in as ${client.user.tag} !`);
};
