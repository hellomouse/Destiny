import type { Client } from '../types';
import { log } from '../utils.js';

export default (client: Client) => {
    // client.user.setActivity("gud music", {type: "LISTENING"});

    log(`Logged in as ${client.user!.tag} !`);
};
