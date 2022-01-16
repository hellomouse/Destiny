import { Client } from 'discord.js';
import { log } from '../utils.js';

export default (client: Client) => {
    // client.user.setActivity("gud music", {type: "LISTENING"});

    log(`Logged in as ${client.user!.tag} !`);
};
