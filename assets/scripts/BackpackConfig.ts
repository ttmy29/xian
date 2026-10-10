import { GridItem } from './InventoryGrid';

export interface BackpackItemConfig extends GridItem {
    /** Node/items 下作为模板的节点名称。 */
    templateName: string;
}

/** width/height 表示占用的列数/行数，不是像素。 */
export const BACKPACK_CONFIG: {
    grid: { columns: number; rows: number; cellSize: number; gap: number; top: number };
    traySpacing: number;
    items: BackpackItemConfig[];
} = {
    grid: {
        columns: 3,  // 背包列数（水平方向的格子数）
        rows: 3,     // 背包行数（垂直方向的格子数）
        cellSize: 116, // 单个格子的边长，单位：设计像素
        gap: 2,      // 相邻格子之间的间距，单位：设计像素  8
        top: 320,    // 背包格子区域上边缘相对 gzNode 中心的 Y 坐标
    },
    traySpacing: 180, // items 中剩余物品收拢后，相邻物品中心的水平距离
    items: [
        { id: 'icon1', templateName: 'icon1', width: 1, height: 1 },
        //{ id: 'icon2', templateName: 'icon2', width: 1, height: 1 },
        { id: 'icon3', templateName: 'icon3', width: 1, height: 1 },//2,1
       // { id: 'icon4', templateName: 'icon4', width: 1, height: 3 }, // 刷新时可替换第三个位置
    ],
};
