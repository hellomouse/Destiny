import utils from '../utils';

export default client => {
    // client.user.setActivity("gud music", {type: "LISTENING"});

    utils.log(`Logged in as ${client.user.tag} !`);
};
