/** 相对于所属 Bundle 根目录的路径，不带文件扩展名；默认属于 resources。 */
export const PREFAB_PATHS = {
    hurt: 'prefabs/hurt',
    hit: 'prefabs/hit',
    hit2: 'prefabs/hit2',
    hit3: 'prefabs/hit3',
    hit4: 'prefabs/hit4',
    sxsj: 'prefabs/sxsj',
    waitSkill: 'prefabs/waitSkill',
    yindao: 'prefabs/yindao',
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
    monster1: 'monster1',
    monster2: 'monster2',
    monster3: 'monster3',
    monster4: 'monster4',
    monster5: 'monster5',
    monster6: 'monster6',
    monster7: 'monster7',
} as const;

export type PrefabKey = keyof typeof PREFAB_PATHS;

/** 独立 Bundle 中的预制体；未列出的名称仍从 resources 加载。 */
export const PREFAB_BUNDLES: Partial<Record<PrefabKey, string>> = {
    monster1: 'monster',
    monster2: 'monster',
    monster3: 'monster',
    monster4: 'monster',
    monster5: 'monster',
    monster6: 'monster',
    monster7: 'monster',
};

export const BATTLE_PREFABS: readonly PrefabKey[] = ['hurt', 'hit', 'hit2', 'hit3', 'hit4', 'waitSkill', 'success', 'baohu', 'knife1', 'knife2', 'knife3', 'lei', 'lei1', 'lei2', 'feng', 'warn', 'diao1', 'diao2', 'diao3', 'diao4', '3PD1', '3PD2', '5PD1', 'monster1', 'monster2', 'monster3', 'monster4', 'monster5', 'monster6', 'monster7'];
