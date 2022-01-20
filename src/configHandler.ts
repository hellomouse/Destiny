export async function configHandler() {
    let config = (await import(`../config.cjs?ts=${Date.now()}`)).default;
    config = Object.assign(
        {
            token: process.env.TOKEN,
            prefix: process.env.PREFIX || '!!',
            inactivity: {
                waitRejoinSeconds: 60,
                botIdleSeconds: 600
            },
            songManager: {
                softNumLimit: 1000000,
                hardNumLimit: 10000000,
                cacheCleanTimeoutDuration: 300,
                metadataRefreshInterval: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    YouTubeSong: 3600
                }
            },
            allowed: process.env.ALLOWED ? [process.env.ALLOWED] : [] // TODO: rework permissions
        },
        config
    );

    if (!config.token)
        throw new Error('Bot token not defined in config or environment');

    return config;
}
