# gameNode 战斗与开场引导

场景初始显示 `Canvas/Node`，隐藏 `Canvas/gameNode`。`Node` 内的 icon1 合成后，原有 3 秒倒计时结束，隐藏 `Node` 并打开 `gameNode`。飞剑伤害取格子中最高等级的 icon1：Lv.1 为 10，之后每级加 5。开始按钮目前不参与流程。

## 场景节点

- `gameNode/monsterRoot/1、2、3` 是 Spine 怪物模板，正的 X 缩放表示朝左。进入战斗时会隐藏原节点，复制 `1` 作为开场怪物；后续由 `MonsterSpawner.ts` 从三个模板中选择，在画面边缘成波生成。复制体向右移动时镜像，向左移动时保持原朝向。
- `gameNode/knifeRoot/knife` 是飞剑模板，包含图片与原有特效。运行时隐藏原节点，每次点击复制完整模板。默认每把克隆飞剑随机取 `0°～360°` 初始朝向，先沿自身朝向飞出，再转向目标；模板目前的 `180°` 不会限制克隆体的朝向。关闭 `knifeRandomInitialAngle` 后，克隆体会沿用模板角度。
- `gameNode/effectRoot` 是白色飞行轨迹的独立画面层，在怪物和飞剑层上方、状态 UI 下方。`KnifeTrail.ts` 把飞剑的世界坐标转换到这一层，沿真实路径画淡蓝白柔光和清晰白线；飞剑命中时立即清空白线。
- `gameNode/maskNode` 在开场时用 Graphics 绘制透明度 150 的黑色阴影，怪物周围留出透明的圆形亮区，亮区内的怪物不会被阴影覆盖。亮区底层有白色圆形背景；`yindao` 播放点击动画并指向开场怪物。
- `gameNode/player` 沿用场景里的角色。`targetRoot`、`dropRoot`、`battleUI`、`TempLayer` 分别放可攻击物品、掉落、伤害文字和警告文字；不再生成角色血量与已获得技能的状态文字。

战斗预制体路径集中在 [ResourceConfig.ts](assets/scripts/ResourceConfig.ts)；[ResourceManager.ts](assets/scripts/ResourceManager.ts) 统一加载并缓存 `resources` 目录下的预制体，也提供 `loadAudio(path)` 给后续音效使用。背包阶段先预加载当前战斗使用的九个预制体，战斗脚本按名称取得资源。

## 可调整参数

在 [BattleConfig.ts](assets/scripts/BattleConfig.ts) 的 `guide` 中修改开场模板名、怪物坐标、手指偏移、亮圈半径和遮罩透明度。当前怪物坐标是 `(0, -360)`，黑色阴影透明度为 `150/255`。`monster` 配置怪物血量、速度、刷新间隔等。场景里的 `targetRoot/1～6` 均可攻击，血量读取各自 `Iconskill142/Label` 的初始数字（依次为 15、555、1233、300、6666、75）。`skillTargets` 仍为空，留作额外地图物品。

首次按下屏幕，遮罩立即关闭，并按当前飞剑伤害发射。地图物品按 `1、6（同级）→2→4→3→5` 依次锁定，同级按距离选择；普通怪物始终按距离与当前可选的地图物品竞争。初始每次点击发射 1 把，击破 `1` 后立刻获得“三箭齐发”，此后每次点击发射 3 把，普通飞剑与 `knife1` 的伤害固定为 25。击破 `6` 后立刻获得“万剑决”：当场从角色位置向四周直线发出 18 支 `prefabs/knife1`，0.2 秒后再发 18 支；此后每隔 4 秒重复这轮两次齐射。每支飞剑命中一个目标后消失，伤害等于普通飞剑。击破 `2` 后每隔 0.1 秒生成一把 `prefabs/knife2`，共 18 把，剑柄朝向角色、剑尖径向朝外且均匀分布；环绕圆心比角色高 50 设计像素，全部生成后才开始持续旋转。同一目标接触环绕剑后，每隔至少 0.5 秒可再次受到 25 点伤害。数量、半径、圆心偏移、角速度和重复命中间隔均在 `BattleConfig.ts` 调整。技能物品归零时立即隐藏，1 秒后在角色身上单次播放 `prefabs/sxsj`。点击间隔由 `tapCooldown` 控制，默认 0.5 秒。怪物死亡动画 `die` 结束后才生成技能掉落，掉落自动飞向角色；怪物掉落的技能效果仍待确定，目前仅记录获得数量。

击破 `targetRoot/4` 后，之后点击发射的飞剑全部改为 `prefabs/knife3`，每把伤害 30；三连发仍生效。`knife3` 从预制体的 0° 朝左起飞，之后沿原有飞行路径转向目标，轨迹改为红色。已经发出的普通飞剑、周期释放的 `knife1` 和环绕的 `knife2` 不受这次伤害提升影响。

击破 `targetRoot/3` 后立即释放一轮雷击，之后每隔 5 秒再次释放。每轮选择距离角色最近的最多 3 只不同的存活怪物，在各怪物位置播放一次 `prefabs/lei` 的 `animation` 动画，并各造成 150 点伤害；怪物不足 3 只时不重复选取。数量、周期和伤害可在 `BattleConfig.ts` 调整。

击破 `targetRoot/5` 后立即从角色位置生成一个 `prefabs/feng` 龙卷风，此后每隔 8 秒再释放一次。每次朝释放时最近怪物所在方向直线前进；如果当时没有怪物，则朝画面上方前进。龙卷风持续 3 秒，默认速度为每秒 320 设计像素，沿途每只碰到的怪物受 200 点伤害，同一只怪在这次龙卷风中只受一次伤害，龙卷风命中后继续前进。速度、周期、持续时间、碰撞半径和伤害可在 `BattleConfig.ts` 调整。

击破 `3` 后，在 `gameNode/TempLayer` 下的 `(0, 400)` 显示 `prefabs/warn` 的“一大批怪物即将来袭”警告，保持 2 秒后用 0.5 秒淡出。击破 `5` 后，怪物移动速度切换为每秒 100 设计像素，刷怪间隔从 1 秒缩短为 0.5 秒。数值由 `BattleConfig.ts` 的 `monster.speedAfterTarget5`、`monster.spawnIntervalAfterTarget5`、`warnHoldDuration` 和 `warnFadeDuration` 控制。

地图物品被飞剑命中时，继续在命中位置播放 `prefabs/hit`，`targetRoot` 下被击中的物品根节点整体短暂泛红、放大后恢复；血量数字同步减少。受击放大倍率和动画时间可在 `BattleConfig.ts` 调整。

## 生成与飞行参数

生成算法在 [MonsterSpawner.ts](assets/scripts/MonsterSpawner.ts)：每 1 秒生成一波，每波最多 3 只，场上最多 30 只。一波里的怪物分散到画面不同边缘生成，再向角色移动。生成位置依据模板的视觉尺寸与锚点留出边距，确保完整外观仍在画面内；多个候选点中优先选远离现有怪物的位置。`BattleConfig.ts` 的 `monster.spawnInterval` 控制生成频率，`perWave` 控制每波数量，`maxAlive` 控制场上上限，`edgePadding` 控制离画面边缘的留白（越小越贴边）。

飞行算法在 [KnifeFlight.ts](assets/scripts/KnifeFlight.ts)：第一段从随机或模板角度出发，沿当前朝向飞行并缓慢弯曲；第二段按目标相对方向转弯，初始方向与目标相差约 `90°` 时走较大的圆弧，相反时走接近 `180°` 的 U 形弧线；第三段对准目标后加速追击。接近目标时再接入一条以当前飞行方向为起点切线、以目标为终点的短弧线，避免高速追击时因转弯半径过大而绕怪转圈。转向阶段继续沿用原有位置、朝向、转向速度和移动速度；终段按弧长匀速推进，曲线起点的飞行方向与上一段连续。怪物死亡需要更换目标时，飞剑从当前位置继续转向，不会再次播放起飞段。

在 [BattleConfig.ts](assets/scripts/BattleConfig.ts) 中，`knifeRandomInitialAngle` 控制随机初始角度；`knifeLaunchDistance` 和 `knifeLaunchBendAngle` 控制出手弧线；`knifeTurnSpeed`、`knifeTurnMaxRate`、`knifeTurnAngularAcceleration`、`knifeTurnMinDistance` 控制第二段转弯的速度、大小和平顺程度。想让第二段更大，可以调低 `knifeTurnMaxRate` 或调高 `knifeTurnMinDistance`。`knifeChaseTurnRate` 控制追击时修正目标的速度。`knifeTerminalCaptureDistance` 当前为 `300` 设计像素，调大可更早接入终段弧线、提高命中稳定性；调小可保留更长的自由追击，但过小可能再次出现绕圈。`knifeFlightEdgePadding` 和 `knifeTurnScreenReserve` 会缩短靠近画面边缘的起飞段，为回转留空间。

飞剑速度主要改 `knifeTurnSpeed`（出手与转弯）和 `knifeSpeed`（追击最高速度）。当前分别为 `700` 和 `1250` 设计像素/秒；初始速度由 `knifeSpeed * knifeStartSpeedRatio` 算出，约为 `688`。`knifeAcceleration` 决定追击时提速的快慢。提速时同步提高 `knifeTurnMaxRate`、`knifeTurnAngularAcceleration` 和 `knifeChaseTurnRate`，可大致保持原来的弧线半径与衔接方式。

飞行路径按 `knifeFlightStepDistance` 分小段，每小段都做命中检查，并把实际位置交给 [KnifeTrail.ts](assets/scripts/KnifeTrail.ts) 画白线，弯道不会被整帧直线截断。命中仍使用 `knifeHitRadius + 目标 radius` 的圆形判定；当前 `knifeHitRadius=15`、`monster.radius=8` 沿用你调整后的数值。普通飞剑与 `knife1` 的白线均沿飞行路径最多保留 `200` 设计像素，命中则立即清除；飞剑最长存在 `3.5` 秒，以容纳反向起飞后的较长回转。

实现思路参考了 GitHub 上的 [先飞出再转向的示例](https://gist.github.com/ChristopherJ-Github/8ab5b19bc5e6dbf3ee84caea899dd757) 和 [多段贝塞尔曲线示例](https://github.com/bluescan/bezier)。当前实现使用连续转向处理起飞和大角度回转，再用终段曲线保证贴近目标时收束到命中位置，保留自己的 Cocos 节点、命中和白线逻辑。

运行效果由你在 Cocos Creator 中查看；助手只做静态检查。
