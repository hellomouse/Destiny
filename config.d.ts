export interface Config {
    playlists: {
        maximum: number,
        maximumItemsPerPlaylist: number
    };
    token: string;
    prefix: string;
    inactivity: {
        waitRejoinSeconds: number,
        botIdleSeconds: number
    };
    songManager: {
        softNumLimit: number,
        hardNumLimit: number,
        cacheCleanTimeoutDuration: number,
        metadataRefreshInterval: {
            YouTubeSong?: number
        }
    };
    inactivity?: {
        waitRejoinSeconds?: number,
        botIdleSeconds?: number
    };
    allowed: Array<string>;
    onlyOneVoiceChannel?: boolean;
}
declare const config: Config = {};
export default config;
