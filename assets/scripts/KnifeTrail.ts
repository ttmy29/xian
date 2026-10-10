import { Color, Graphics, Node, UITransform, Vec3 } from 'cc';
import { BATTLE_CONFIG } from './BattleConfig';

interface TrailPoint { x: number; y: number }

/** 所有飞剑共用两层 Graphics，避免每条轨迹都产生绘制节点。 */
export class KnifeTrail {
    private readonly points: TrailPoint[] = [];
    private finished = false;
    private cancelled = false;
    private fadeTime = 0;
    private readonly rootTransform: UITransform;
    private static readonly renderers = new WeakMap<Node, { white: Graphics; red: Graphics }>();
    private static readonly whiteGlow = new Color(210, 235, 255);
    private static readonly whiteCore = new Color(255, 255, 255);
    private static readonly redGlow = new Color(255, 95, 65);
    private static readonly redCore = new Color(255, 35, 35);

    constructor(effectRoot: Node, startWorldPosition: Readonly<Vec3>,
        private readonly color: 'white' | 'red' = 'white') {
        this.rootTransform = effectRoot.getComponent(UITransform)!;
        this.addPoint(startWorldPosition);
    }

    public addPoint(worldPosition: Readonly<Vec3>): void {
        if (this.finished || this.cancelled) return;
        const local = this.rootTransform.convertToNodeSpaceAR(worldPosition as Vec3);
        const last = this.points[this.points.length - 1];
        // 飞行路径仍按真实位置记录，但相邻不足 6 像素的点不必单独描画。
        if (last && Math.hypot(last.x - local.x, last.y - local.y) < 6) return;
        this.points.push({ x: local.x, y: local.y });
        this.trimToLength();
    }

    public finish(): void { this.finished = true; }

    public clearNow(): void {
        this.cancelled = true;
        this.points.length = 0;
    }

    /** 返回 false 表示轨迹已完全消失。 */
    public update(dt: number): boolean {
        if (this.cancelled) return false;
        if (this.finished) this.fadeTime += dt;
        return !this.finished || this.fadeTime < Math.max(0.01, BATTLE_CONFIG.knife.knifeTrailFadeDuration);
    }

    public static render(effectRoot: Node, trails: readonly KnifeTrail[]): void {
        let renderer = this.renderers.get(effectRoot);
        if (!renderer) {
            const makeGraphics = (name: string): Graphics => {
                const node = new Node(name);
                node.layer = effectRoot.layer;
                node.parent = effectRoot;
                node.addComponent(UITransform).setContentSize(effectRoot.getComponent(UITransform)!.contentSize);
                const graphics = node.addComponent(Graphics);
                graphics.lineCap = Graphics.LineCap.ROUND;
                return graphics;
            };
            renderer = { white: makeGraphics('knifeTrailsWhite'), red: makeGraphics('knifeTrailsRed') };
            this.renderers.set(effectRoot, renderer);
        }
        renderer.white.clear();
        renderer.red.clear();
        for (const trail of trails) {
            const graphics = trail.color === 'red' ? renderer.red : renderer.white;
            const fade = trail.finished
                ? 1 - trail.fadeTime / Math.max(0.01, BATTLE_CONFIG.knife.knifeTrailFadeDuration) : 1;
            trail.drawSegments(graphics, BATTLE_CONFIG.knife.knifeTrailWidth * 2.8, 72,
                trail.color === 'red' ? this.redGlow : this.whiteGlow, fade);
            trail.drawSegments(graphics, BATTLE_CONFIG.knife.knifeTrailWidth, 255,
                trail.color === 'red' ? this.redCore : this.whiteCore, fade);
        }
    }

    private trimToLength(): void {
        let remaining = Math.max(0, BATTLE_CONFIG.knife.knifeTrailLength);
        for (let index = this.points.length - 1; index > 0; index--) {
            const tail = this.points[index - 1];
            const head = this.points[index];
            const segment = Math.hypot(head.x - tail.x, head.y - tail.y);
            if (segment <= remaining) {
                remaining -= segment;
                continue;
            }
            const ratio = segment > 0 ? remaining / segment : 0;
            tail.x = head.x + (tail.x - head.x) * ratio;
            tail.y = head.y + (tail.y - head.y) * ratio;
            this.points.splice(0, index - 1);
            return;
        }
    }

    private drawSegments(graphics: Graphics, maxWidth: number, maxAlpha: number,
        color: Color, fade: number): void {
        const maxLength = Math.max(0.01, BATTLE_CONFIG.knife.knifeTrailLength);
        let distanceFromHead = 0;
        for (let index = this.points.length - 1; index > 0; index--) {
            const previous = this.points[index - 1];
            const current = this.points[index];
            const segment = Math.hypot(current.x - previous.x, current.y - previous.y);
            const strength = Math.max(0, 1 - (distanceFromHead + segment / 2) / maxLength) * fade;
            graphics.lineWidth = Math.max(0.75, maxWidth * strength);
            color.a = Math.round(maxAlpha * strength);
            graphics.strokeColor = color;
            graphics.moveTo(previous.x, previous.y);
            graphics.lineTo(current.x, current.y);
            graphics.stroke();
            distanceFromHead += segment;
        }
    }
}
