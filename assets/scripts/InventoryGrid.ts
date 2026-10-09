export interface GridPosition {
    col: number;
    row: number;
}

export interface GridItem {
    id: string;
    width: number;
    height: number;
}

/** Pure grid rules. Width and height are measured in cells. */
export class InventoryGrid {
    private readonly cells: (string | null)[];
    private readonly positions = new Map<string, GridPosition>();

    constructor(public readonly columns: number, public readonly rows: number) {
        this.cells = new Array(columns * rows).fill(null);
    }

    canPlace(item: GridItem, col: number, row: number): boolean {
        if (col < 0 || row < 0 || col + item.width > this.columns || row + item.height > this.rows) {
            return false;
        }
        for (let y = row; y < row + item.height; y++) {
            for (let x = col; x < col + item.width; x++) {
                const owner = this.cells[y * this.columns + x];
                if (owner !== null && owner !== item.id) return false;
            }
        }
        return true;
    }

    place(item: GridItem, col: number, row: number): boolean {
        if (!this.canPlace(item, col, row)) return false;
        this.remove(item.id);
        for (let y = row; y < row + item.height; y++) {
            for (let x = col; x < col + item.width; x++) {
                this.cells[y * this.columns + x] = item.id;
            }
        }
        this.positions.set(item.id, { col, row });
        return true;
    }

    remove(id: string): void {
        for (let i = 0; i < this.cells.length; i++) {
            if (this.cells[i] === id) this.cells[i] = null;
        }
        this.positions.delete(id);
    }

    getPosition(id: string): GridPosition | undefined {
        return this.positions.get(id);
    }

    getItemAt(col: number, row: number): string | null {
        if (col < 0 || row < 0 || col >= this.columns || row >= this.rows) return null;
        return this.cells[row * this.columns + col];
    }

    clear(): void {
        this.cells.fill(null);
        this.positions.clear();
    }

    isFull(): boolean {
        return this.cells.every(cell => cell !== null);
    }
}
