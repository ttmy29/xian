# gameNode 战斗与开场引导

场景初始显示 `Canvas/Node`，隐藏 `Canvas/gameNode`。首次把 `icon1` 或 `icon2` 成功放进上方九宫格时启动 3 秒倒计时，合成或再次拖动不会重置；倒计时结束后隐藏 `Node` 并打开 `gameNode`。飞剑伤害只取格子中最高等级的 icon1：Lv.1 为 10，之后每级加 5。开始按钮目前不参与流程。

## 音频

`AudioManager.ts` 从独立的 `music` Bundle 加载音频。进入初始界面后循环播放 `BGM`，首次拖动物品时重试启动背景音乐；初始界面拖动物品或点击刷新按钮播放 `Click`。战斗中每次实际发射一轮普通飞剑播放一次 `FeiJian`；`knife` 和 `knife3` 每次有效命中怪物（包括 Boss）播放 `attack1`，命中地图物品时不播放；`knife2` 每次有效命中怪物（包括 Boss）播放 `bigJian`；每次 `lei2` 开始后 1.5 秒真正显现时播放 `duJie`，并让战斗画面短暂震动；每次释放 5 技能龙卷风播放 `Tornado`；警告界面出现时播放 `warn`。音效使用独立音源，允许重叠播放；资源加载失败只记录错误，不阻断战斗。

## 场景节点

`targetRoot` 保留场景中配置的层级。运行时仅在 `monsterRoot` 位于它上方时，将 `monsterRoot` 移到它下方，让地图物品遮挡怪物。进入角色附近并转移到 `TempLayer` 的怪物沿用前景显示规则。

- 普通怪从 `resources/prefabs/monster/monster1、2、3` 加载，`monster1` 用于开场引导，之后由 `MonsterSpawner.ts` 从三种预制体中选择，在画面边缘成波生成。后续刷出的普通怪出生 X 坐标限制在 `-150` 左侧或 `150` 右侧：右侧怪走向角色右侧 `(80, 0)`，左侧怪走向角色左侧 `(-80, 0)`。引导怪保持从 `(0, -360)` 出发，走向左侧攻击点。怪物进入角色周围半径 80 的范围时转移到 `TempLayer`，转移前后保持屏幕坐标不变；移动、刷怪避让和伤害范围仍按 `monsterRoot` 坐标计算。怪物到点后停留并循环播放 `phyattack`，每隔 1 秒对角色造成 10 点伤害，角色位置显示伤害飘字；Boss 使用右侧攻击点和自身的伤害配置。旧场景模板若仍留在 `monsterRoot` 下，运行时会隐藏。复制体向右移动时镜像，向左移动时保持原朝向。
- `gameNode/knifeRoot/knife` 是飞剑模板，包含图片与原有特效。运行时隐藏原节点，每次点击复制完整模板。默认每把克隆飞剑随机取 `0°～360°` 初始朝向，先沿自身朝向飞出，再转向目标；模板目前的 `180°` 不会限制克隆体的朝向。关闭 `knifeRandomInitialAngle` 后，克隆体会沿用模板角度。
- `gameNode/effectRoot` 是白色飞行轨迹的独立画面层，绘制顺序沿用场景配置。当前层级列表中位于 `targetRoot` 之后、`dropRoot` 之前，掉落物绘制在特效上方。`KnifeTrail.ts` 把飞剑的世界坐标转换到这一层，沿真实路径画淡蓝白柔光和清晰白线；飞剑命中时立即清空白线。
- `gameNode/maskNode` 在开场时用 Graphics 绘制透明度 150 的黑色阴影，怪物周围留出透明的圆形亮区，亮区内的怪物不会被阴影覆盖。白色圆形亮圈放在 `monsterRoot` 的最底层，显示在引导怪物后面；遮罩开孔中心由亮圈世界坐标转换得到；`yindao` 播放点击动画并指向开场怪物。
- `gameNode/player` 保持角色位置和技能特效的根节点。战斗开始时把护盾预制体 `prefabs/baohu` 加到 `gameNode` 下；仅当其根节点的 Spine 组件已设置资源时，才用世界坐标对齐角色、持续跟随并循环播放 `animation`，否则保留预制体原有坐标。战斗开始时从独立的 `role` Bundle 加载并显示 `role1`；击破 2 后播放 `lei1`，从 `lei1` 开始起等待 `roleAdvance.lei2StartDelay`（默认 1.5 秒）启动 `lei2`，等待 `roleAdvance.skillStartDelay`（默认 2.5 秒）播放 `role1/spine` 下所有 Spine 的 `skill1`，`skill1` 全部播完后切换成 `role2` 并播放一次 `sxsj`。击破 3 后等待 `3PD1`、`3PD2` 和首轮雷击动画结束，再播放一次 `lei1`；同样在 `lei1` 开始后 1.5 秒启动 `lei2`、2.5 秒启动 `role2` 的 `skill1`，切换成 `role3` 并播放一次 `sxsj`。`lei1` 播放结束不造成伤害；每次 `lei2` 开始后的前 1 秒不伤害怪物，之后持续检查角色周围半径 400，范围内每只怪物在本次 `lei2` 中受到一次 300 伤害，新进入范围的怪物也会受伤。击破 2 触发的 `lei2` 播放结束后首次显示 `success`，切换到 `role3` 后再显示一次。`targetRoot`、`dropRoot`、`battleUI`、`TempLayer` 分别放可攻击物品、掉落、伤害文字和警告文字；不再生成角色血量与已获得技能的状态文字。

战斗预制体路径集中在 [ResourceConfig.ts](assets/scripts/ResourceConfig.ts)；[ResourceManager.ts](assets/scripts/ResourceManager.ts) 统一加载并缓存 `resources` 目录下的预制体，也提供 `loadAudio(path)` 给后续音效使用。背包阶段先预加载当前战斗使用的预制体，战斗脚本按名称取得资源。

## 可调整参数

战斗配置按 `player`、`knife`、`skill1`～`skill6`、`roleAdvance`、`skillTarget`、`damageText`、`monsterDrop`、`monster` 和 `boss` 分组。`skill3.breakRadius`、`skill3.breakDamage`、`skill3.breakDuration` 与 `skill3.breakHitInterval` 控制 `3PD2` 的持续范围伤害；`roleAdvance` 控制两次 `lei1` 的范围伤害、位置和角色进阶等待时间。

在 [BattleConfig.ts](assets/scripts/BattleConfig.ts) 的 `guide` 中修改开场模板名、怪物坐标、手指偏移、亮圈半径和遮罩透明度。当前怪物坐标是 `(0, -360)`，黑色阴影透明度为 `150/255`。`monster` 配置怪物血量、速度、出生横坐标限制、左右攻击点和攻击间隔等。场景里的 `targetRoot/1～6` 均可攻击，血量读取各自 `Iconskill142/Label` 的初始数字（依次为 15、555、1233、300、6666、75）。`skillTarget.extraTargets` 仍为空，留作额外地图物品。

首次按下屏幕，遮罩立即关闭，并按当前飞剑伤害发射。地图物品按 `1、6（同级）→2→4→3→5` 依次锁定，同级按距离选择；普通怪物始终按距离与当前可选的地图物品竞争。初始每次点击发射 1 把，击破 `1` 后立刻获得“三箭齐发”，此后每次点击发射 3 把，当前普通飞剑与 `knife1` 的伤害增加 10。击破 `6` 后立刻获得“万剑决”：当场从角色位置向四周直线发出 18 支 `prefabs/knife1`，0.2 秒后再发 18 支；此后每隔 4 秒重复这轮两次齐射。每支飞剑命中一个目标后消失，伤害等于普通飞剑。击破 `2` 后在角色上方 200 像素播放 `prefabs/lei1` 的 `pojing_xian` 动画；从 `lei1` 开始第 1.5 秒启动 `prefabs/lei2` 的 `effect`，`lei2` 开始后第 1.5 秒播放 `duJie` 并震屏；`lei2` 前 1 秒不伤害怪物，之后对半径 400 内每只怪物至多造成一次 300 伤害；第 2.5 秒启动角色动作，动作结束后切换 `role2`；本次 `lei2` 播放结束后显示首次 `success`。同时每隔 0.1 秒生成一把 `prefabs/knife2`，共 18 把，环绕飞剑容器放在已有的 `gameNode/TempKnife1` 下，沿用该节点的层级；环绕位置和碰撞仍按 `knifeRoot` 坐标计算，显示位置与朝向转换到世界坐标；剑柄朝向角色、剑尖径向朝外且均匀分布；环绕圆心比角色高 50 设计像素，全部生成后才开始持续旋转。同一目标接触环绕剑后，每隔至少 0.5 秒可再次受到 25 点伤害。数量、半径、圆心偏移、角速度和重复命中间隔均在 `BattleConfig.ts` 调整。技能物品 1～6 归零时立即隐藏，同时在 `gameNode/player` 的 `(0, 0)` 播放一次 `waitSkill`，动画结束后销毁；`sxsj` 只在切换到新角色时播放。点击间隔由 `knife.tapCooldown` 控制，默认 0.5 秒。击杀怪物时立即生成掉落物，死亡动画 `die` 结束后再飞向角色；怪物掉落的技能效果仍待确定，目前仅记录获得数量。

击破 `targetRoot/4` 时立即解锁 `prefabs/knife3`，之后点击发射的飞剑全部改为 `knife3`，每把伤害 30；三连发仍生效。`knife3` 从预制体的 0° 朝左起飞，之后沿原有飞行路径转向目标，轨迹改为红色。`lei1`、`lei2`、角色动作与切换 `role2` 的整套流程改由击破 `targetRoot/2` 触发；击破 4 只解锁 `knife3`。已经发出的普通飞剑、周期释放的 `knife1` 和环绕的 `knife2` 不受这次伤害提升影响。

击破 `targetRoot/3` 后先依次播放 `prefabs/3PD1`、`prefabs/3PD2`。`3PD2` 完整播放 2 秒，在开始后的 0.5、1、1.5、2 秒分别以角色当时的位置为圆心，对半径 300 内的每只存活怪物造成 200 点伤害，不影响地图物品。第 2 秒结算后才解锁并立即释放一轮雷击，之后每隔 5 秒再次释放。每轮雷击选择距离角色最近的最多 5 只不同的存活怪物，在各怪物位置播放一次 `prefabs/lei` 的 `animation` 动画，并各造成 150 点伤害；怪物不足 5 只时不重复选取。数量、周期和伤害可在 `BattleConfig.ts` 调整。

击破 `targetRoot/5` 时立即解锁并从角色位置释放一个 `prefabs/feng` 龙卷风，此后每隔 5 秒再释放一次；同时在 `gameNode/effectRoot` 以角色位置为中心播放一次 `prefabs/5PD1`。释放时比较朝各只存活怪物的直线路径，选择预计碰到怪物最多的方向；数量相同则优先更早碰到怪物的方向，没有可命中的怪物时朝画面上方前进。龙卷风持续 3 秒，默认速度为每秒 320 设计像素，沿途每只碰到的怪物受 200 点伤害，同一只怪在这次龙卷风中只受一次伤害，龙卷风命中后继续前进。速度、周期、持续时间、碰撞半径和伤害可在 `BattleConfig.ts` 调整。

击破 `targetRoot/5` 时还会在角色右上方较远处生成一次 `prefabs/monster/monster4` Boss。Boss 血量 500，移动速度 100，到右侧攻击点后每 1 秒造成 10 点伤害；出生距离和伤害在 `boss` 配置中调整。角色血量归零时立即停止战斗，当前角色的所有 Spine 部件播放一次 `die`，全部播放结束后才在 `TempLayer` 显示 `assets/result/fail.prefab`；Boss 血量归零时停止战斗，场上全部怪物（包括已移到 `TempLayer` 的怪物和 Boss）播放一次死亡动画；全部播放结束后才显示 `assets/result/victory.prefab`；若某个动画未发送完成回调，会按动画时长加 0.5 秒兜底结束，最长等待 8 秒。`assets/result` 是独立 Bundle，由 `ResourceManager` 在结算时加载对应预制体；按钮使用各自预制体脚本重载 `game` 场景。

击破 `3` 后，等 `3PD1`、`3PD2` 播放完，怪物移动速度切换为每秒 80 设计像素，刷怪间隔缩短为 0.2 秒；同时在 `gameNode/TempLayer` 中央显示 `prefabs/warn`，让屏幕变暗、怪物暂停移动。警告保持 0.8 秒并在 0.2 秒内淡出，随后恢复移动。数值由 `BattleConfig.ts` 的 `skill3` 配置控制。

普通飞剑、环绕飞剑和万剑决命中时播放 `prefabs/hit`；击破 `targetRoot/4` 后，仅点击发射的 `knife3` 命中改为播放 `prefabs/hit4`。技能 3 的 `3PD2` 范围伤害与雷击仍播放 `prefabs/hit2`；技能 5 的龙卷风仍播放 `prefabs/hit3`。地图物品被飞剑命中时，其根节点短暂泛红、放大后恢复，血量数字同步减少。受击放大倍率和动画时间可在 `BattleConfig.ts` 调整。

## 生成与飞行参数

生成算法在 [MonsterSpawner.ts](assets/scripts/MonsterSpawner.ts)：每 1 秒生成一波，每波最多 3 只，场上最多 30 只。一波里的怪物分散到画面不同边缘生成，出生点 X 小于 `-150` 或大于 `150`，之后向同侧攻击点移动。所有怪物（包括 Boss）的出生 Y 坐标限制为 `monsterRoot` 坐标系下的 `y ≤ 550`，由 `monster.spawnMaxY` 配置。生成位置依据模板的视觉尺寸与锚点留出边距，确保完整外观仍在画面内；多个候选点中优先选远离现有怪物的位置。`BattleConfig.ts` 的 `monster.spawnInterval` 控制生成频率，`perWave` 控制每波数量，`maxAlive` 控制场上上限，`spawnMinAbsX` 控制出生横坐标限制，`edgePadding` 控制离画面边缘的留白（越小越贴边）。

飞行算法在 [KnifeFlight.ts](assets/scripts/KnifeFlight.ts)：第一段从随机或模板角度出发，沿当前朝向飞行并缓慢弯曲；第二段按目标相对方向转弯，初始方向与目标相差约 `90°` 时走较大的圆弧，相反时走接近 `180°` 的 U 形弧线；第三段对准目标后加速追击。接近目标时再接入一条以当前飞行方向为起点切线、以目标为终点的短弧线，避免高速追击时因转弯半径过大而绕怪转圈。转向阶段继续沿用原有位置、朝向、转向速度和移动速度；终段按弧长匀速推进，曲线起点的飞行方向与上一段连续。怪物死亡需要更换目标时，飞剑从当前位置继续转向，不会再次播放起飞段。

在 [BattleConfig.ts](assets/scripts/BattleConfig.ts) 的 `knife` 分组中，`knifeRandomInitialAngle` 控制随机初始角度；`knifeLaunchDistance` 和 `knifeLaunchBendAngle` 控制出手弧线；`knifeTurnSpeed`、`knifeTurnMaxRate`、`knifeTurnAngularAcceleration`、`knifeTurnMinDistance` 控制第二段转弯的速度、大小和平顺程度。想让第二段更大，可以调低 `knifeTurnMaxRate` 或调高 `knifeTurnMinDistance`。`knifeChaseTurnRate` 控制追击时修正目标的速度。`knifeTerminalCaptureDistance` 当前为 `300` 设计像素，调大可更早接入终段弧线、提高命中稳定性；调小可保留更长的自由追击，但过小可能再次出现绕圈。`knifeFlightEdgePadding` 和 `knifeTurnScreenReserve` 会缩短靠近画面边缘的起飞段，为回转留空间。

飞剑速度主要改 `knifeTurnSpeed`（出手与转弯）和 `knifeSpeed`（追击最高速度）。当前分别为 `700` 和 `1250` 设计像素/秒；初始速度由 `knifeSpeed * knifeStartSpeedRatio` 算出，约为 `688`。`knifeAcceleration` 决定追击时提速的快慢。提速时同步提高 `knifeTurnMaxRate`、`knifeTurnAngularAcceleration` 和 `knifeChaseTurnRate`，可大致保持原来的弧线半径与衔接方式。

飞行路径按 `knifeFlightStepDistance` 分小段，每小段都做命中检查，并把实际位置交给 [KnifeTrail.ts](assets/scripts/KnifeTrail.ts) 画白线，弯道不会被整帧直线截断。命中仍使用 `knifeHitRadius + 目标 radius` 的圆形判定；当前 `knifeHitRadius=15`、`monster.radius=8` 沿用你调整后的数值。普通飞剑与 `knife1` 的白线均沿飞行路径最多保留 `400` 设计像素，命中则立即清除；飞剑最长存在 `3.5` 秒，以容纳反向起飞后的较长回转。

实现思路参考了 GitHub 上的 [先飞出再转向的示例](https://gist.github.com/ChristopherJ-Github/8ab5b19bc5e6dbf3ee84caea899dd757) 和 [多段贝塞尔曲线示例](https://github.com/bluescan/bezier)。当前实现使用连续转向处理起飞和大角度回转，再用终段曲线保证贴近目标时收束到命中位置，保留自己的 Cocos 节点、命中和白线逻辑。

运行效果由你在 Cocos Creator 中查看；助手只做静态检查。
