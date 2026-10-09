/** resources 目录内的路径，不带文件扩展名。 */
export const PREFAB_PATHS = {
    hurt: 'prefabs/hurt',
    hit: 'prefabs/hit',
    sxsj: 'prefabs/sxsj',
    knife1: 'prefabs/knife1',
    knife2: 'prefabs/knife2',
    knife3: 'prefabs/knife3',
    lei: 'prefabs/lei',
    feng: 'prefabs/feng',
    warn: 'prefabs/warn',
} as const;

export type PrefabKey = keyof typeof PREFAB_PATHS;

export const BATTLE_PREFABS: readonly PrefabKey[] = ['hurt', 'hit', 'sxsj', 'knife1', 'knife2', 'knife3', 'lei', 'feng', 'warn'];
