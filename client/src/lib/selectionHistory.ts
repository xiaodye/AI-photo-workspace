export type StrokePoint = {
  /** 横向坐标；单位与所属画布或视图一致。 */
  x: number;
  /** 纵向坐标；单位与所属画布或视图一致。 */
  y: number
}

export type SelectionEntry =
  | {
    /** 素材、图层或操作的业务分类。 */
    kind: 'stroke';
    /** 选区点坐标，使用画布内 0～1 的归一化值。 */
    points: StrokePoint[]
  }
  | {
    /** 素材、图层或操作的业务分类。 */
    kind: 'point';
    /** 画布内 0～1 的归一化点坐标。 */
    point: StrokePoint
  }

/**
 * 将选区历史拆分为点选和笔刷输入，供服务端重放。
 *
 * @param entries 按提交顺序记录的选区操作。
 * @returns
 */
export function inputsOf(entries: SelectionEntry[]) {
  return {
    strokes: entries.filter((entry) => entry.kind === 'stroke').map((entry) => entry.points),
    points: entries.filter((entry) => entry.kind === 'point').map((entry) => entry.point),
  }
}

/**
 * 选区不进画布历史，本地记每笔以便撤销 / 重做。
 *
 * @returns
 */
export function createSelectionHistory() {
  let past: SelectionEntry[][] = []
  let current: SelectionEntry[] = []
  let future: SelectionEntry[][] = []

  return {
    /**
     * 读取当前已提交的选区操作序列。
     *
     * @returns
     */
    get current() {
      return current
    },
    /**
     * 判断是否存在可恢复的前一个选区快照。
     *
     * @returns
     */
    canUndo() {
      return past.length > 0
    },
    /**
     * 判断是否存在撤销后保留的选区快照。
     *
     * @returns
     */
    canRedo() {
      return future.length > 0
    },
    /**
     * 提交一次选区操作，保存前态并清空重做分支。
     *
     * @param entry 本次新增的点选或笔刷记录。
     */
    commit(entry: SelectionEntry) {
      past = [...past, current]
      current = [...current, entry]
      future = []
    },
    /**
     * 恢复上一个选区快照，并将当前快照放入重做栈。
     *
     * @returns
     */
    undo() {
      if (!past.length) return null
      future = [...future, current]
      current = past.at(-1) ?? []
      past = past.slice(0, -1)
      return current
    },
    /**
     * 恢复最近撤销的选区快照，并保留撤销入口。
     *
     * @returns
     */
    redo() {
      const next = future.at(-1)
      if (!next) return null
      past = [...past, current]
      current = next
      future = future.slice(0, -1)
      return current
    },
    /**
     * 清空当前选区但保留撤销入口，空选区不新增历史。
     *
     * @returns
     */
    clear() {
      if (!current.length) return false
      past = [...past, current]
      current = []
      future = []
      return true
    },
    /**
     * 清空选区当前记录及两侧历史，不保留撤销入口。
     */
    reset() {
      past = []
      current = []
      future = []
    },
  }
}
