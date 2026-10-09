import { Color, Graphics, Node, UITransform, Vec3 } from 'cc';
import { BATTLE_CONFIG } from './BattleConfig';

interface TrailPoint {
    x: number;
    y: number;
}

/** 在独立的画面特效层记录飞剑真实轨迹，按飞剑类型画白色或红色轨迹。 */
export class KnifeTrail {
    private readonly node: Node;
    private readonly graphics: Graphics;
    private readonly rootTransform: UITransform;
    private readonly points: TrailPoint[] = [];
    private finished = false;
    private cancelled = false;
    private fadeTime = 0;
    private readonly color: 'white' | 'red';

    constructor(effectRoot: Node, startWorldPosition: Readonly<Vec3>, color: 'white' | 'red' = 'white') {
        this.color = color;
        this.rootTransform = effectRoot.getComponent(UITransform)!;
        this.node = new Node('knifeTrail');
        this.node.layer = effectRoot.layer;
        this.node.parent = effectRoot;
        this.node.addComponent(UITransform).setContentSize(this.rootTransform.contentSize);
        this.graphics = this.node.addComponent(Graphics);
        this.graphics.lineCap = Graphics.LineCap.ROUND;
        this.addPoint(startWorldPosition);
    }

    public addPoint(worldPosition: Readonly<Vec3>): void {
        if (this.finished) return;
        const local = this.rootTransform.convertToNodeSpaceAR(worldPosition as Vec3);
        const last = this.points[this.points.length - 1];
        if (last && Math.hypot(last.x - local.x, last.y - local.y) < 1) return;
        this.points.push({ x: local.x, y: local.y });
        this.trimToLength();
    }

    public finish(): void {
        this.finished = true;
    }

    /** 命中时立即清掉白线；Graphics 先清空，节点随后由引擎销毁。 */
    public clearNow(): void {
        if (this.cancelled) return;
        this.cancelled = true;
        this.graphics.clear();
        this.points.length = 0;
        this.node.destroy();
    }

    /** 返回 false 表示轨迹已完全消失，可以从更新列表移除。 */
    public update(dt: number): boolean {
        if (this.cancelled) return false;
        if (this.finished) this.fadeTime += dt;
        const fadeDuration = Math.max(0.01, BATTLE_CONFIG.knifeTrailFadeDuration);
        if (this.finished && this.fadeTime >= fadeDuration) {
            this.node.destroy();
            return false;
        }
        const fade = this.finished ? 1 - this.fadeTime / fadeDuration : 1;
        this.graphics.clear();
        // 先画柔光，再叠加清晰主线；两层都从剑尾到剑尖逐渐变亮。
        const glow = this.color === 'red' ? new Color(255, 95, 65) : new Color(210, 235, 255);
        const core = this.color === 'red' ? new Color(255, 35, 35) : new Color(255, 255, 255);
        this.drawSegments(BATTLE_CONFIG.knifeTrailWidth * 2.8, 72, glow, fade);
        this.drawSegments(BATTLE_CONFIG.knifeTrailWidth, 255, core, fade);
        return true;
    }

    private trimToLength(): void {
        let remaining = Math.max(0, BATTLE_CONFIG.knifeTrailLength);
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

    private drawSegments(maxWidth: number, maxAlpha: number, color: Color, fade: number): void {
        const maxLength = Math.max(0.01, BATTLE_CONFIG.knifeTrailLength);
        let distanceFromHead = 0;
        for (let index = this.points.length - 1; index > 0; index--) {
            const previous = this.points[index - 1];
            const current = this.points[index];
            const segment = Math.hypot(current.x - previous.x, current.y - previous.y);
            const strength = Math.max(0, 1 - (distanceFromHead + segment / 2) / maxLength) * fade;
            this.graphics.lineWidth = Math.max(0.75, maxWidth * strength);
            color.a = Math.round(maxAlpha * strength);
            this.graphics.strokeColor = color;
            this.graphics.moveTo(previous.x, previous.y);
            this.graphics.lineTo(current.x, current.y);
            this.graphics.stroke();
            distanceFromHead += segment;
        }
    }
}
