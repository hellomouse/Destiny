export async function configHandler() {
    let config = (await import(`../config.cjs?ts=${Date.now()}`)).default;

    if (!process.env.TOKEN)
        try {
            require('../config.cjs');
        } catch (e) {
            console.error('No config file found, create it or use environnement variables.');
            process.exit(1);
        }
    else {
        if (!process.env.PREFIX) process.env.PREFIX = '$';
        config = { 'token': process.env.TOKEN, 'prefix': process.env.PREFIX };
    }
    if (!process.env.ALLOWED)
        try {
            config.allowed = (await import(`../allowed.json?ts=${Date.now()}`)).allowed;
        } catch (e) {
            config.allowed = [];
        }
    else
        config.allowed = [process.env.ALLOWED];
    return config;
}
