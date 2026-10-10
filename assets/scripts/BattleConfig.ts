/** 战斗数值集中在这里，按通用系统和各个技能分组。 */
export interface SkillTargetConfig {
    id: string;
    x: number;
    y: number;
    maxHp: number;
    rewardSkillId: string;
}

export const BATTLE_CONFIG = {
    guide: {
        firstMonsterTemplate: '1', // 开场引导使用 monsterRoot 下的模板名
        firstMonsterX: 0,
        firstMonsterY: -360,
        pointerOffsetX: 14,
        pointerOffsetY: 2,
        shadeAlpha: 150,
        spotlightRadius: 95,
        spotlightOffsetY: 38,
        spotlightAlpha: 170,
    },
    player: {
        maxHp: 100,
    },
    knife: {
        tapCooldown: 0.5,
        icon1BaseDamage: 10,
        icon1DamagePerLevel: 5,
        knifeRandomInitialAngle: true,
        knifeSpeed: 1250,
        knifeStartSpeedRatio: 0.55,
        knifeAcceleration: 1900,
        knifeLaunchDistance: 75,
        knifeLaunchTargetRatio: 0.3,
        knifeLaunchBendAngle: 12,
        knifeTurnSpeed: 700,
        knifeTurnMaxRate: 420,
        knifeTurnAngularAcceleration: 2300,
        knifeTurnMinDistance: 140,
        knifeTurnExitAngle: 7,
        knifeTurnExitAngularSpeed: 35,
        knifeChaseTurnRate: 300,
        knifeTerminalCaptureDistance: 300,
        knifeFlightStepDistance: 8,
        knifeFlightEdgePadding: 40,
        knifeTurnScreenReserve: 150,
        knifeLifetime: 3.5,
        knifeTrailLength: 400,
        knifeTrailFadeDuration: 0.2,
        knifeTrailWidth: 5,
        knifeHitRadius: 15,
    },
    skill1: { // 击破 targetRoot/1：三连击
        tripleShotCount: 3, // 每次点击发射的飞剑数量
        tripleShotDamage: 25, // 普通飞剑和 knife1 的伤害
        knifeVolleySpacing: 24, // 同一轮飞剑的出手间距
        knifeVolleyCenterCurveSide: 0.7, // 中间一把飞剑的弯曲幅度
    },
    skill2: { // 击破 targetRoot/2：环绕飞剑
        orbitKnifeCount: 18, // 总数量
        orbitKnifeSpawnSpacing: 0.1, // 每把生成间隔（秒）
        orbitKnifeRadius: 180, // 环绕半径
        orbitKnifeCenterOffsetY: 50, // 环绕圆心相对角色的纵向偏移
        orbitKnifeAngularSpeed: 180, // 每秒旋转角度
        orbitKnifeDamage: 25, // 每次命中伤害
        orbitKnifeHitInterval: 0.5, // 同一目标重复受击间隔（秒）
        orbitKnifeHitWidth: 12, // 刀身碰撞半宽
    },
    skill3: { // 击破 targetRoot/3：破盾动画、雷击、警告、怪潮
        breakRadius: 300, // 3PD2 开始播放时，以角色为圆心的伤害半径
        breakDamage: 200, // 范围内每只怪物受到一次伤害
        leiInterval: 5, // 雷击释放间隔（秒）
        leiTargetCount: 5, // 每轮最多命中多少只不同怪物
        leiDamage: 150, // 每道雷击伤害
        warnHoldDuration: 2, // 警告显示时长（秒）
        warnFadeDuration: 0.5, // 警告淡出时长（秒）
        monsterSpeed: 80, // 动画结束后的怪物移动速度
        monsterSpawnInterval: 0.2, // 动画结束后的刷怪间隔（秒）
    },
    skill4: { // 击破 targetRoot/4：赤焰飞剑
        skillTarget4MaxHp: 300, // 场景未配置血量标签时使用
        knife3Damage: 30, // 点击发射的 knife3 伤害
    },
    skill5: { // 击破 targetRoot/5：龙卷风
        fengSpeed: 320, // 龙卷风前进速度
        fengDuration: 3, // 持续时间（秒）
        fengInterval: 5, // 再次释放的间隔（秒）
        fengDamage: 200, // 碰到怪物的伤害
        fengHitRadius: 75, // 碰撞半径
    },
    skill6: { // 击破 targetRoot/6：万剑决
        radialKnifeCount: 18, // 每次齐射的飞剑数量
        radialKnifeInterval: 4, // 每轮释放间隔（秒）
        radialBurstCount: 2, // 每轮齐射次数
        radialBurstSpacing: 0.4, // 两次齐射的间隔（秒）
    },
    skillTarget: {
        upgradeEffectDelay: 1,
        skillTargetHitScale: 1.1,
        skillTargetHitPunchDuration: 0.07,
        skillTargetHitRecoverDuration: 0.14,
        // 后续逐个配置地图物品的血量、位置和奖励；不自动生成。
        extraTargets: [] as SkillTargetConfig[],
    },
    damageText: {
        offsetY: 50,
        rise: 80,
        duration: 0.7,
    },
    monsterDrop: {
        diao1Chance: 35,
        diao2Chance: 15,
        diao3Chance: 15,
        diao4Chance: 15,
        noDropChance: 20,
        collectDelay: 0,
        flyDuration: 0.1,
    },
    monster: {
        maxHp: 10, // 怪物初始血量
        speed: 55, // 怪物默认移动速度（像素/秒）
        radius: 8, // 怪物碰撞半径（像素）
        spawnInterval: 1.0, // 目标 1、6 均击破且目标 3 未击破时的刷怪间隔（秒）
        earlySpawnInterval: 2.0, // 目标 1 或 6 尚未击破时的刷怪间隔（秒）
        perWave: 3, // 每波计划生成的怪物数量
        edgePadding: 20, // 怪物出生点距画面边缘的留白（像素）
        spawnSpacing: 80, // 同波怪物出生点之间的期望间距（像素）
        maxAlive: 30, // 场上同时存活的怪物数量上限
        contactDamage: 10, // 怪物碰到角色时造成的伤害
        rewardSkillId: 'monster_skill', // 怪物掉落物收集后记录的技能标识
    },
};
