import {
    _decorator, Button, Color, Component, EventTouch, Graphics, instantiate, Label, Node,
    sp, Sprite, Tween, tween, UIOpacity, UITransform, Vec2, Vec3,
} from 'cc';
import { BACKPACK_CONFIG, BackpackItemConfig, DRAG_GUIDE_CONFIG } from './BackpackConfig';
import { AudioManager } from './AudioManager';
import { BattleDemo } from './BattleDemo';
import { GridItem, GridPosition, InventoryGrid } from './InventoryGrid';
import { BATTLE_PREFABS } from './ResourceConfig';
import { ResourceManager } from './ResourceManager';

const { ccclass } = _decorator;
const GRID_COLUMNS = BACKPACK_CONFIG.grid.columns;
const GRID_ROWS = BACKPACK_CONFIG.grid.rows;
const CELL = BACKPACK_CONFIG.grid.cellSize;
const GAP = BACKPACK_CONFIG.grid.gap;
const STEP = CELL + GAP;
const GRID_WIDTH = GRID_COLUMNS * CELL + (GRID_COLUMNS - 1) * GAP;
const GRID_HEIGHT = GRID_ROWS * CELL + (GRID_ROWS - 1) * GAP;
const GRID_LEFT = -GRID_WIDTH / 2;
const GRID_TOP = BACKPACK_CONFIG.grid.top;
const TRAY_SIZE = 3;
const ICON_CELL_SIZE = 95; // 图标每个占用格子的目标尺寸
const MERGE_EFFECT_OFFSET_Y = -65; // 合成特效相对目标格子中心的纵向偏移

interface DraggableItem extends GridItem {
    kind: string;
    level: number;
    node: Node;
    home: Vec3;
    originalHome: Vec3;
    homeParent: Node;
    dragOffset: Vec2;
}

@ccclass('BackpackDemo')
export class BackpackDemo extends Component {
    private readonly inventory = new InventoryGrid(GRID_COLUMNS, GRID_ROWS);
    private readonly items: DraggableItem[] = [];
    private templatesRoot: Node | null = null;
    private battleRoot: Node | null = null;
    private smallTraySlots: Vec3[] = [];
    private refreshButtonNode: Node | null = null;
    private countdownNode: Node | null = null;
    private countdownLabel: Label | null = null;
    private mergeEffectTemplate: Node | null = null;
    private countdownValue = 0;
    private countdownStarted = false;
    private nextItemId = 1;
    private gridRoot: Node | null = null;
    private preview: Graphics | null = null;
    private dragging: DraggableItem | null = null;
    private candidate: GridPosition | null = null;
    private mergeTarget: DraggableItem | null = null;
    private dragGuideRoot: Node | null = null;
    private dragGuidePointer: Node | null = null;
    private dragGuideGhost: Node | null = null;
    private dragGuideItem: DraggableItem | null = null;
    private dragGuideTime = 0;
    private dragGuideStartedMoving = false;
    private dragGuideStart = new Vec3();
    private dragGuideEnd = new Vec3();

    onLoad(): void {
        AudioManager.getOrCreate(this.node).startBgm();
        void ResourceManager.preloadPrefabs(BATTLE_PREFABS).catch(error =>
            console.error('BackpackDemo: 预加载战斗资源失败。', error));
        void Promise.all(['role1', 'role2', 'role3'].map(name => ResourceManager.loadBundlePrefab('role', name)))
            .catch(error => console.error('BackpackDemo: 预加载角色资源失败。', error));
        const content = this.node.getChildByName('Node');
        const background = content?.getChildByName('bgNode');
        const templates = content?.getChildByName('items');
        this.gridRoot = content?.getChildByName('gzNode') ?? null;
        if (!background || !templates || !this.gridRoot) {
            console.error('BackpackDemo: Canvas/Node 下需要 bgNode、items 和 gzNode。');
            return;
        }
        this.templatesRoot = templates;
        this.mergeEffectTemplate = content?.getChildByName('shang') ?? null;
        if (this.mergeEffectTemplate) this.mergeEffectTemplate.active = false;
        this.battleRoot = this.node.getChildByName('gameNode');
        if (this.battleRoot) this.battleRoot.active = false;
        this.countdownNode = content?.getChildByName('num') ?? null;
        this.countdownLabel = this.countdownNode?.getChildByName('Label')?.getComponent(Label) ?? null;
        if (this.countdownNode) this.countdownNode.active = false;
        const templateNodes = templates.children.filter(child => /^icon\d+$/.test(child.name));
        this.smallTraySlots = [...templateNodes]
            .sort((a, b) => a.position.x - b.position.x)
            .slice(0, 2)
            .map(template => template.position.clone());
        for (const template of templateNodes) {
            template.active = false;
        }
        this.drawBackground(background);
        this.drawGrid();
        this.createPreview();
        this.createBatch(false);
        void this.createDragGuide(content!);
        const refreshNode = content?.getChildByName('Buttons')?.getChildByName('refresh');
        if (refreshNode?.getComponent(Button)) {
            this.refreshButtonNode = refreshNode;
            refreshNode.on(Button.EventType.CLICK, this.refreshItems, this);
        }
    }

    onDestroy(): void {
        this.stopDragGuide();
        this.unschedule(this.advanceCountdown);
        const countdownNode = this.countdownLabel?.node;
        if (countdownNode?.isValid) Tween.stopAllByTarget(countdownNode);
    }

    private async createDragGuide(content: Node): Promise<void> {
        try {
            const prefab = await ResourceManager.loadPrefab('yindao');
            if (!this.node.isValid || !content.isValid || this.countdownStarted) return;
            const root = new Node('dragGuide');
            root.layer = content.layer;
            root.parent = content;
            root.addComponent(UITransform);
            root.addComponent(UIOpacity);
            this.dragGuideRoot = root;
            const pointer = instantiate(prefab);
            pointer.parent = root;
            pointer.layer = content.layer;
            this.dragGuidePointer = pointer;
            this.restartDragGuide();
        } catch (error) {
            if (this.node.isValid) console.error('BackpackDemo: 加载拖动引导失败。', error);
        }
    }

    private stopDragGuide(): void {
        if (this.dragGuideRoot?.isValid) this.dragGuideRoot.active = false;
        this.dragGuideItem = null;
        if (this.dragGuideGhost?.isValid) {
            this.dragGuideGhost.active = false;
            this.dragGuideGhost.destroy();
        }
        this.dragGuideGhost = null;
    }

    private restartDragGuide(): void {
        this.stopDragGuide();
        const root = this.dragGuideRoot;
        if (!root?.isValid || !this.dragGuidePointer || this.countdownStarted || this.dragging) return;
        const item = this.items.find(candidate => candidate.kind === 'icon1'
            && candidate.node.isValid && candidate.node.parent === candidate.homeParent);
        if (!item || !this.gridRoot) return;
        this.dragGuideItem = item;
        this.dragGuideTime = 0;
        this.dragGuideStartedMoving = false;
        const ghost = instantiate(item.node);
        ghost.name = 'guideIcon1';
        ghost.parent = root;
        ghost.setSiblingIndex(0);
        // 保留物品的世界缩放，演示副本不注册拖动事件，也不加入背包数据。
        ghost.setWorldScale(item.node.worldScale);
        ghost.setWorldRotation(item.node.worldRotation);
        (ghost.getComponent(UIOpacity) ?? ghost.addComponent(UIOpacity)).opacity = DRAG_GUIDE_CONFIG.ghostOpacity;
        ghost.active = false;
        this.dragGuideGhost = ghost;
        root.active = true;
        root.setSiblingIndex(root.parent!.children.length - 1);
        root.getComponent(UIOpacity)!.opacity = 255;
        const skeleton = this.dragGuidePointer.getComponent(sp.Skeleton);
        if (skeleton?.findAnimation('yindao_dianji')) {
            skeleton.timeScale = 1;
            skeleton.setAnimation(0, 'yindao_dianji', false);
        }
        this.updateDragGuide(0);
    }

    update(dt: number): void {
        this.updateDragGuide(dt);
    }

    private updateDragGuide(dt: number): void {
        const root = this.dragGuideRoot;
        const pointer = this.dragGuidePointer;
        const item = this.dragGuideItem;
        if (!root?.active || !pointer || !item || !this.gridRoot) return;
        if (this.countdownStarted || this.dragging || !item.node.isValid
            || item.node.parent !== item.homeParent) {
            this.stopDragGuide();
            return;
        }
        const config = DRAG_GUIDE_CONFIG;
        const moveStart = config.clickDuration + config.holdDuration;
        const fadeStart = moveStart + config.dragDuration + config.releaseDuration;
        const cycleEnd = fadeStart + config.fadeDuration + config.repeatDelay;
        this.dragGuideTime += dt;
        if (this.dragGuideTime >= cycleEnd) {
            this.restartDragGuide();
            return;
        }
        const transform = root.getComponent(UITransform)!;
        if (!this.dragGuideStartedMoving) {
            this.dragGuideStart = transform.convertToNodeSpaceAR(item.node.worldPosition);
            const center = this.cellCenterInGrid(item, Math.floor(GRID_COLUMNS / 2), Math.floor(GRID_ROWS / 2));
            const worldCenter = this.gridRoot.getComponent(UITransform)!.convertToWorldSpaceAR(center);
            this.dragGuideEnd = transform.convertToNodeSpaceAR(worldCenter);
        }
        if (this.dragGuideTime >= config.clickDuration) {
            const skeleton = pointer.getComponent(sp.Skeleton);
            if (skeleton) skeleton.timeScale = 0;
        }
        this.dragGuideStartedMoving = this.dragGuideTime >= moveStart;
        const t = Math.min(1, Math.max(0, (this.dragGuideTime - moveStart) / config.dragDuration));
        const eased = t * t * (3 - 2 * t);
        const start = this.dragGuideStart;
        const end = this.dragGuideEnd;
        const controlX = (start.x + end.x) / 2 + config.curveOffsetX;
        const controlY = (start.y + end.y) / 2;
        const inverse = 1 - eased;
        const x = inverse * inverse * start.x + 2 * inverse * eased * controlX + eased * eased * end.x;
        const y = inverse * inverse * start.y + 2 * inverse * eased * controlY + eased * eased * end.y;
        pointer.setPosition(x + config.pointerOffsetX, y + config.pointerOffsetY, 0);
        if (this.dragGuideGhost) {
            this.dragGuideGhost.active = this.dragGuideStartedMoving;
            this.dragGuideGhost.setPosition(x, y, 0);
        }
        root.getComponent(UIOpacity)!.opacity = 255 * (1 - Math.min(1,
            Math.max(0, (this.dragGuideTime - fadeStart) / config.fadeDuration)));
    }

    private drawBackground(background: Node): void {
        // bgNode 自身或其直接子节点有图片时，交给图片显示背景。
        if (background.getComponent(Sprite)?.spriteFrame ||
            background.children.some(child => !!child.getComponent(Sprite)?.spriteFrame)) return;

        const canvasTransform = this.node.getComponent(UITransform)!;
        const backgroundTransform = background.getComponent(UITransform)!;
        const canvasSize = canvasTransform.contentSize;
        const anchor = canvasTransform.anchorPoint;
        const bottomLeft = backgroundTransform.convertToNodeSpaceAR(
            canvasTransform.convertToWorldSpaceAR(new Vec3(-canvasSize.width * anchor.x, -canvasSize.height * anchor.y)),
        );
        const topRight = backgroundTransform.convertToNodeSpaceAR(
            canvasTransform.convertToWorldSpaceAR(new Vec3(canvasSize.width * (1 - anchor.x), canvasSize.height * (1 - anchor.y))),
        );
        const graphics = background.getComponent(Graphics) ?? background.addComponent(Graphics);
        graphics.clear();
        graphics.fillColor = new Color(55, 155, 220, 255);
        graphics.rect(bottomLeft.x, bottomLeft.y, topRight.x - bottomLeft.x, topRight.y - bottomLeft.y);
        graphics.fill();
    }

    private drawGrid(): void {
        const template = this.gridRoot!.getChildByName('gez');
        if (!template) {
            console.error('BackpackDemo: gzNode 下需要格子模板 gez。');
            return;
        }
        template.active = false;
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLUMNS; col++) {
                const cell = instantiate(template);
                cell.name = `格子_${row}_${col}`;
                cell.parent = this.gridRoot;
                cell.setPosition(...this.cellCenter(col, row), 0);
                cell.active = true;
            }
        }
    }

    private createPreview(): void {
        const node = new Node('放置预览');
        node.layer = this.gridRoot!.layer;
        node.parent = this.gridRoot;
        this.preview = node.addComponent(Graphics);
    }

    private createBatch(refill: boolean): void {
        const templates = this.templatesRoot!;
        const firstTypes = BACKPACK_CONFIG.items.filter(def =>
            def.templateName === 'icon1' || def.templateName === 'icon2');
        const thirdTypes = BACKPACK_CONFIG.items.filter(def =>
            def.templateName === 'icon3' || def.templateName === 'icon4');
        if (!firstTypes.length || !thirdTypes.length) {
            console.error('BackpackDemo: items 需要配置 icon1/icon2 和 icon3/icon4 各至少一个。');
            return;
        }
        const pick = (pool: BackpackItemConfig[]): BackpackItemConfig =>
            pool[Math.floor(Math.random() * pool.length)];
        const definitions = refill
            ? [pick(firstTypes), pick(firstTypes), pick(thirdTypes)]
            : [firstTypes[0], firstTypes[1] ?? firstTypes[0], thirdTypes[0]];
        definitions.forEach((def, index) => {
            // 前两个使用各自槽位；第三个使用 icon3/icon4 模板自身的位置。
            const slot = index < 2
                ? this.smallTraySlots[index]
                : templates.getChildByName(def.templateName)?.position;
            this.createItem(def, templates, slot);
        });
    }

    private createItem(def: BackpackItemConfig, templates: Node, slot?: Vec3): void {
        const template = templates.getChildByName(def.templateName);
        if (!template) {
            console.error(`BackpackDemo: 找不到物品模板 ${def.templateName}`);
            return;
        }

        const clone = instantiate(template);
        clone.name = `${def.templateName}_拖动物品`;
        clone.parent = templates;
        clone.setPosition(slot ?? template.position);
        clone.active = true;

        const transform = clone.getComponent(UITransform)!;
        const size = transform.contentSize;
        const footprintWidth = def.width * ICON_CELL_SIZE + (def.width - 1) * GAP;
        const footprintHeight = def.height * ICON_CELL_SIZE + (def.height - 1) * GAP;
        // 模板本身可能已旋转（icon3 为 -90°），按屏幕上的宽高适配占格尺寸。
        const radians = clone.angle * Math.PI / 180;
        const cosine = Math.abs(Math.cos(radians));
        const sine = Math.abs(Math.sin(radians));
        const visualWidth = size.width * cosine + size.height * sine;
        const visualHeight = size.width * sine + size.height * cosine;
        const fit = Math.min(footprintWidth / visualWidth, footprintHeight / visualHeight);
        clone.setScale(clone.scale.x * fit, clone.scale.y * fit, clone.scale.z);

        const item: DraggableItem = {
            id: `${def.id}_${this.nextItemId++}`, kind: def.id, level: 1,
            width: def.width, height: def.height,
            node: clone, home: clone.position.clone(), originalHome: clone.position.clone(),
            homeParent: templates,
            dragOffset: new Vec2(),
        };
        this.items.push(item);
        this.updateItemLabel(item);
        clone.on(Node.EventType.TOUCH_START, (event: EventTouch) => this.startDrag(item, event), this);
        clone.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => this.moveDrag(item, event), this);
        clone.on(Node.EventType.TOUCH_END, (event: EventTouch) => this.endDrag(item, event), this);
        clone.on(Node.EventType.TOUCH_CANCEL, (event: EventTouch) => this.endDrag(item, event), this);
    }

    private updateItemLabel(item: DraggableItem): void {
        const label = item.node.getChildByName('Label')?.getComponent(Label);
        if (label) label.string = `Lv.${item.level}`;
    }

    private startDrag(item: DraggableItem, event: EventTouch): void {
        this.stopDragGuide();
        const audio = AudioManager.getOrCreate(this.node);
        audio.startBgm();
        audio.playEffect('Click');
        this.dragging = item;
        const fromTray = item.node.parent === item.homeParent;
        Tween.stopAllByTarget(item.node);
        const world = item.node.worldPosition.clone();
        item.node.parent = this.node;
        item.node.setWorldPosition(world);
        if (fromTray) this.layoutTray();
        const pointer = this.toCanvas(event);
        item.dragOffset.set(item.node.position.x - pointer.x, item.node.position.y - pointer.y);
        // Canvas 层级列表末尾的节点绘制在最上方，避免被其他 UI 遮挡。
        item.node.setSiblingIndex(this.node.children.length - 1);
        this.updateCandidate(item);
    }

    private moveDrag(item: DraggableItem, event: EventTouch): void {
        if (this.dragging !== item) return;
        const pointer = this.toCanvas(event);
        item.node.setPosition(pointer.x + item.dragOffset.x, pointer.y + item.dragOffset.y, 0);
        this.updateCandidate(item);
    }

    private endDrag(item: DraggableItem, event: EventTouch): void {
        if (this.dragging !== item) return;
        this.moveDrag(item, event);
        const merged = this.mergeTarget !== null;
        if (this.mergeTarget) {
            this.mergeItems(item, this.mergeTarget);
        } else if (this.candidate && this.inventory.place(item, this.candidate.col, this.candidate.row)) {
            item.node.parent = this.gridRoot;
            item.node.setPosition(this.cellCenterInGrid(item, this.candidate.col, this.candidate.row));
            if (item.kind === 'icon1' || item.kind === 'icon2') this.startCountdown();
        } else {
            const previous = this.inventory.getPosition(item.id);
            item.node.parent = previous ? this.gridRoot : item.homeParent;
            item.node.setPosition(previous
                ? this.cellCenterInGrid(item, previous.col, previous.row)
                : item.home);
        }
        if (!merged && item.node.parent === item.homeParent) this.layoutTray();
        this.dragging = null;
        this.candidate = null;
        this.mergeTarget = null;
        this.preview?.clear();
        if (this.items.every(current => current.node.parent !== current.homeParent)) {
            this.createBatch(true);
        }
        this.restartDragGuide();
    }

    private mergeItems(source: DraggableItem, target: DraggableItem): void {
        this.inventory.remove(source.id);
        target.level = Math.max(target.level, source.level) + 1;
        this.updateItemLabel(target);
        this.playMergeEffect(target.node);
        source.node.active = false;
        source.node.destroy();
        this.items.splice(this.items.indexOf(source), 1);
    }

    private playMergeEffect(target: Node): void {
        if (!this.mergeEffectTemplate || !this.gridRoot) return;
        const effect = instantiate(this.mergeEffectTemplate);
        effect.parent = this.gridRoot;
        const position = target.position.clone();
        position.y += MERGE_EFFECT_OFFSET_Y;
        effect.setPosition(position);
        effect.setSiblingIndex(this.gridRoot.children.length - 1);
        effect.active = true;
        const skeleton = effect.getComponent(sp.Skeleton);
        const entry = skeleton?.setAnimation(0, 'animation', false);
        if (entry) skeleton!.setTrackCompleteListener(entry, () => effect.destroy());
        else effect.destroy();
    }

    private startCountdown(): void {
        if (this.countdownStarted || !this.countdownNode || !this.countdownLabel) return;
        this.countdownStarted = true;
        this.stopDragGuide();
        this.countdownValue = 3;
        this.countdownNode.active = true;
        this.showCountdownNumber();
        this.schedule(this.advanceCountdown, 1);
    }

    private advanceCountdown(): void {
        this.countdownValue--;
        if (this.countdownValue === 0) {
            this.unschedule(this.advanceCountdown);
            if (this.countdownLabel) {
                Tween.stopAllByTarget(this.countdownLabel.node);
                this.countdownLabel.string = '0';
                this.countdownLabel.node.setScale(1, 1, 1);
            }
            if (this.countdownNode) this.countdownNode.active = false;
            this.enterBattle();
            return;
        }
        this.showCountdownNumber();
    }

    private enterBattle(): void {
        if (!this.battleRoot) {
            console.error('BackpackDemo: Canvas 下需要 gameNode。');
            return;
        }
        const highestIcon1Level = this.items.reduce((highest, item) =>
            item.kind === 'icon1' && this.inventory.getPosition(item.id)
                ? Math.max(highest, item.level)
                : highest, 0);
        this.node.getChildByName('Node')!.active = false;
        this.battleRoot.active = true;
        const battle = this.battleRoot.getComponent(BattleDemo) ?? this.battleRoot.addComponent(BattleDemo);
        battle.startBattle(highestIcon1Level);
    }

    private showCountdownNumber(): void {
        const label = this.countdownLabel!;
        Tween.stopAllByTarget(label.node);
        label.string = String(this.countdownValue);
        label.node.setScale(5, 5, 1);
        tween(label.node).to(0.5, { scale: new Vec3(1, 1, 1) }).start();
    }

    private layoutTray(): void {
        const remaining = this.items
            .filter(item => item.node.parent === item.homeParent)
            .sort((a, b) => a.originalHome.x - b.originalHome.x);
        remaining.forEach((item, index) => {
            const target = item.originalHome.clone();
            if (remaining.length !== TRAY_SIZE) {
                target.x = (index - (remaining.length - 1) / 2) * BACKPACK_CONFIG.traySpacing;
            }
            this.tweenTrayItem(item, target);
        });
    }

    private tweenTrayItem(item: DraggableItem, target: Vec3): void {
        item.home = target;
        Tween.stopAllByTarget(item.node);
        tween(item.node).to(0.1, { position: target }).start();
    }

    private updateCandidate(item: DraggableItem): void {
        this.candidate = null;
        this.mergeTarget = null;
        this.preview?.clear();
        const center = this.gridRoot!.getComponent(UITransform)!.convertToNodeSpaceAR(item.node.worldPosition);
        const nearGrid = center.x >= GRID_LEFT - CELL && center.x <= GRID_LEFT + GRID_WIDTH + CELL &&
            center.y <= GRID_TOP + CELL && center.y >= GRID_TOP - GRID_HEIGHT - CELL;
        if (!nearGrid) return;

        const col = Math.round((center.x - GRID_LEFT - item.width * STEP / 2 + GAP / 2) / STEP);
        const row = Math.round((GRID_TOP - center.y - item.height * STEP / 2 + GAP / 2) / STEP);
        const canPlace = this.inventory.canPlace(item, col, row);
        if (canPlace) this.candidate = { col, row };
        else this.mergeTarget = this.getMergeTarget(item, col, row);
        this.drawPreview(item, col, row, canPlace || this.mergeTarget !== null);
    }

    private getMergeTarget(source: DraggableItem, col: number, row: number): DraggableItem | null {
        const ownerId = this.inventory.getItemAt(col, row);
        const target = this.items.find(item => item.id === ownerId);
        const position = target && this.inventory.getPosition(target.id);
        if (!target || target === source || !position || position.col !== col || position.row !== row ||
            target.kind !== source.kind ||
            target.width !== source.width || target.height !== source.height) return null;
        return target;
    }

    private drawPreview(item: DraggableItem, col: number, row: number, valid: boolean): void {
        if (!this.preview) return;
        this.preview.fillColor = valid ? new Color(48, 207, 107, 145) : new Color(234, 67, 67, 160);
        for (let dy = 0; dy < item.height; dy++) {
            for (let dx = 0; dx < item.width; dx++) {
                const x = col + dx;
                const y = row + dy;
                if (x < 0 || x >= GRID_COLUMNS || y < 0 || y >= GRID_ROWS) continue;
                const [cx, cy] = this.cellCenter(x, y);
                this.preview.roundRect(cx - CELL / 2 + 3, cy - CELL / 2 + 3, CELL - 6, CELL - 6, 10);
                this.preview.fill();
            }
        }
    }

    private toCanvas(event: EventTouch): Vec3 {
        const point = event.getUILocation();
        return this.node.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(point.x, point.y, 0));
    }

    private cellCenter(col: number, row: number): [number, number] {
        return [GRID_LEFT + CELL / 2 + col * STEP, GRID_TOP - CELL / 2 - row * STEP];
    }

    private cellCenterInGrid(item: GridItem, col: number, row: number): Vec3 {
        const [firstX, firstY] = this.cellCenter(col, row);
        const x = firstX + (item.width - 1) * STEP / 2;
        const y = firstY - (item.height - 1) * STEP / 2;
        return new Vec3(x, y, 0);
    }

    /** 刷新按钮调用：只替换下方物品，格子里已放置的物品保留。 */
    public refreshItems(): void {
        if (this.dragging || !this.templatesRoot) return;
        this.stopDragGuide();
        AudioManager.getOrCreate(this.node).playEffect('Click');
        this.preview?.clear();
        this.candidate = null;
        this.mergeTarget = null;
        for (let index = this.items.length - 1; index >= 0; index--) {
            const item = this.items[index];
            if (item.node.parent !== item.homeParent) continue;
            Tween.stopAllByTarget(item.node);
            item.node.active = false;
            item.node.destroy();
            this.items.splice(index, 1);
        }
        this.createBatch(true);
        this.restartDragGuide();
    }

    /** 兼容之前可能已绑定到按钮的旧方法名。 */
    public resetItems(): void {
        this.refreshItems();
    }
}
