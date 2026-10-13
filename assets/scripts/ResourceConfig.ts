/** resources 目录内的路径，不带文件扩展名。 */
export const PREFAB_PATHS = {
    hurt: 'prefabs/hurt',
    hit: 'prefabs/hit',
    hit2: 'prefabs/hit2',
    hit3: 'prefabs/hit3',
    hit4: 'prefabs/hit4',
    sxsj: 'prefabs/sxsj',
    waitSkill: 'prefabs/waitSkill',
    success: 'prefabs/success',
    baohu: 'prefabs/baohu',
    knife1: 'prefabs/knife1',
    knife2: 'prefabs/knife2',
    knife3: 'prefabs/knife3',
    lei: 'prefabs/lei',
    lei1: 'prefabs/lei1',
    lei2: 'prefabs/lei2',
    feng: 'prefabs/feng',
    warn: 'prefabs/warn',
    diao1: 'prefabs/diao1',
    diao2: 'prefabs/diao2',
    diao3: 'prefabs/diao3',
    diao4: 'prefabs/diao4',
    '3PD1': 'prefabs/3PD1',
    '3PD2': 'prefabs/3PD2',
    '5PD1': 'prefabs/5PD1',
    monster1: 'prefabs/monster/monster1',
    monster2: 'prefabs/monster/monster2',
    monster3: 'prefabs/monster/monster3',
    monster4: 'prefabs/monster/monster4',
} as const;

export type PrefabKey = keyof typeof PREFAB_PATHS;

export const BATTLE_PREFABS: readonly PrefabKey[] = ['hurt', 'hit', 'hit2', 'hit3', 'hit4', 'sxsj', 'waitSkill', 'success', 'baohu', 'knife1', 'knife2', 'knife3', 'lei', 'lei1', 'lei2', 'feng', 'warn', 'diao1', 'diao2', 'diao3', 'diao4', '3PD1', '3PD2', '5PD1', 'monster1', 'monster2', 'monster3', 'monster4'];
