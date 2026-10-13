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
        firstMonsterTemplate: 'monster1', // 开场引导使用的怪物预制体
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
        damageBonus: 10, // 在当前飞剑伤害上增加的数值
        knifeVolleySpacing: 24, // 同一轮飞剑的出手间距
        knifeVolleyCenterCurveSide: 0.7, // 中间一把飞剑的弯曲幅度
    },
    skill2: { // 击破 targetRoot/2：环绕飞剑
        orbitKnifeCount: 18, // 总数量
        orbitKnifeSpawnSpacing: 0.1, // 每把生成间隔（秒）
        orbitKnifeRadius: 200, // 环绕半径 180
        orbitKnifeCenterOffsetY: 50, // 环绕圆心相对角色的纵向偏移
        orbitKnifeAngularSpeed: 180, // 每秒旋转角度
        orbitKnifeDamage: 25, // 每次命中伤害
        orbitKnifeHitInterval: 0.5, // 同一目标重复受击间隔（秒）
        orbitKnifeHitWidth: 15, // 刀身碰撞半宽   0.3  0.4
    },
    skill3: { // 击破 targetRoot/3：破盾动画、雷击、警告、怪潮
        breakRadius: 300, // 3PD2 每次伤害以角色为圆心的半径
        breakDamage: 200, // 3PD2 每次命中每只怪物的伤害
        breakDuration: 2, // 3PD2 完整播放时长（秒）
        breakHitInterval: 0.5, // 3PD2 范围伤害的间隔（秒）
        leiInterval: 5, // 雷击释放间隔（秒）
        leiTargetCount: 5, // 每轮最多命中多少只不同怪物
        leiDamage: 150, // 每道雷击伤害
        warnHoldDuration: 0.8, // 警告保持完全可见的时长（秒）
        warnFadeDuration: 0.2, // 警告淡出时长（秒）；两项合计 1 秒
        warnShakeOffset: 16, // 红框抖动的最大偏移（像素）
        warnTextScaleX: 1.3, // 警告文字出现时的横向缩放
        warnShadeAlpha: 170, // 警告出现时全屏黑色遮罩的不透明度（0～255）
        monsterSpeed: 80, // 动画结束后的怪物移动速度
        monsterSpawnInterval: 0.2, // 动画结束后的刷怪间隔（秒）
    },
    skill4: { // 击破 targetRoot/4：赤焰飞剑
        skillTarget4MaxHp: 300, // 场景未配置血量标签时使用
        knife3Damage: 30, // 点击发射的 knife3 伤害
        successScaleDuration: 0.8, // success 界面从 0 缩放到 1 的时间（秒）
        successHoldDuration: 1, // 缩放完成后保持显示的时间（秒）
    },
    roleAdvance: { // 击破 2、3 后共用的 lei1、lei2 与角色进阶流程
        lei2Radius: 400, // lei2 每次伤害以角色为圆心的半径
        lei2Damage: 300, // lei2 每次对范围内每只怪物造成的伤害
        lei2DamageDelay: 1, // lei2 开始后前 1 秒不造成伤害
        lei1OffsetY: 200, // lei1 特效相对角色向上偏移（像素）
        skillStartDelay: 2.5, // lei1 开始后等待多久播放当前角色的 skill1（秒）
        lei2StartDelay: 1.5, // lei1 开始后等待多久启动 lei2
        lei2VisibleDelay: 1, // lei2 开始后等待真正显现的时间；此时播放 duJie 并震屏
        lei2ShakeDuration: 1.5, // lei2 显现时的震屏时长（秒）
        lei2ShakeOffset: 50, // lei2 震屏最大偏移（像素）
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
        attackOffsetX: 80, // 怪物停在角色左右两侧的水平距离
        tempLayerRadius: 120, // 进入角色周围此半径后，将怪物移到 TempLayer
        attackInterval: 1, // 到达攻击点后，每隔多少秒对角色造成一次伤害
        spawnInterval: 1.0, // 目标 1、6 均击破且目标 3 未击破时的刷怪间隔（秒）
        earlySpawnInterval: 2.0, // 目标 1 或 6 尚未击破时的刷怪间隔（秒）
        perWave: 3, // 每波计划生成的怪物数量
        spawnMinAbsX: 150, // 普通怪出生时 X 坐标须在 -150 左侧或 150 右侧
        spawnMaxY: 550, // 所有怪物出生时在 monsterRoot 下的 Y 坐标上限
        edgePadding: 20, // 怪物出生点距画面边缘的留白（像素）
        spawnSpacing: 80, // 同波怪物出生点之间的期望间距（像素）
        maxAlive: 30, // 场上同时存活的怪物数量上限
        contactDamage: 10, // 怪物每次攻击对角色造成的伤害
        rewardSkillId: 'monster_skill', // 怪物掉落物收集后记录的技能标识
    },
    boss: { // 击破 targetRoot/5 后出现的 monster4
        maxHp: 500, // Boss 血量
        speed: 100, // Boss 移动速度（像素/秒）
        spawnDistance: 700, // 出生点距角色的距离，默认从角色上方出现
        radius: 90, // Boss 与飞剑、角色接触判定半径
        contactDamage: 10, // Boss 每次攻击对角色造成的伤害
        contactInterval: 1, // Boss 到达攻击点后的伤害间隔（秒）
    },
};
