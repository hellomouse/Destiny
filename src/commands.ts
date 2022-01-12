import utils from './utils';
import { Message } from 'discord.js';

const enum COMMAMD_REQUIREMENTS {
    // Enums for command requirements
    // Multiple requirements can be ORed together
    REQUIRE_QUEUE_NON_EMPTY = 1,
    REQUIRE_IS_PLAYING = 2,
    REQUIRE_USER_IN_VC = 4
}

export function hasEnoughArgs(args: Array<string>, message: Message) {
    if (!args[0] && message.attachments.size === 0)
        throw new utils.FlagHelpError();
}

export default COMMAMD_REQUIREMENTS;
