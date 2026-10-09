import { Asset, AudioClip, Prefab, resources } from 'cc';
import { PREFAB_PATHS, PrefabKey } from './ResourceConfig';

/** 统一加载 resources 内的资源；同一路径的并发请求共用一次加载。 */
export class ResourceManager {
    private static readonly tasks = new Map<string, Promise<Asset>>();

    static loadPrefab(key: PrefabKey): Promise<Prefab> {
        return this.loadAsset(PREFAB_PATHS[key], Prefab);
    }

    /** path 是 resources 下的相对路径，不带扩展名。 */
    static loadAudio(path: string): Promise<AudioClip> {
        return this.loadAsset(path, AudioClip);
    }

    static preloadPrefabs(keys: readonly PrefabKey[]): Promise<Prefab[]> {
        return Promise.all(keys.map(key => this.loadPrefab(key)));
    }

    /** 其他资源类型也可通过此方法加载。 */
    static loadAsset<T extends Asset>(path: string, type: new (...args: any[]) => T): Promise<T> {
        const cacheKey = path;
        const cached = this.tasks.get(cacheKey) as Promise<T> | undefined;
        if (cached) return cached;

        const task = new Promise<T>((resolve, reject) => {
            resources.load(path, type, (error, asset) => {
                if (error || !asset) {
                    this.tasks.delete(cacheKey);
                    reject(error ?? new Error(`资源加载失败：${path}`));
                    return;
                }
                resolve(asset);
            });
        });
        this.tasks.set(cacheKey, task);
        return task;
    }
}
