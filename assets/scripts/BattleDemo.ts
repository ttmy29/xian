import {
    _decorator, Animation, Color, Component, EventTouch, Graphics, instantiate, Label, Node,
    Prefab, sp, Sprite, tween, Tween, UIOpacity, UITransform, Vec3,
} from 'cc';
import { BATTLE_CONFIG, SkillTargetConfig } from './BattleConfig';
import { KnifeFlight } from './KnifeFlight';
import { KnifeTrail } from './KnifeTrail';
import { MonsterSpawner } from './MonsterSpawner';
import { ResourceManager } from './ResourceManager';

const { ccclass } = _decorator;

interface BattleTarget {
    node: Node;
    hpLabel: Label | null;
    hp: number;
    alive: boolean;
    kind: 'monster' | 'skillTarget';
    rewardSkillId: string;
    radius: number;
    sceneSkillId?: '1' | '2' | '3' | '4' | '5' | '6';
    lastOrbitHitTime?: number;
    hitBaseScale?: Vec3;
    hitBaseColor?: Color;
}

interface FlyingKnife {
    node: Node;
    target: BattleTarget | null;
    flight: KnifeFlight;
    trail: KnifeTrail;
    isKnife3: boolean;
}

interface RadialKnife {
    node: Node;
    trail: KnifeTrail;
    directionX: number;
    directionY: number;
    age: number;
}

interface OrbitKnife {
    node: Node;
    slot: number;
    halfLength: number;
}

interface FengProjectile {
    node: Node;
    directionX: number;
    directionY: number;
    age: number;
    hitTargets: Set<BattleTarget>;
}

@ccclass('BattleDemo')
export class BattleDemo extends Component {
    private readonly targets: BattleTarget[] = [];
    private readonly knives: FlyingKnife[] = [];
    private readonly radialKnives: RadialKnife[] = [];
    private readonly orbitKnives: OrbitKnife[] = [];
    private readonly fengProjectiles: FengProjectile[] = [];
    private readonly trails: KnifeTrail[] = [];
    private readonly skills = new Map<string, number>();
    private readonly monsterSpawner = new MonsterSpawner();
    private readonly monsterTemplates: Node[] = [];
    private backgroundRoot!: Node;
    private targetRoot!: Node;
    private monsterRoot!: Node;
    private dropRoot!: Node;
    private player!: Node;
    private knifeRoot!: Node;
    private effectRoot!: Node;
    private knifeTemplate: Node | null = null;
    private hurtPrefab: Prefab | null = null;
    private hurtPrefabLoadFailed = false;
    private readonly pendingDamageTexts: { position: Vec3; damage: number }[] = [];
    private hitPrefab: Prefab | null = null;
    private hitPrefabLoadFailed = false;
    private readonly pendingHitEffects: Vec3[] = [];
    private upgradePrefab: Prefab | null = null;
    private upgradePrefabLoadFailed = false;
    private radialKnifePrefab: Prefab | null = null;
    private radialKnifePrefabLoadFailed = false;
    private orbitKnifePrefab: Prefab | null = null;
    private orbitKnifePrefabLoadFailed = false;
    private knife3Prefab: Prefab | null = null;
    private leiPrefab: Prefab | null = null;
    private leiPrefabLoadFailed = false;
    private pendingLeiCast = false;
    private fengPrefab: Prefab | null = null;
    private fengPrefabLoadFailed = false;
    private pendingFengCast = false;
    private warnPrefab: Prefab | null = null;
    private warnPrefabLoadFailed = false;
    private pendingWarn = false;
    private pendingUpgradeEffects = 0;
    private readonly pendingRadialAngles: number[] = [];
    private battleUI!: Node;
    private tempLayer!: Node;
    private maskNode!: Node;
    private spotlightNode: Node | null = null;
    private running = false;
    private time = 0;
    private lastShotTime = -Infinity;
    private playerHp = BATTLE_CONFIG.playerMaxHp;
    private knifeDamage = 0;
    private guideActive = false;
    private tripleShotUnlocked = false;
    private radialSkillUnlocked = false;
    private orbitSkillUnlocked = false;
    private knife3Unlocked = false;
    private leiSkillUnlocked = false;
    private fengSkillUnlocked = false;
    private orbitSpawnCount = 0;
    private orbitSpawnTimer = 0;
    private orbitAngle = 0;
    private radialVolleyIndex = 0;
    private nextKnifeCurveSide = 1;

    onLoad(): void {
        const canvasSize = this.node.parent!.getComponent(UITransform)!.contentSize;
        this.node.getComponent(UITransform)!.setContentSize(canvasSize);
        this.backgroundRoot = this.getOrCreate('bgNode');
        this.targetRoot = this.getOrCreate('targetRoot');
        this.targetRoot.setSiblingIndex(1);
        this.monsterRoot = this.getOrCreate('monsterRoot');
        // 场景中的 1/2/3 只作为 Spine 模板，真正上场的是克隆节点。
        this.monsterTemplates.push(...this.monsterRoot.children.filter(child => /^(1|2|3)$/.test(child.name)));
        for (const template of this.monsterTemplates) template.active = false;
        this.dropRoot = this.getOrCreate('dropRoot');
        this.player = this.getOrCreate('player');
        this.knifeRoot = this.getOrCreate('knifeRoot');
        this.knifeTemplate = this.knifeRoot.getChildByName('knife');
        if (this.knifeTemplate) this.knifeTemplate.active = false;
        else console.error('BattleDemo: knifeRoot 下缺少飞剑模板 knife。');
        this.effectRoot = this.getOrCreate('effectRoot');
        this.effectRoot.layer = this.node.layer;
        this.effectRoot.getComponent(UITransform)!.setContentSize(canvasSize);
        this.effectRoot.setSiblingIndex(this.knifeRoot.getSiblingIndex() + 1);
        this.battleUI = this.getOrCreate('battleUI');
        this.tempLayer = this.getOrCreate('TempLayer');
        this.tempLayer.getComponent(UITransform)!.setContentSize(canvasSize);
        void ResourceManager.loadPrefab('hurt').then(prefab => {
            if (!this.node.isValid) return;
            this.hurtPrefab = prefab;
            for (const hit of this.pendingDamageTexts) this.createDamageText(hit.position, hit.damage);
            this.pendingDamageTexts.length = 0;
        }, error => {
            if (this.node.isValid) {
                console.error('BattleDemo: 加载 prefabs/hurt 失败。', error);
                this.hurtPrefabLoadFailed = true;
                this.pendingDamageTexts.length = 0;
            }
        });
        void ResourceManager.loadPrefab('hit').then(prefab => {
            if (!this.node.isValid) return;
            this.hitPrefab = prefab;
            for (const position of this.pendingHitEffects) this.createHitEffect(position);
            this.pendingHitEffects.length = 0;
        }, error => {
            if (this.node.isValid) {
                console.error('BattleDemo: 加载 prefabs/hit 失败。', error);
                this.hitPrefabLoadFailed = true;
                this.pendingHitEffects.length = 0;
            }
        });
        void ResourceManager.loadPrefab('sxsj').then(prefab => {
            if (!this.node.isValid) return;
            this.upgradePrefab = prefab;
            const pending = this.pendingUpgradeEffects;
            this.pendingUpgradeEffects = 0;
            for (let index = 0; index < pending; index++) this.playUpgradeEffect();
        }, error => {
            if (this.node.isValid) {
                console.error('BattleDemo: 加载 prefabs/sxsj 失败。', error);
                this.upgradePrefabLoadFailed = true;
                this.pendingUpgradeEffects = 0;
            }
        });
        void ResourceManager.loadPrefab('knife1').then(prefab => {
            if (!this.node.isValid) return;
            this.radialKnifePrefab = prefab;
            for (const angle of this.pendingRadialAngles) this.spawnRadialKnife(angle);
            this.pendingRadialAngles.length = 0;
        }, error => {
            if (this.node.isValid) {
                console.error('BattleDemo: 加载 prefabs/knife1 失败。', error);
                this.radialKnifePrefabLoadFailed = true;
                this.pendingRadialAngles.length = 0;
            }
        });
        void ResourceManager.loadPrefab('knife2').then(prefab => {
            if (!this.node.isValid) return;
            this.orbitKnifePrefab = prefab;
            if (this.orbitSkillUnlocked && this.orbitSpawnCount === 0) this.spawnOrbitKnife();
        }, error => {
            if (this.node.isValid) {
                console.error('BattleDemo: 加载 prefabs/knife2 失败。', error);
                this.orbitKnifePrefabLoadFailed = true;
            }
        });
        void ResourceManager.loadPrefab('knife3').then(prefab => {
            if (this.node.isValid) this.knife3Prefab = prefab;
        }, error => {
            if (this.node.isValid) console.error('BattleDemo: 加载 prefabs/knife3 失败。', error);
        });
        void ResourceManager.loadPrefab('lei').then(prefab => {
            if (!this.node.isValid) return;
            this.leiPrefab = prefab;
            if (this.pendingLeiCast && this.running) {
                this.pendingLeiCast = false;
                this.launchLeiVolley();
            }
        }, error => {
            if (this.node.isValid) {
                console.error('BattleDemo: 加载 prefabs/lei 失败。', error);
                this.leiPrefabLoadFailed = true;
                this.pendingLeiCast = false;
            }
        });
        void ResourceManager.loadPrefab('feng').then(prefab => {
            if (!this.node.isValid) return;
            this.fengPrefab = prefab;
            if (this.pendingFengCast && this.running) {
                this.pendingFengCast = false;
                this.launchFeng();
            }
        }, error => {
            if (this.node.isValid) {
                console.error('BattleDemo: 加载 prefabs/feng 失败。', error);
                this.fengPrefabLoadFailed = true;
                this.pendingFengCast = false;
            }
        });
        void ResourceManager.loadPrefab('warn').then(prefab => {
            if (!this.node.isValid) return;
            this.warnPrefab = prefab;
            if (this.pendingWarn && this.running) {
                this.pendingWarn = false;
                this.showWarn();
            }
        }, error => {
            if (this.node.isValid) {
                console.error('BattleDemo: 加载 prefabs/warn 失败。', error);
                this.warnPrefabLoadFailed = true;
                this.pendingWarn = false;
            }
        });
        this.maskNode = this.getOrCreate('maskNode');
        this.maskNode.active = false;
        const sceneUpgradeEffect = this.node.getChildByName('sxsj');
        if (sceneUpgradeEffect) sceneUpgradeEffect.active = false;
        this.drawPlaceholders(canvasSize.width, canvasSize.height);
        this.node.on(Node.EventType.TOUCH_START, this.onTap, this);
    }

    onDestroy(): void {
        this.unschedule(this.spawnWave);
        this.unschedule(this.launchPeriodicRadialVolley);
        this.unschedule(this.launchLeiVolley);
        this.unschedule(this.launchFeng);
        this.node.off(Node.EventType.TOUCH_START, this.onTap, this);
    }

    /** 背包倒计时结束后调用；最高等级 icon1 决定每把飞剑的伤害。 */
    public startBattle(highestIcon1Level: number): void {
        if (this.running) return;
        this.knifeDamage = highestIcon1Level > 0
            ? BATTLE_CONFIG.icon1BaseDamage + (highestIcon1Level - 1) * BATTLE_CONFIG.icon1DamagePerLevel
            : 0;
        this.playerHp = BATTLE_CONFIG.playerMaxHp;
        this.time = 0;
        this.tripleShotUnlocked = false;
        this.radialSkillUnlocked = false;
        this.orbitSkillUnlocked = false;
        this.knife3Unlocked = false;
        this.leiSkillUnlocked = false;
        this.pendingLeiCast = false;
        this.fengSkillUnlocked = false;
        this.pendingFengCast = false;
        this.pendingWarn = false;
        this.orbitSpawnCount = 0;
        this.orbitSpawnTimer = 0;
        this.orbitAngle = 0;
        this.radialVolleyIndex = 0;
        this.running = true;
        this.createSkillTargets();
        const firstTemplate = this.monsterTemplates.find(template => template.name === BATTLE_CONFIG.guide.firstMonsterTemplate);
        if (firstTemplate) {
            const firstMonster = this.createMonster(firstTemplate, BATTLE_CONFIG.guide.firstMonsterX, BATTLE_CONFIG.guide.firstMonsterY);
            this.showGuide(firstMonster);
        } else {
            console.error(`BattleDemo: monsterRoot 下缺少引导模板 ${BATTLE_CONFIG.guide.firstMonsterTemplate}`);
            this.spawnWave();
            this.schedule(this.spawnWave, BATTLE_CONFIG.monster.spawnInterval);
        }
    }

    update(dt: number): void {
        if (this.running) {
            this.time += dt;
            if (!this.guideActive) this.updateMonsters(dt);
            this.updateKnives(dt);
            this.updateRadialKnives(dt);
            this.updateOrbitKnives(dt);
            this.updateFengs(dt);
        }
        this.updateTrails(dt);
    }

    private getOrCreate(name: string): Node {
        let child = this.node.getChildByName(name);
        if (!child) {
            child = new Node(name);
            child.layer = this.node.layer;
            child.parent = this.node;
            child.addComponent(UITransform);
        }
        return child;
    }

    private makeNode(parent: Node, name: string, width: number, height: number): Node {
        const node = new Node(name);
        node.layer = parent.layer;
        node.parent = parent;
        node.addComponent(UITransform).setContentSize(width, height);
        return node;
    }

    private makeLabel(parent: Node, name: string, x: number, y: number): Label {
        const node = this.makeNode(parent, name, 280, 50);
        node.setPosition(x, y);
        const label = node.addComponent(Label);
        label.fontSize = 24;
        label.lineHeight = 32;
        label.color = new Color(255, 255, 255, 255);
        return label;
    }

    private drawPlaceholders(width: number, height: number): void {
        const hasBackgroundImage = this.backgroundRoot.getComponent(Sprite)?.spriteFrame ||
            this.backgroundRoot.children.some(child => !!child.getComponent(Sprite)?.spriteFrame);
        if (!hasBackgroundImage) {
            const g = this.backgroundRoot.getComponent(Graphics) ?? this.backgroundRoot.addComponent(Graphics);
            g.fillColor = new Color(196, 204, 197, 255);
            g.rect(-width / 2, -height / 2, width, height);
            g.fill();
        }
        if (!this.player.getComponent(Sprite) && this.player.children.length === 0) {
            const g = this.player.getComponent(Graphics) ?? this.player.addComponent(Graphics);
            g.fillColor = new Color(62, 112, 210, 255);
            g.circle(0, 0, 32);
            g.fill();
        }
    }

    private createSkillTargets(): void {
        for (const id of ['1', '2', '3', '4', '5', '6'] as const) {
            const node = this.targetRoot.getChildByName(id);
            let hpLabel = node?.getChildByName('Iconskill142')
                ?.getChildByName('Label')?.getComponent(Label);
            if (id === '4' && node && !hpLabel) {
                hpLabel = this.makeLabel(node, '血量', 0, -55);
                hpLabel.string = String(BATTLE_CONFIG.skillTarget4MaxHp);
            }
            const hp = Number(hpLabel?.string);
            if (!node || !hpLabel || !Number.isFinite(hp) || hp <= 0) {
                console.error(`BattleDemo: targetRoot/${id} 缺少有效的 Iconskill142/Label 血量。`);
                continue;
            }
            this.targets.push({
                node, hpLabel, hp, alive: true, kind: 'skillTarget',
                rewardSkillId: id === '1' ? '三箭齐发' : id === '2' ? '环绕飞剑'
                    : id === '3' ? '雷击' : id === '4' ? '赤焰飞剑'
                        : id === '5' ? '龙卷风' : '万剑决',
                radius: 60, sceneSkillId: id,
            });
        }
        for (const config of BATTLE_CONFIG.skillTargets) this.createSkillTarget(config);
    }

    private createSkillTarget(config: SkillTargetConfig): void {
        const node = this.makeNode(this.targetRoot, config.id, 80, 80);
        node.setPosition(config.x, config.y);
        const g = node.addComponent(Graphics);
        g.fillColor = new Color(198, 153, 45, 255);
        g.roundRect(-35, -35, 70, 70, 12);
        g.fill();
        const hpLabel = this.makeLabel(node, '血量', 0, -55);
        hpLabel.string = String(config.maxHp);
        this.targets.push({
            node, hpLabel, hp: config.maxHp, alive: true,
            kind: 'skillTarget', rewardSkillId: config.rewardSkillId, radius: 36,
        });
    }

    private spawnWave(): void {
        if (!this.running) return;
        const occupied = this.targets
            .filter(target => target.alive && target.kind === 'monster')
            .map(target => target.node.position.clone());
        const canvasSize = this.node.getComponent(UITransform)!.contentSize;
        const requests = this.monsterSpawner.planWave(canvasSize, this.monsterTemplates, occupied);
        for (const request of requests) this.createMonster(request.template, request.x, request.y);
    }

    private createMonster(template: Node, x: number, y: number): BattleTarget {
        const node = instantiate(template);
        node.name = `monster_${template.name}`;
        node.parent = this.monsterRoot;
        node.setPosition(x, y);
        // 模板正缩放时面朝左，向右移动才镜像；始终保留模板的尺寸。
        const playerPosition = this.monsterRoot.getComponent(UITransform)!
            .convertToNodeSpaceAR(this.player.worldPosition);
        this.faceMonster(node, playerPosition.x - x);
        node.active = true;
        node.getComponent(sp.Skeleton)?.setAnimation(0, 'move', true);
        const target: BattleTarget = {
            node, hpLabel: null, hp: BATTLE_CONFIG.monster.maxHp, alive: true,
            kind: 'monster', rewardSkillId: BATTLE_CONFIG.monster.rewardSkillId,
            radius: BATTLE_CONFIG.monster.radius,
        };
        this.targets.push(target);
        return target;
    }

    private faceMonster(node: Node, directionX: number): void {
        if (Math.abs(directionX) < 0.001) return;
        const scale = node.scale;
        const absX = Math.abs(scale.x);
        const facingX = directionX < 0 ? absX : -absX;
        if (scale.x !== facingX) node.setScale(facingX, scale.y, scale.z);
    }

    private showGuide(target: BattleTarget): void {
        const size = this.node.getComponent(UITransform)!.contentSize;
        const radius = BATTLE_CONFIG.guide.spotlightRadius;
        const center = target.node.position.clone();
        center.y += BATTLE_CONFIG.guide.spotlightOffsetY;
        this.spotlightNode = this.makeNode(this.targetRoot, 'guideSpotlight', radius * 2, radius * 2);
        this.spotlightNode.setPosition(center);
        const light = this.spotlightNode.addComponent(Graphics);
        light.fillColor = new Color(255, 255, 255, BATTLE_CONFIG.guide.spotlightAlpha);
        light.circle(0, 0, radius);
        light.fill();
        this.maskNode.setPosition(0, 0);
        this.maskNode.getComponent(UITransform)!.setContentSize(size);
        this.maskNode.setSiblingIndex(this.node.children.length - 1);
        const shade = this.maskNode.getComponent(Graphics) ?? this.maskNode.addComponent(Graphics);
        this.drawShadeWithHole(shade, size.width, size.height, center.x, center.y, radius);
        const pointer = this.maskNode.getChildByName('yindao');
        if (pointer) {
            const local = this.maskNode.getComponent(UITransform)!.convertToNodeSpaceAR(target.node.worldPosition);
            pointer.setPosition(local.x + BATTLE_CONFIG.guide.pointerOffsetX,
                local.y + BATTLE_CONFIG.guide.pointerOffsetY);
            pointer.active = true;
            pointer.getComponent(sp.Skeleton)?.setAnimation(0, 'yindao_dianji', true);
        }
        this.maskNode.active = true;
        this.guideActive = true;
    }

    private drawShadeWithHole(shade: Graphics, width: number, height: number,
        centerX: number, centerY: number, radius: number): void {
        shade.clear();
        shade.fillColor = new Color(0, 0, 0, BATTLE_CONFIG.guide.shadeAlpha);
        const left = -width / 2;
        const right = width / 2;
        const bottom = -height / 2;
        const top = height / 2;
        shade.rect(left, centerY + radius, width, top - centerY - radius);
        shade.rect(left, bottom, width, centerY - radius - bottom);
        // 用细横条沿圆边填满阴影，让圆内保持真正透明，怪物不会被盖住。
        const strips = 128;
        const stripHeight = radius * 2 / strips;
        for (let index = 0; index < strips; index++) {
            const y = centerY - radius + index * stripHeight;
            const midY = y + stripHeight / 2 - centerY;
            const halfOpening = Math.sqrt(radius * radius - midY * midY);
            const holeLeft = centerX - halfOpening;
            const holeRight = centerX + halfOpening;
            if (holeLeft > left) shade.rect(left, y, holeLeft - left, stripHeight);
            if (holeRight < right) shade.rect(holeRight, y, right - holeRight, stripHeight);
        }
        shade.fill();
    }

    private closeGuide(): void {
        if (!this.guideActive) return;
        this.guideActive = false;
        this.maskNode.active = false;
        this.spotlightNode?.destroy();
        this.spotlightNode = null;
        this.schedule(this.spawnWave, BATTLE_CONFIG.monster.spawnInterval);
    }

    private updateMonsters(dt: number): void {
        const playerPosition = this.monsterRoot.getComponent(UITransform)!
            .convertToNodeSpaceAR(this.player.worldPosition);
        for (const target of [...this.targets]) {
            if (!target.alive || target.kind !== 'monster') continue;
            const position = target.node.position;
            const dx = playerPosition.x - position.x;
            const dy = playerPosition.y - position.y;
            const distance = Math.hypot(dx, dy);
            if (distance <= target.radius + 28) {
                target.alive = false;
                this.removeTarget(target);
                target.node.destroy();
                this.playerHp = Math.max(0, this.playerHp - BATTLE_CONFIG.monster.contactDamage);
                if (this.playerHp === 0) {
                    this.running = false;
                    this.unschedule(this.spawnWave);
                    this.unschedule(this.launchPeriodicRadialVolley);
                }
                continue;
            }
            const speed = this.fengSkillUnlocked
                ? BATTLE_CONFIG.monster.speedAfterTarget5 : BATTLE_CONFIG.monster.speed;
            const step = Math.min(distance, speed * dt);
            this.faceMonster(target.node, dx);
            target.node.setPosition(position.x + dx / distance * step,
                position.y + dy / distance * step);
        }
    }

    private targetPositionInKnifeRoot(target: BattleTarget): Vec3 {
        return this.knifeRoot.getComponent(UITransform)!
            .convertToNodeSpaceAR(target.node.worldPosition);
    }

    private guidedTargets(): BattleTarget[] {
        const alive = this.targets.filter(target => target.alive);
        const priorityGroups = [['1', '6'], ['2'], ['4'], ['3'], ['5']];
        const currentGroup = priorityGroups.find(group =>
            alive.some(target => !!target.sceneSkillId && group.indexOf(target.sceneSkillId) >= 0));
        return currentGroup
            ? alive.filter(target => target.kind === 'monster' ||
                (!!target.sceneSkillId && currentGroup.indexOf(target.sceneSkillId) >= 0))
            : alive;
    }

    private onTap(_event: EventTouch): void {
        if (this.guideActive) this.closeGuide();
        if (!this.running || this.knifeDamage <= 0 || this.time - this.lastShotTime < BATTLE_CONFIG.tapCooldown) return;
        if (!this.knifeTemplate) return;
        const isKnife3 = this.knife3Unlocked;
        if (isKnife3 && !this.knife3Prefab) return;
        const count = this.tripleShotUnlocked ? BATTLE_CONFIG.tripleShotCount : 1;
        const launchPosition = this.knifeTemplate.position;
        const distanceFromLaunch = (target: BattleTarget): number => {
            const position = this.targetPositionInKnifeRoot(target);
            return (position.x - launchPosition.x) ** 2 + (position.y - launchPosition.y) ** 2;
        };
        const targets = this.guidedTargets()
            .sort((a, b) => distanceFromLaunch(a) - distanceFromLaunch(b));
        if (!targets.length) return;
        this.lastShotTime = this.time;
        for (let index = 0; index < count; index++) {
            const target = targets[index % targets.length];
            const node = isKnife3 ? instantiate(this.knife3Prefab!) : instantiate(this.knifeTemplate);
            node.name = isKnife3 ? 'flyingKnife3' : 'flyingKnife';
            node.parent = this.knifeRoot;
            if (isKnife3) node.setPosition(launchPosition);
            const origin = node.position;
            const targetPos = this.targetPositionInKnifeRoot(target);
            const direction = Math.atan2(targetPos.y - origin.y, targetPos.x - origin.x);
            const offset = (index - (count - 1) / 2) * BATTLE_CONFIG.knifeVolleySpacing;
            node.setPosition(origin.x - Math.sin(direction) * offset,
                origin.y + Math.cos(direction) * offset);
            node.active = true;
            const curveSide = count === 1 ? this.nextKnifeCurveSide
                : index === Math.floor(count / 2)
                    ? this.nextKnifeCurveSide * BATTLE_CONFIG.knifeVolleyCenterCurveSide
                    : index - (count - 1) / 2;
            const initialAngle = isKnife3 ? 0
                : BATTLE_CONFIG.knifeRandomInitialAngle ? Math.random() * 360 : node.angle;
            node.angle = initialAngle;
            const canvasSize = this.node.getComponent(UITransform)!.contentSize;
            const viewportCenter = this.knifeRoot.getComponent(UITransform)!
                .convertToNodeSpaceAR(this.node.worldPosition);
            const flight = new KnifeFlight(node.position, targetPos, initialAngle, curveSide,
                canvasSize.width, canvasSize.height, viewportCenter, isKnife3 ? 180 : 90);
            const trail = new KnifeTrail(this.effectRoot, node.worldPosition, isKnife3 ? 'red' : 'white');
            this.knives.push({ node, target, flight, trail, isKnife3 });
            this.trails.push(trail);
        }
        this.nextKnifeCurveSide *= -1;
    }

    private findNearestTarget(from: Readonly<Vec3>): BattleTarget | null {
        let nearest: BattleTarget | null = null;
        let bestDistance = Infinity;
        for (const target of this.guidedTargets()) {
            const pos = this.targetPositionInKnifeRoot(target);
            const distance = (pos.x - from.x) ** 2 + (pos.y - from.y) ** 2;
            if (distance < bestDistance) {
                bestDistance = distance;
                nearest = target;
            }
        }
        return nearest;
    }

    private updateKnives(dt: number): void {
        for (let index = this.knives.length - 1; index >= 0; index--) {
            const knife = this.knives[index];
            if (!knife.target?.alive) {
                knife.target = this.findNearestTarget(knife.node.position);
                if (knife.target) knife.flight.retarget(knife.node.position,
                    this.targetPositionInKnifeRoot(knife.target));
            }
            if (!knife.target) {
                knife.trail.finish();
                knife.node.destroy();
                this.knives.splice(index, 1);
                continue;
            }
            const hitRadius = BATTLE_CONFIG.knifeHitRadius + knife.target.radius;
            const targetPosition = this.targetPositionInKnifeRoot(knife.target);
            const step = knife.flight.step(knife.node.position, targetPosition, dt, hitRadius);
            for (const point of step.path) {
                knife.node.setPosition(point);
                knife.trail.addPoint(knife.node.worldPosition);
            }
            if (step.hit) {
                knife.trail.clearNow();
                this.damageTarget(knife.target, knife.isKnife3 ? BATTLE_CONFIG.knife3Damage : this.knifeDamage);
                knife.node.destroy();
                this.knives.splice(index, 1);
                continue;
            }
            if (step.expired) {
                knife.trail.finish();
                knife.node.destroy();
                this.knives.splice(index, 1);
                continue;
            }
            knife.node.setPosition(step.position);
            knife.node.angle = step.angleDegrees;
        }
    }

    private updateTrails(dt: number): void {
        for (let index = this.trails.length - 1; index >= 0; index--) {
            if (!this.trails[index].update(dt)) this.trails.splice(index, 1);
        }
    }

    private damageTarget(target: BattleTarget, damage: number): void {
        if (!target.alive) return;
        let hitPosition = target.node.worldPosition.clone();
        if (target.kind === 'monster') {
            this.showDamageText(target.node.worldPosition.clone(), damage);
            const transform = target.node.getComponent(UITransform);
            const bodyCenterY = transform
                ? (0.5 - transform.anchorY) * transform.contentSize.height : 0;
            hitPosition = transform
                ? transform.convertToWorldSpaceAR(new Vec3(0, bodyCenterY, 0))
                : hitPosition;
        } else {
            this.showSkillTargetHit(target);
        }
        this.showHitEffect(hitPosition);
        target.hp = Math.max(0, target.hp - damage);
        if (target.hpLabel) target.hpLabel.string = String(target.hp);
        if (target.hp === 0) this.killTarget(target);
    }

    private showSkillTargetHit(target: BattleTarget): void {
        const item = target.node;
        if (!target.hitBaseScale) target.hitBaseScale = item.scale.clone();
        const baseScale = target.hitBaseScale;
        Tween.stopAllByTarget(item);
        item.setScale(baseScale);
        const punch = new Vec3(baseScale.x * BATTLE_CONFIG.skillTargetHitScale,
            baseScale.y * BATTLE_CONFIG.skillTargetHitScale, baseScale.z);
        tween(item).to(BATTLE_CONFIG.skillTargetHitPunchDuration, { scale: punch })
            .to(BATTLE_CONFIG.skillTargetHitRecoverDuration, { scale: baseScale.clone() }).start();

        const sprite = item.getComponent(Sprite);
        if (!sprite) return;
        if (!target.hitBaseColor) target.hitBaseColor = sprite.color.clone();
        Tween.stopAllByTarget(sprite);
        sprite.color = new Color(255, 115, 115, target.hitBaseColor.a);
        tween(sprite).to(BATTLE_CONFIG.skillTargetHitRecoverDuration,
            { color: target.hitBaseColor.clone() }).start();
    }

    private showDamageText(position: Vec3, damage: number): void {
        if (this.hurtPrefabLoadFailed) return;
        if (!this.hurtPrefab) {
            this.pendingDamageTexts.push({ position, damage });
            return;
        }
        this.createDamageText(position, damage);
    }

    private createDamageText(position: Vec3, damage: number): void {
        const text = instantiate(this.hurtPrefab!);
        text.parent = this.battleUI;
        const label = text.getComponent(Label);
        if (label) label.string = `-${damage}`;
        const opacity = text.getComponent(UIOpacity);
        if (opacity) opacity.opacity = 255;
        const start = this.battleUI.getComponent(UITransform)!.convertToNodeSpaceAR(position);
        start.y += BATTLE_CONFIG.damageTextOffsetY;
        text.setPosition(start);
        const end = start.clone();
        end.y += BATTLE_CONFIG.damageTextRise;
        tween(text).to(BATTLE_CONFIG.damageTextDuration, { position: end }, { easing: 'quadOut' })
            .call(() => text.destroy()).start();
        if (opacity) tween(opacity).to(BATTLE_CONFIG.damageTextDuration, { opacity: 0 }).start();
    }

    private showHitEffect(position: Vec3): void {
        if (this.hitPrefabLoadFailed) return;
        if (!this.hitPrefab) {
            this.pendingHitEffects.push(position);
            return;
        }
        this.createHitEffect(position);
    }

    private createHitEffect(position: Vec3): void {
        const effect = instantiate(this.hitPrefab!);
        effect.parent = this.effectRoot;
        effect.setWorldPosition(position);
        const skeleton = effect.getComponent(sp.Skeleton);
        const entry = skeleton?.setAnimation(0, 'boom', false);
        if (entry) skeleton!.setTrackCompleteListener(entry, () => effect.destroy());
        else effect.destroy();
    }

    private killTarget(target: BattleTarget): void {
        target.alive = false;
        if (target.sceneSkillId) {
            target.node.active = false;
            this.removeTarget(target);
            this.grantSceneSkill(target.sceneSkillId, target.rewardSkillId);
            return;
        }
        let deathFinished = false;
        const finishDeath = (): void => {
            if (deathFinished) return;
            deathFinished = true;
            const dropPosition = target.node.position.clone();
            this.removeTarget(target);
            target.node.destroy();
            this.spawnSkillDrop(dropPosition, target.rewardSkillId);
        };
        const skeleton = target.node.getComponent(sp.Skeleton);
        if (skeleton) {
            const entry = skeleton.setAnimation(0, 'die', false);
            if (entry) {
                skeleton.setTrackCompleteListener(entry, finishDeath);
                return;
            }
        }
        const animation = target.node.getComponent(Animation);
        if (animation?.getState('death')) {
            animation.once(Animation.EventType.FINISHED, finishDeath);
            animation.play('death');
        } else {
            // 没有死亡动画资源时，先用缩小动画占位；完成后才生成掉落。
            tween(target.node).to(0.3, { scale: new Vec3(0, 0, 1) }).call(finishDeath).start();
        }
    }

    private grantSceneSkill(id: '1' | '2' | '3' | '4' | '5' | '6', skillName: string): void {
        this.skills.set(skillName, (this.skills.get(skillName) ?? 0) + 1);
        if (id === '1') {
            this.tripleShotUnlocked = true;
            this.knifeDamage = BATTLE_CONFIG.tripleShotDamage;
        } else if (id === '2') {
            this.orbitSkillUnlocked = true;
            this.spawnOrbitKnife();
        } else if (id === '3') {
            this.leiSkillUnlocked = true;
            this.showWarn();
            this.launchLeiVolley();
            this.schedule(this.launchLeiVolley, Math.max(0.01, BATTLE_CONFIG.leiInterval));
        } else if (id === '4') {
            this.knife3Unlocked = true;
        } else if (id === '5') {
            this.fengSkillUnlocked = true;
            this.launchFeng();
            this.schedule(this.launchFeng, Math.max(0.01, BATTLE_CONFIG.fengInterval));
            this.unschedule(this.spawnWave);
            this.schedule(this.spawnWave,
                Math.max(0.01, BATTLE_CONFIG.monster.spawnIntervalAfterTarget5));
        } else {
            this.radialSkillUnlocked = true;
            this.launchPeriodicRadialVolley();
            this.schedule(this.launchPeriodicRadialVolley,
                Math.max(0.01, BATTLE_CONFIG.radialKnifeInterval));
        }
        this.scheduleOnce(() => this.playUpgradeEffect(), BATTLE_CONFIG.upgradeEffectDelay);
    }

    private playUpgradeEffect(): void {
        if (this.upgradePrefabLoadFailed) return;
        if (!this.upgradePrefab) {
            this.pendingUpgradeEffects++;
            return;
        }
        const effect = instantiate(this.upgradePrefab);
        effect.parent = this.player;
        effect.setPosition(0, 0);
        const skeleton = effect.getComponent(sp.Skeleton);
        const entry = skeleton?.setAnimation(0, 'sx', false);
        if (entry) skeleton!.setTrackCompleteListener(entry, () => effect.destroy());
        else effect.destroy();
    }

    private showWarn(): void {
        if (this.warnPrefabLoadFailed) return;
        if (!this.warnPrefab) {
            this.pendingWarn = true;
            return;
        }
        const warn = instantiate(this.warnPrefab);
        warn.parent = this.tempLayer;
        warn.setPosition(0, 400);
        warn.setSiblingIndex(this.tempLayer.children.length - 1);
        const opacity = warn.getComponent(UIOpacity) ?? warn.addComponent(UIOpacity);
        opacity.opacity = 255;
        tween(opacity).delay(Math.max(0, BATTLE_CONFIG.warnHoldDuration))
            .to(Math.max(0.01, BATTLE_CONFIG.warnFadeDuration), { opacity: 0 })
            .call(() => warn.destroy()).start();
    }

    private launchLeiVolley(): void {
        if (!this.running || !this.leiSkillUnlocked || this.leiPrefabLoadFailed) return;
        if (!this.leiPrefab) {
            this.pendingLeiCast = true;
            return;
        }
        const playerPosition = this.monsterRoot.getComponent(UITransform)!
            .convertToNodeSpaceAR(this.player.worldPosition);
        const distanceSquared = (target: BattleTarget): number => {
            const dx = target.node.position.x - playerPosition.x;
            const dy = target.node.position.y - playerPosition.y;
            return dx * dx + dy * dy;
        };
        const count = Math.max(0, Math.floor(BATTLE_CONFIG.leiTargetCount));
        const monsters = this.targets.filter(target => target.alive && target.kind === 'monster')
            .sort((a, b) => distanceSquared(a) - distanceSquared(b)).slice(0, count);
        for (const monster of monsters) {
            this.playLeiEffect(monster.node.worldPosition.clone());
            this.damageTarget(monster, BATTLE_CONFIG.leiDamage);
        }
    }

    private playLeiEffect(position: Vec3): void {
        const effect = instantiate(this.leiPrefab!);
        effect.parent = this.effectRoot;
        effect.setWorldPosition(position);
        const transform = effect.getComponent(UITransform);
        if (transform) {
            const offsetX = (0.5 - transform.anchorX) * transform.contentSize.width * effect.scale.x;
            effect.setPosition(effect.position.x - offsetX, effect.position.y);
        }
        const skeleton = effect.getComponent(sp.Skeleton);
        const entry = skeleton?.setAnimation(0, 'animation', false);
        if (entry) skeleton!.setTrackCompleteListener(entry, () => effect.destroy());
        else effect.destroy();
    }

    private launchFeng(): void {
        if (!this.running || !this.fengSkillUnlocked || this.fengPrefabLoadFailed) return;
        if (!this.fengPrefab) {
            this.pendingFengCast = true;
            return;
        }
        const rootTransform = this.effectRoot.getComponent(UITransform)!;
        const origin = rootTransform.convertToNodeSpaceAR(this.player.worldPosition);
        let nearest: BattleTarget | null = null;
        let nearestDistance = Infinity;
        for (const target of this.targets) {
            if (!target.alive || target.kind !== 'monster') continue;
            const position = rootTransform.convertToNodeSpaceAR(target.node.worldPosition);
            const distance = (position.x - origin.x) ** 2 + (position.y - origin.y) ** 2;
            if (distance < nearestDistance) {
                nearest = target;
                nearestDistance = distance;
            }
        }
        const targetPosition = nearest
            ? rootTransform.convertToNodeSpaceAR(nearest.node.worldPosition)
            : new Vec3(origin.x, origin.y + 1, origin.z);
        const distance = Math.hypot(targetPosition.x - origin.x, targetPosition.y - origin.y);
        const directionX = distance > 0 ? (targetPosition.x - origin.x) / distance : 0;
        const directionY = distance > 0 ? (targetPosition.y - origin.y) / distance : 1;
        const node = instantiate(this.fengPrefab);
        node.parent = this.effectRoot;
        node.setPosition(origin);
        node.getComponent(sp.Skeleton)?.setAnimation(0, 'animation', true);
        this.fengProjectiles.push({ node, directionX, directionY, age: 0,
            hitTargets: new Set<BattleTarget>() });
    }

    private updateFengs(dt: number): void {
        const rootTransform = this.effectRoot.getComponent(UITransform)!;
        const duration = Math.max(0, BATTLE_CONFIG.fengDuration);
        for (let index = this.fengProjectiles.length - 1; index >= 0; index--) {
            const feng = this.fengProjectiles[index];
            const from = feng.node.position;
            const travelTime = Math.max(0, Math.min(dt, duration - feng.age));
            const distance = BATTLE_CONFIG.fengSpeed * travelTime;
            const next = new Vec3(from.x + feng.directionX * distance,
                from.y + feng.directionY * distance, from.z);
            const lengthSquared = (next.x - from.x) ** 2 + (next.y - from.y) ** 2;
            for (const target of [...this.targets]) {
                if (!target.alive || target.kind !== 'monster' || feng.hitTargets.has(target)) continue;
                const position = rootTransform.convertToNodeSpaceAR(target.node.worldPosition);
                const fraction = lengthSquared > 0
                    ? Math.max(0, Math.min(1, ((position.x - from.x) * (next.x - from.x) +
                        (position.y - from.y) * (next.y - from.y)) / lengthSquared)) : 0;
                const dx = position.x - from.x - (next.x - from.x) * fraction;
                const dy = position.y - from.y - (next.y - from.y) * fraction;
                const hitRadius = BATTLE_CONFIG.fengHitRadius + target.radius;
                if (dx * dx + dy * dy > hitRadius * hitRadius) continue;
                feng.hitTargets.add(target);
                this.damageTarget(target, BATTLE_CONFIG.fengDamage);
            }
            feng.node.setPosition(next);
            feng.age += travelTime;
            if (feng.age >= duration) {
                feng.node.destroy();
                this.fengProjectiles.splice(index, 1);
            }
        }
    }

    private launchRadialBurst(): void {
        const count = Math.max(0, Math.floor(BATTLE_CONFIG.radialKnifeCount));
        if (!count) return;
        const baseAngle = this.radialVolleyIndex++ * Math.PI / count;
        for (let index = 0; index < count; index++) {
            const angle = baseAngle + index * Math.PI * 2 / count;
            this.spawnRadialKnife(angle);
        }
    }

    private launchPeriodicRadialVolley(): void {
        if (!this.running || !this.radialSkillUnlocked) return;
        const count = Math.max(0, Math.floor(BATTLE_CONFIG.radialBurstCount));
        if (!count) return;
        for (let index = 0; index < count; index++) {
            const delay = index * BATTLE_CONFIG.radialBurstSpacing;
            if (delay <= 0) this.launchRadialBurst();
            else this.scheduleOnce(() => {
                if (this.running) this.launchRadialBurst();
            }, delay);
        }
    }

    private spawnRadialKnife(angle: number): void {
        if (this.radialKnifePrefabLoadFailed) return;
        if (!this.radialKnifePrefab) {
            this.pendingRadialAngles.push(angle);
            return;
        }
        const origin = this.knifeRoot.getComponent(UITransform)!
            .convertToNodeSpaceAR(this.player.worldPosition);
        const node = instantiate(this.radialKnifePrefab);
        node.parent = this.knifeRoot;
        node.setPosition(origin);
        node.angle = angle * 180 / Math.PI - 90;
        const trail = new KnifeTrail(this.effectRoot, node.worldPosition);
        this.radialKnives.push({
            node, trail, directionX: Math.cos(angle), directionY: Math.sin(angle), age: 0,
        });
        this.trails.push(trail);
    }

    private updateRadialKnives(dt: number): void {
        const viewport = this.node.getComponent(UITransform)!.contentSize;
        const center = this.knifeRoot.getComponent(UITransform)!
            .convertToNodeSpaceAR(this.node.worldPosition);
        for (let index = this.radialKnives.length - 1; index >= 0; index--) {
            const knife = this.radialKnives[index];
            const from = knife.node.position;
            const step = BATTLE_CONFIG.knifeSpeed * dt;
            const next = new Vec3(from.x + knife.directionX * step,
                from.y + knife.directionY * step, from.z);
            let hitTarget: BattleTarget | null = null;
            let firstHitFraction = Infinity;
            for (const target of this.guidedTargets()) {
                const position = this.targetPositionInKnifeRoot(target);
                const dx = next.x - from.x;
                const dy = next.y - from.y;
                const lengthSquared = dx * dx + dy * dy;
                const fraction = lengthSquared > 0
                    ? Math.max(0, Math.min(1, ((position.x - from.x) * dx +
                        (position.y - from.y) * dy) / lengthSquared)) : 0;
                const nearestX = from.x + dx * fraction;
                const nearestY = from.y + dy * fraction;
                const radius = BATTLE_CONFIG.knifeHitRadius + target.radius;
                if ((position.x - nearestX) ** 2 + (position.y - nearestY) ** 2 <= radius ** 2 &&
                    fraction < firstHitFraction) {
                    hitTarget = target;
                    firstHitFraction = fraction;
                }
            }
            knife.age += dt;
            if (hitTarget) {
                knife.trail.clearNow();
                this.damageTarget(hitTarget, this.knifeDamage);
                knife.node.destroy();
                this.radialKnives.splice(index, 1);
                continue;
            }
            knife.node.setPosition(next);
            knife.trail.addPoint(knife.node.worldPosition);
            if (knife.age >= BATTLE_CONFIG.knifeLifetime ||
                Math.abs(next.x - center.x) > viewport.width / 2 + 100 ||
                Math.abs(next.y - center.y) > viewport.height / 2 + 100) {
                knife.trail.finish();
                knife.node.destroy();
                this.radialKnives.splice(index, 1);
            }
        }
    }

    private spawnOrbitKnife(): void {
        const count = Math.max(0, Math.floor(BATTLE_CONFIG.orbitKnifeCount));
        if (this.orbitKnifePrefabLoadFailed || !this.orbitKnifePrefab || this.orbitSpawnCount >= count) return;
        const wrapper = new Node('orbitKnife2');
        wrapper.layer = this.knifeRoot.layer;
        wrapper.parent = this.knifeRoot;
        const blade = instantiate(this.orbitKnifePrefab);
        blade.parent = wrapper;
        const transform = blade.getComponent(UITransform);
        const centerX = transform ? (0.5 - transform.anchorX) * transform.contentSize.width * blade.scale.x : 0;
        const centerY = transform ? (0.5 - transform.anchorY) * transform.contentSize.height * blade.scale.y : 0;
        blade.setPosition(-centerX, -centerY);
        this.orbitKnives.push({ node: wrapper, slot: this.orbitSpawnCount,
            halfLength: transform ? transform.contentSize.height * Math.abs(blade.scale.y) / 2 : 0 });
        this.orbitSpawnCount++;
    }

    private updateOrbitKnives(dt: number): void {
        if (!this.orbitSkillUnlocked) return;
        const count = Math.max(0, Math.floor(BATTLE_CONFIG.orbitKnifeCount));
        const allKnivesReady = count > 0 && this.orbitSpawnCount >= count;
        if (this.orbitKnifePrefab && this.orbitSpawnCount < count) {
            const spacing = Math.max(0.01, BATTLE_CONFIG.orbitKnifeSpawnSpacing);
            this.orbitSpawnTimer += dt;
            while (this.orbitSpawnTimer >= spacing && this.orbitSpawnCount < count) {
                this.orbitSpawnTimer -= spacing;
                this.spawnOrbitKnife();
            }
        }
        // 等最后一把剑生成后，下一帧才开始旋转。
        if (allKnivesReady) this.orbitAngle += BATTLE_CONFIG.orbitKnifeAngularSpeed * Math.PI / 180 * dt;
        const center = this.knifeRoot.getComponent(UITransform)!
            .convertToNodeSpaceAR(this.player.worldPosition);
        center.y += BATTLE_CONFIG.orbitKnifeCenterOffsetY;
        const radius = BATTLE_CONFIG.orbitKnifeRadius;
        for (const knife of this.orbitKnives) {
            const angle = this.orbitAngle + knife.slot * Math.PI * 2 / Math.max(1, count);
            const x = center.x + Math.cos(angle) * radius;
            const y = center.y + Math.sin(angle) * radius;
            knife.node.setPosition(x, y);
            // 预制体剑尖朝本地 +Y；剑柄朝角色，剑尖沿半径向外。
            knife.node.angle = angle * 180 / Math.PI - 90;
            const axisX = Math.cos(angle);
            const axisY = Math.sin(angle);
            for (const target of [...this.targets]) {
                if (!target.alive || this.time - (target.lastOrbitHitTime ?? -Infinity) < BATTLE_CONFIG.orbitKnifeHitInterval) continue;
                const position = this.targetPositionInKnifeRoot(target);
                const along = Math.max(-knife.halfLength, Math.min(knife.halfLength,
                    (position.x - x) * axisX + (position.y - y) * axisY));
                const dx = position.x - x - along * axisX;
                const dy = position.y - y - along * axisY;
                if (dx * dx + dy * dy > (target.radius + BATTLE_CONFIG.orbitKnifeHitWidth) ** 2) continue;
                target.lastOrbitHitTime = this.time;
                this.damageTarget(target, BATTLE_CONFIG.orbitKnifeDamage);
            }
        }
    }

    private spawnSkillDrop(position: Vec3, skillId: string): void {
        const drop = this.makeNode(this.dropRoot, `skill_${skillId}`, 40, 40);
        drop.setPosition(position);
        const g = drop.addComponent(Graphics);
        g.fillColor = new Color(255, 211, 66, 255);
        g.circle(0, 0, 20);
        g.fill();
        const playerPosition = this.dropRoot.getComponent(UITransform)!
            .convertToNodeSpaceAR(this.player.worldPosition);
        tween(drop)
            .to(0.5, { position: playerPosition }, { easing: 'quadIn' })
            .call(() => {
                drop.destroy();
                this.skills.set(skillId, (this.skills.get(skillId) ?? 0) + 1);
            })
            .start();
    }

    private removeTarget(target: BattleTarget): void {
        const index = this.targets.indexOf(target);
        if (index >= 0) this.targets.splice(index, 1);
    }

}
