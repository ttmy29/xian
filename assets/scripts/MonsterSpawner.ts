import { Prefab, Size, UITransform, Vec3 } from 'cc';
import { BATTLE_CONFIG } from './BattleConfig';

export interface MonsterSpawnRequest {
    template: Prefab;
    x: number;
    y: number;
}

/** 只决定每波怪物的模板和屏内位置；节点创建与战斗状态由 BattleDemo 管理。 */
export class MonsterSpawner {
    public planWave(viewport: Readonly<Size>, templates: readonly Prefab[], occupied: readonly Vec3[]): MonsterSpawnRequest[] {
        const count = Math.min(BATTLE_CONFIG.monster.perWave, BATTLE_CONFIG.monster.maxAlive - occupied.length);
        if (count <= 0 || !templates.length) return [];

        const requests: MonsterSpawnRequest[] = [];
        const firstSide = Math.floor(Math.random() * 4);
        for (let index = 0; index < count; index++) {
            const template = templates[Math.floor(Math.random() * templates.length)];
            const transform = template.data.getComponent(UITransform);
            if (!transform) continue;

            const scale = template.data.scale;
            // Spine 的锚点靠近脚部，使用较大一侧的视觉范围保证怪物完整位于画面内。
            const extentX = transform.contentSize.width * Math.abs(scale.x) *
                Math.max(transform.anchorX, 1 - transform.anchorX);
            const extentY = transform.contentSize.height * Math.abs(scale.y) *
                Math.max(transform.anchorY, 1 - transform.anchorY);
            const limitX = viewport.width / 2 - extentX - BATTLE_CONFIG.monster.edgePadding;
            const limitY = viewport.height / 2 - extentY - BATTLE_CONFIG.monster.edgePadding;
            const maxY = Math.min(limitY, BATTLE_CONFIG.monster.spawnMaxY);
            const minAbsX = BATTLE_CONFIG.monster.spawnMinAbsX + 1;
            if (limitX <= minAbsX || limitY <= 0 || maxY < -limitY) continue;

            // 一波分散到不同画面边缘；多个候选位置中优先选离现有怪物较远的点。
            const side = (firstSide + index) % 4;
            let best: MonsterSpawnRequest | null = null;
            let bestDistanceSquared = -1;
            for (let attempt = 0; attempt < 8; attempt++) {
                const along = Math.random() * 2 - 1;
                const x = side === 0 ? -limitX : side === 1 ? limitX
                    : (along < 0 ? -1 : 1) * (minAbsX + Math.abs(along) * (limitX - minAbsX));
                const y = side === 2 ? -limitY : side === 3 ? maxY
                    : -limitY + (along + 1) * 0.5 * (maxY + limitY);
                let nearestDistanceSquared = Infinity;
                for (const other of occupied) {
                    const dx = other.x - x;
                    const dy = other.y - y;
                    nearestDistanceSquared = Math.min(nearestDistanceSquared, dx * dx + dy * dy);
                }
                for (const other of requests) {
                    const dx = other.x - x;
                    const dy = other.y - y;
                    nearestDistanceSquared = Math.min(nearestDistanceSquared, dx * dx + dy * dy);
                }
                if (nearestDistanceSquared > bestDistanceSquared) {
                    bestDistanceSquared = nearestDistanceSquared;
                    best = { template, x, y };
                }
                if (nearestDistanceSquared >= BATTLE_CONFIG.monster.spawnSpacing ** 2) break;
            }
            if (best) requests.push(best);
        }
        return requests;
    }
}
