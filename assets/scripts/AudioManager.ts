import { _decorator, AudioClip, AudioSource, Component, Node } from 'cc';
import { ResourceManager } from './ResourceManager';

const { ccclass } = _decorator;

type MusicKey = 'BGM' | 'attack1' | 'bigJian' | 'Click' | 'duJie' | 'FeiJian' | 'Tornado' | 'warn';
const EFFECT_KEYS: readonly MusicKey[] = ['attack1', 'bigJian', 'Click', 'duJie', 'FeiJian', 'Tornado', 'warn'];

/** 从 music Bundle 加载音频；BGM 循环播放，音效允许同时播放。 */
@ccclass('AudioManager')
export class AudioManager extends Component {
    private bgmSource!: AudioSource;
    private effectSource!: AudioSource;
    private readonly clips = new Map<MusicKey, AudioClip>();

    static getOrCreate(canvas: Node): AudioManager {
        return canvas.getComponent(AudioManager) ?? canvas.addComponent(AudioManager);
    }

    onLoad(): void {
        const bgmNode = new Node('BGM Audio');
        bgmNode.parent = this.node;
        this.bgmSource = bgmNode.addComponent(AudioSource);
        this.bgmSource.loop = true;

        const effectNode = new Node('Effect Audio');
        effectNode.parent = this.node;
        this.effectSource = effectNode.addComponent(AudioSource);
        for (const key of EFFECT_KEYS) void this.loadClip(key).catch(() => {});
    }

    startBgm(): void {
        void this.loadClip('BGM').then(clip => {
            if (!this.node.isValid) return;
            this.bgmSource.clip = clip;
            if (!this.bgmSource.playing) this.bgmSource.play();
        }).catch(() => {});
    }

    playEffect(key: Exclude<MusicKey, 'BGM'>): void {
        const requestedAt = Date.now();
        void this.loadClip(key).then(clip => {
            if (this.node.isValid && Date.now() - requestedAt < 1000) {
                this.effectSource.playOneShot(clip);
            }
        }).catch(() => {});
    }

    private loadClip(key: MusicKey): Promise<AudioClip> {
        const cached = this.clips.get(key);
        if (cached) return Promise.resolve(cached);
        return ResourceManager.loadBundleAsset('music', key, AudioClip).then(clip => {
            if (this.node.isValid) this.clips.set(key, clip);
            return clip;
        }, error => {
            if (this.node.isValid) console.error(`AudioManager: 加载 music/${key} 失败。`, error);
            throw error;
        });
    }
}
