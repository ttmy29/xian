/** 战斗数值集中在这里，后续替换美术或添加技能物品时只改配置。 */
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
        firstMonsterX: 0,           // 开场怪物的横坐标，可调整
        firstMonsterY: -360,        // 开场怪物的纵坐标，可调整
        pointerOffsetX: 14,        // yindao 相对怪物锚点的横向偏移
        pointerOffsetY: 2,         // yindao 相对怪物锚点的纵向偏移
        shadeAlpha: 150,          // 黑色引导遮罩透明度（0～255）
        spotlightRadius: 95,      // 怪物周围不受阴影覆盖的圆形半径
        spotlightOffsetY: 38,     // 怪物锚点到圆心的纵向偏移
        spotlightAlpha: 170,     // 圆形亮区的白色底色透明度
    },
    tapCooldown: 0.5,       // 两次点击发射之间的最短间隔（秒）
    tripleShotCount: 3,     // 解锁后的每次发射数量
    tripleShotDamage: 25,   // 击破 1 后普通飞剑和 knife1 的伤害
    knife3Damage: 30,      // 击破 4 后点击发射的 knife3 伤害
    leiInterval: 5,        // 击破 3 后雷击释放间隔（秒）
    leiTargetCount: 3,     // 每轮命中不同怪物的最多数量
    leiDamage: 150,        // 每道雷的伤害
    fengSpeed: 320,        // 龙卷风直线前进速度（设计像素/秒）
    fengDuration: 3,       // 龙卷风持续时间（秒）
    fengInterval: 5,       // 获得龙卷风后再次释放的间隔（秒）
    fengDamage: 200,       // 龙卷风经过每只怪物时的伤害
    fengHitRadius: 75,     // 龙卷风与怪物的碰撞半径（设计像素）
    warnHoldDuration: 2,  // 击破 5 后警告文字保持显示的时间（秒）
    warnFadeDuration: 0.5, // 警告文字淡出的时间（秒）
    skillTarget4MaxHp: 300, // 场景文件中的 targetRoot/4 没有血量标签时使用
    orbitKnifeCount: 18,   // 击破 2 后环绕飞剑的数量
    orbitKnifeSpawnSpacing: 0.1, // 每把 knife2 生成的间隔（秒）
    orbitKnifeRadius: 180, // knife2 围绕角色的半径（设计像素）
    orbitKnifeCenterOffsetY: 50, // 环绕圆心相对角色向上偏移（设计像素）
    orbitKnifeAngularSpeed: 180, // knife2 每秒旋转角度
    orbitKnifeDamage: 25,  // knife2 每次命中的伤害
    orbitKnifeHitInterval: 0.5, // 同一目标连续受 knife2 伤害的最短间隔（秒）
    orbitKnifeHitWidth: 12, // knife2 刀身碰撞的半宽（设计像素）
    radialKnifeCount: 18,   // 万剑决一次向四周发出的飞剑数量
    radialKnifeInterval: 4, // 获得万剑决后，每隔多少秒释放一轮飞剑
    radialBurstCount: 2,   // 每轮连续释放多少次 18 支飞剑
    radialBurstSpacing: 0.4, // 同一轮两次齐射的间隔（秒）
    upgradeEffectDelay: 1, // 击破技能物品后，角色身上显示升级特效的延迟
    knifeVolleySpacing: 24, // 同一轮多把飞剑的出手横向间距
    knifeVolleyCenterCurveSide: 0.7, // 三把飞剑中间一把的出手弯曲幅度
    knifeRandomInitialAngle: true,  // 每把飞剑随机取 0～360°；false 则沿用 knife 模板角度
    knifeSpeed: 1250,       // 追击阶段最高速度（设计像素/秒）
    knifeStartSpeedRatio: 0.55, // 飞剑刚出手时占最高速度的比例
    knifeAcceleration: 1900,   // 飞剑加速度（设计像素/秒²）
    knifeLaunchDistance: 75,       // 沿初始朝向飞出的最大距离（设计像素）
    knifeLaunchTargetRatio: 0.3,   // 近目标时缩短第一段，避免先飞过怪物
    knifeLaunchBendAngle: 12,      // 第一段朝转弯侧缓慢弯曲的角度
    knifeTurnSpeed: 700,           // 出手与转弯阶段的速度；改这里最能影响前半段快慢
    knifeTurnMaxRate: 420,         // 第二段每秒最大转角；随速度同步提高以保留弧线半径
    knifeTurnAngularAcceleration: 2300, // 每秒转向速度的变化上限，保证三段连接平滑
    knifeTurnMinDistance: 140,     // 转弯幅度较大时，第二段至少保留的路径长度
    knifeTurnExitAngle: 7,        // 与目标方向误差小于此角度才允许进入追击
    knifeTurnExitAngularSpeed: 35, // 转向基本停稳后才进入追击（度/秒）
    knifeChaseTurnRate: 300,      // 追击阶段最多每秒调整的朝向角度
    knifeTerminalCaptureDistance: 300, // 接近目标后接入命中弧线的距离；避免高速飞剑绕怪转圈
    knifeFlightStepDistance: 8,   // 飞行、命中和白线采样的最大间距（设计像素）
    knifeFlightEdgePadding: 40,   // 飞剑起飞时距画面边缘的留白
    knifeTurnScreenReserve: 150,  // 第一段为后续转弯预留的画面空间
    knifeLifetime: 3.5,       // 飞剑最长存在时间（秒），给反向起飞后的回转留出时间
    knifeTrailLength: 400,   // 白色轨迹沿飞行路径保留的最大长度（设计像素）
    knifeTrailFadeDuration: 0.2, // 飞剑消失后轨迹淡出的时间（秒）
    knifeTrailWidth: 5,       // 白色主线最宽处的宽度（设计像素）
    knifeHitRadius: 15,     // 飞剑靠近目标多近时算命中
    damageTextOffsetY: 50, // 伤害文字出生点高于怪物锚点的距离
    damageTextRise: 80,    // 伤害文字向上飘动的距离
    damageTextDuration: 0.7, // 飘动及淡出的时间（秒）
    skillTargetHitScale: 1.1, // 地图物品受击时的短暂放大倍率
    skillTargetHitPunchDuration: 0.07, // 地图物品放大的时间（秒）
    skillTargetHitRecoverDuration: 0.14, // 地图物品恢复原样的时间（秒）
    icon1BaseDamage: 10,    // icon1 Lv.1 每把飞剑的伤害
    icon1DamagePerLevel: 5, // icon1 每升一级增加的伤害
    playerMaxHp: 100,
    monster: {
        maxHp: 10,//10
        speed: 65,
        speedAfterTarget5: 100, // 击破 targetRoot/5 后的怪物速度
        radius: 8,
        spawnInterval: 1.0,  // 每波生成间隔（秒）；增大此值会减少生成速度
        spawnIntervalAfterTarget5: 0.5, // 击破 targetRoot/5 后的刷怪间隔（秒）
        perWave: 3,          // 每波生成数量
        edgePadding: 20,     // 怪物外观距画面边缘的留白；调小会更贴边
        spawnSpacing: 80,    // 新怪物与其他怪物出生点的期望间距
        maxAlive: 30,        // 场上同时存在的怪物上限
        contactDamage: 10,
        rewardSkillId: 'monster_skill',
    },
    // 后续逐个配置地图物品的血量、位置和奖励；75 血只是示例，不自动生成。
    skillTargets: [] as SkillTargetConfig[],
};
