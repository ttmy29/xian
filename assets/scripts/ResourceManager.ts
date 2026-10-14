import { Asset, assetManager, AssetManager, AudioClip, Prefab, resources } from 'cc';
import { PREFAB_BUNDLES, PREFAB_PATHS, PrefabKey } from './ResourceConfig';

/** 统一加载 resources 与独立 Bundle 的资源；同一路径的并发请求共用一次加载。 */
export class ResourceManager {
    private static readonly tasks = new Map<string, Promise<Asset>>();
    private static readonly bundleTasks = new Map<string, Promise<AssetManager.Bundle>>();

    static loadPrefab(key: PrefabKey): Promise<Prefab> {
        const bundleName = PREFAB_BUNDLES[key];
        if (bundleName) return this.loadBundlePrefab(bundleName, PREFAB_PATHS[key]);
        return this.loadAsset(PREFAB_PATHS[key], Prefab);
    }

    /** 加载独立 Bundle 中的预制体；path 相对于 Bundle 根目录。 */
    static loadBundlePrefab(bundleName: string, path: string): Promise<Prefab> {
        return this.loadBundleAsset(bundleName, path, Prefab);
    }

    static loadBundleAsset<T extends Asset>(bundleName: string, path: string,
        type: new (...args: any[]) => T): Promise<T> {
        const assetPath = path.startsWith(`${bundleName}/`) ? path.slice(bundleName.length + 1) : path;
        const cacheKey = `${bundleName}:${assetPath}`;
        const cached = this.tasks.get(cacheKey) as Promise<T> | undefined;
        if (cached) return cached;

        const task = this.loadBundle(bundleName).then(bundle => new Promise<T>((resolve, reject) => {
            bundle.load(assetPath, type, (error, asset) => {
                if (error || !asset) {
                    reject(error ?? new Error(`Bundle 资源加载失败：${cacheKey}`));
                    return;
                }
                resolve(asset);
            });
        }));
        this.tasks.set(cacheKey, task);
        void task.catch(() => this.tasks.delete(cacheKey));
        return task;
    }

    private static loadBundle(bundleName: string): Promise<AssetManager.Bundle> {
        const loaded = assetManager.getBundle(bundleName);
        if (loaded) return Promise.resolve(loaded);
        const pending = this.bundleTasks.get(bundleName);
        if (pending) return pending;
        const task = new Promise<AssetManager.Bundle>((resolve, reject) => {
            assetManager.loadBundle(bundleName, (error, bundle) => {
                if (error || !bundle) {
                    reject(error ?? new Error(`Bundle 加载失败：${bundleName}`));
                    return;
                }
                resolve(bundle);
            });
        });
        this.bundleTasks.set(bundleName, task);
        void task.then(() => this.bundleTasks.delete(bundleName),
            () => this.bundleTasks.delete(bundleName));
        return task;
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
