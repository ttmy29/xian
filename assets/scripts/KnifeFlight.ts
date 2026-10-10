import { Vec3 } from 'cc';
import { BATTLE_CONFIG } from './BattleConfig';

export interface KnifeFlightStep {
    position: Vec3;
    angleDegrees: number;
    path: Vec3[];
    hit: boolean;
    expired: boolean;
}

type FlightPhase = 'launch' | 'turn' | 'chase' | 'capture';

interface CapturePath {
    start: Vec3;
    control1: Vec3;
    control2: Vec3;
    end: Vec3;
    distances: number[];
    length: number;
    travelled: number;
}

/** 出手、转弯和追击共用运动状态；接近目标时沿当前朝向接入命中弧线。 */
export class KnifeFlight {
    private phase: FlightPhase = 'launch';
    private heading: number;
    private angularVelocity = 0;
    private turnSide: number;
    private readonly launchHeading: number;
    private readonly forwardOffsetDegrees: number;
    private readonly launchDistance: number;
    private launchTravelled = 0;
    private turnTravelled = 0;
    private turnRequiredDistance = 0;
    private capture: CapturePath | null = null;
    private speed = BATTLE_CONFIG.knife.knifeSpeed * BATTLE_CONFIG.knife.knifeStartSpeedRatio;
    private age = 0;

    constructor(from: Readonly<Vec3>, target: Readonly<Vec3>, initialAngleDegrees: number,
        curveSide: number, canvasWidth: number, canvasHeight: number,
        viewportCenter: Readonly<Vec3>, forwardOffsetDegrees = 90) {
        // 普通飞剑 0° 朝上；knife3 使用 180° 偏移，使预制体 0° 朝左。
        this.forwardOffsetDegrees = forwardOffsetDegrees;
        this.heading = (initialAngleDegrees + forwardOffsetDegrees) * Math.PI / 180;
        const directionToTarget = Math.atan2(target.y - from.y, target.x - from.x);
        const difference = this.wrapAngle(directionToTarget - this.heading);
        this.turnSide = Math.abs(Math.abs(difference) - Math.PI) < 0.08
            ? (curveSide < 0 ? -1 : 1)
            : (Math.sign(difference) || (curveSide < 0 ? -1 : 1));
        const bend = BATTLE_CONFIG.knife.knifeLaunchBendAngle * Math.min(1, Math.abs(curveSide));
        this.launchHeading = this.heading + this.turnSide * bend * Math.PI / 180;
        const targetDistance = Math.hypot(target.x - from.x, target.y - from.y);
        const edgeDistance = this.distanceToEdge(from, canvasWidth, canvasHeight, viewportCenter);
        this.launchDistance = Math.max(0, Math.min(
            BATTLE_CONFIG.knife.knifeLaunchDistance,
            targetDistance * BATTLE_CONFIG.knife.knifeLaunchTargetRatio,
            edgeDistance - BATTLE_CONFIG.knife.knifeTurnScreenReserve,
        ));
    }

    public get angleDegrees(): number {
        const degrees = this.heading * 180 / Math.PI - this.forwardOffsetDegrees;
        return (degrees % 360 + 360) % 360;
    }

    /** 旧目标死亡后，沿当前朝向和转向速度接着拐向新目标。 */
    public retarget(from: Readonly<Vec3>, target: Readonly<Vec3>): void {
        if (this.phase === 'capture') this.angularVelocity = 0;
        this.capture = null;
        const desired = Math.atan2(target.y - from.y, target.x - from.x);
        const difference = this.wrapAngle(desired - this.heading);
        if (Math.abs(Math.abs(difference) - Math.PI) < 0.08) {
            this.turnSide = Math.sign(this.angularVelocity) || this.turnSide;
        } else if (Math.abs(difference) > 0.001) {
            this.turnSide = Math.sign(difference);
        }
        this.phase = 'turn';
        this.turnTravelled = 0;
        this.turnRequiredDistance = this.minimumTurnDistance(Math.abs(difference));
    }

    public step(from: Readonly<Vec3>, target: Readonly<Vec3>, dt: number, hitRadius: number): KnifeFlightStep {
        let position = new Vec3(from.x, from.y, from.z);
        const path: Vec3[] = [];
        if (Math.hypot(target.x - position.x, target.y - position.y) <= hitRadius) {
            return { position, angleDegrees: this.angleDegrees, path, hit: true, expired: false };
        }
        let remaining = Math.max(0, dt);
        while (remaining > 0.000001 && this.age < BATTLE_CONFIG.knife.knifeLifetime && path.length < 256) {
            if (this.phase === 'launch' && this.launchTravelled >= this.launchDistance) {
                this.enterTurn(position, target);
            }
            const distanceToTarget = Math.hypot(target.x - position.x, target.y - position.y);
            if (distanceToTarget <= hitRadius) {
                return { position, angleDegrees: this.angleDegrees, path, hit: true, expired: false };
            }
            if (this.phase !== 'launch' && this.phase !== 'capture' &&
                (this.phase === 'chase' || this.turnTravelled >= this.turnRequiredDistance) &&
                distanceToTarget <= BATTLE_CONFIG.knife.knifeTerminalCaptureDistance) {
                this.startCapture(position, target);
            }
            const stepTime = Math.min(remaining, 1 / 90,
                BATTLE_CONFIG.knife.knifeFlightStepDistance / Math.max(1, this.speed),
                BATTLE_CONFIG.knife.knifeLifetime - this.age);
            if (stepTime <= 0.000001) break;
            const desiredSpeed = this.phase === 'chase' || this.phase === 'capture'
                ? BATTLE_CONFIG.knife.knifeSpeed : BATTLE_CONFIG.knife.knifeTurnSpeed;
            this.speed = this.moveToward(this.speed, desiredSpeed,
                BATTLE_CONFIG.knife.knifeAcceleration * stepTime);
            let next: Vec3;
            if (this.phase === 'capture' && this.capture) {
                const capture = this.capture;
                capture.travelled = Math.min(capture.length, capture.travelled + this.speed * stepTime);
                const t = this.captureParameter(capture, capture.travelled);
                next = this.capturePoint(capture, t);
                const tangent = this.captureTangent(capture, t);
                this.heading = Math.atan2(tangent.y, tangent.x);
            } else {
                const desiredHeading = this.phase === 'launch'
                    ? this.launchHeading
                    : Math.atan2(target.y - position.y, target.x - position.x);
                const maxTurnRate = this.phase === 'chase'
                    ? BATTLE_CONFIG.knife.knifeChaseTurnRate : BATTLE_CONFIG.knife.knifeTurnMaxRate;
                this.steer(desiredHeading, maxTurnRate, stepTime);
                next = new Vec3(
                    position.x + Math.cos(this.heading) * this.speed * stepTime,
                    position.y + Math.sin(this.heading) * this.speed * stepTime,
                    position.z,
                );
            }
            const travelled = Math.hypot(next.x - position.x, next.y - position.y);
            const hit = this.segmentDistanceSquared(position.x, position.y, next.x, next.y,
                target.x, target.y) <= hitRadius * hitRadius;
            path.push(next);
            position = next;
            this.age += stepTime;
            remaining -= stepTime;
            if (hit) return { position, angleDegrees: this.angleDegrees, path, hit: true, expired: false };

            if (this.phase === 'launch') {
                this.launchTravelled += travelled;
                if (this.launchTravelled >= this.launchDistance) this.enterTurn(position, target);
            } else if (this.phase === 'turn') {
                this.turnTravelled += travelled;
                const targetHeading = Math.atan2(target.y - position.y, target.x - position.x);
                const errorDegrees = Math.abs(this.wrapAngle(targetHeading - this.heading)) * 180 / Math.PI;
                const angularSpeedDegrees = Math.abs(this.angularVelocity) * 180 / Math.PI;
                if (this.turnTravelled >= this.turnRequiredDistance &&
                    errorDegrees <= BATTLE_CONFIG.knife.knifeTurnExitAngle &&
                    angularSpeedDegrees <= BATTLE_CONFIG.knife.knifeTurnExitAngularSpeed) {
                    this.phase = 'chase';
                }
            } else if (this.phase === 'capture' && this.capture &&
                this.capture.travelled >= this.capture.length - 0.0001) {
                // 目标在飞行中移动过：从当前切线重新接一条短弧线，而不是绕着目标空转。
                this.startCapture(position, target);
            }
        }
        return { position, angleDegrees: this.angleDegrees, path, hit: false,
            expired: this.age >= BATTLE_CONFIG.knife.knifeLifetime };
    }

    private enterTurn(position: Readonly<Vec3>, target: Readonly<Vec3>): void {
        this.phase = 'turn';
        this.turnTravelled = 0;
        const desired = Math.atan2(target.y - position.y, target.x - position.x);
        this.turnRequiredDistance = this.minimumTurnDistance(
            Math.abs(this.wrapAngle(desired - this.heading)));
    }

    private minimumTurnDistance(errorRadians: number): number {
        // 已经正对目标时无需强迫飞剑绕圈；转角达到 45° 后使用完整最短距离。
        return BATTLE_CONFIG.knife.knifeTurnMinDistance *
            Math.min(1, errorRadians / (Math.PI / 4));
    }

    private startCapture(from: Readonly<Vec3>, target: Readonly<Vec3>): void {
        const distance = Math.hypot(target.x - from.x, target.y - from.y);
        const handle = Math.min(110, distance * 0.32);
        const targetDirection = Math.atan2(target.y - from.y, target.x - from.x);
        const side = this.turnSide;
        const start = new Vec3(from.x, from.y, from.z);
        const end = new Vec3(target.x, target.y, from.z);
        const control1 = new Vec3(from.x + Math.cos(this.heading) * handle,
            from.y + Math.sin(this.heading) * handle, from.z);
        const control2 = new Vec3(
            target.x - Math.cos(targetDirection) * handle - Math.sin(targetDirection) * side * handle * 0.35,
            target.y - Math.sin(targetDirection) * handle + Math.cos(targetDirection) * side * handle * 0.35,
            from.z);
        const capture: CapturePath = {
            start, control1, control2, end, distances: [0], length: 0, travelled: 0,
        };
        let previous = start;
        for (let index = 1; index <= 48; index++) {
            const point = this.capturePoint(capture, index / 48);
            capture.length += Math.hypot(point.x - previous.x, point.y - previous.y);
            capture.distances.push(capture.length);
            previous = point;
        }
        this.capture = capture;
        this.phase = 'capture';
    }

    private captureParameter(capture: CapturePath, distance: number): number {
        for (let index = 1; index < capture.distances.length; index++) {
            if (capture.distances[index] < distance) continue;
            const before = capture.distances[index - 1];
            const segment = capture.distances[index] - before;
            const fraction = segment > 0 ? (distance - before) / segment : 0;
            return (index - 1 + fraction) / 48;
        }
        return 1;
    }

    private capturePoint(capture: CapturePath, t: number): Vec3 {
        const inverse = 1 - t;
        const first = inverse * inverse * inverse;
        const second = 3 * inverse * inverse * t;
        const third = 3 * inverse * t * t;
        const fourth = t * t * t;
        return new Vec3(
            capture.start.x * first + capture.control1.x * second + capture.control2.x * third + capture.end.x * fourth,
            capture.start.y * first + capture.control1.y * second + capture.control2.y * third + capture.end.y * fourth,
            capture.start.z,
        );
    }

    private captureTangent(capture: CapturePath, t: number): Vec3 {
        const inverse = 1 - t;
        return new Vec3(
            3 * inverse * inverse * (capture.control1.x - capture.start.x) +
                6 * inverse * t * (capture.control2.x - capture.control1.x) +
                3 * t * t * (capture.end.x - capture.control2.x),
            3 * inverse * inverse * (capture.control1.y - capture.start.y) +
                6 * inverse * t * (capture.control2.y - capture.control1.y) +
                3 * t * t * (capture.end.y - capture.control2.y),
            0,
        );
    }

    private steer(desiredHeading: number, maxRateDegrees: number, dt: number): void {
        let error = this.wrapAngle(desiredHeading - this.heading);
        // 正后方目标有两条等长转向路线；沿已选侧继续拐，不在 ±180° 处左右换向。
        if (Math.abs(Math.abs(error) - Math.PI) < 0.08) {
            error = this.turnSide * Math.abs(error);
        }
        const acceleration = BATTLE_CONFIG.knife.knifeTurnAngularAcceleration * Math.PI / 180;
        const maxRate = maxRateDegrees * Math.PI / 180;
        const stoppingAngle = this.angularVelocity * this.angularVelocity / (2 * acceleration);
        const sameDirection = Math.sign(error) === Math.sign(this.angularVelocity);
        const targetVelocity = Math.abs(error) < 0.0001 ||
            (sameDirection && Math.abs(error) <= stoppingAngle)
            ? 0 : Math.sign(error) * maxRate;
        this.angularVelocity = this.moveToward(this.angularVelocity, targetVelocity, acceleration * dt);
        this.heading += this.angularVelocity * dt;
    }

    private distanceToEdge(from: Readonly<Vec3>, width: number, height: number,
        center: Readonly<Vec3>): number {
        const halfWidth = Math.max(0, width / 2 - BATTLE_CONFIG.knife.knifeFlightEdgePadding);
        const halfHeight = Math.max(0, height / 2 - BATTLE_CONFIG.knife.knifeFlightEdgePadding);
        const x = Math.cos(this.heading);
        const y = Math.sin(this.heading);
        const xDistance = Math.abs(x) < 0.000001 ? Infinity
            : (center.x + (x > 0 ? halfWidth : -halfWidth) - from.x) / x;
        const yDistance = Math.abs(y) < 0.000001 ? Infinity
            : (center.y + (y > 0 ? halfHeight : -halfHeight) - from.y) / y;
        return Math.max(0, Math.min(xDistance, yDistance));
    }

    private wrapAngle(angle: number): number {
        return Math.atan2(Math.sin(angle), Math.cos(angle));
    }

    private moveToward(current: number, target: number, maximumChange: number): number {
        return current + Math.max(-maximumChange, Math.min(maximumChange, target - current));
    }

    /** 每个采样小段都检查命中，高速或急转时不会直接穿过目标。 */
    private segmentDistanceSquared(ax: number, ay: number, bx: number, by: number,
        px: number, py: number): number {
        const vx = bx - ax;
        const vy = by - ay;
        const lengthSquared = vx * vx + vy * vy;
        const t = lengthSquared > 0
            ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / lengthSquared))
            : 0;
        const dx = px - (ax + vx * t);
        const dy = py - (ay + vy * t);
        return dx * dx + dy * dy;
    }
}
