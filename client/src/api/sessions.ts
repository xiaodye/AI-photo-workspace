import type { Asset } from '@/api/assets'
import { api, apiError } from '@/api/client'
import type { Run } from '@/api/runs'

export type LayerKind = 'image' | 'text' | 'shape'

export type Transform = {
  /** 横向坐标；单位与所属画布或视图一致。 */
  x: number
  /** 纵向坐标；单位与所属画布或视图一致。 */
  y: number
  /** 横向缩放倍率，负值表示翻转。 */
  scale_x: number
  /** 纵向缩放倍率，负值表示翻转。 */
  scale_y: number
  /** 旋转角度，单位为度。 */
  rotation: number
}

export type Layer = {
  /** 当前记录的唯一标识。 */
  id: string
  /** 素材、图层或操作的业务分类。 */
  kind: LayerKind
  /** 图层的显示名称。 */
  name: string
  /** 宽度；画布及素材尺寸以像素计。 */
  width: number
  /** 高度；画布及素材尺寸以像素计。 */
  height: number
  /** 图层引用的素材标识，非图片层可为空。 */
  asset_id: string | null
  /** 图层在文档坐标系内的位置、缩放与旋转。 */
  transform: Transform
  /** 透明度，取值 0～1。 */
  opacity: number
  /** 图层是否参与画布绘制。 */
  visible: boolean
  /** 是否禁止直接拖动图层。 */
  locked: boolean
  /** 图层来源内容指纹，可缺省或为空。 */
  source_hash?: string | null
  /** 文字内容或待展示的消息。 */
  text?: string | null
  /** 文字字号，以文档像素计。 */
  font_size?: number
  /** 文字或形状的填充颜色。 */
  fill?: string
}

export type LayerDocument = {
  /** 宽度；画布及素材尺寸以像素计。 */
  width: number
  /** 高度；画布及素材尺寸以像素计。 */
  height: number
  /** 按文档堆叠顺序保存的图层。 */
  layers: Layer[]
}

export type Session = {
  /** 当前记录的唯一标识。 */
  id: string
  /** 供用户识别的显示标题。 */
  title: string
  /** 关联的会话文档版本，用于避免对过期文档操作。 */
  revision: number
  /** 当前文档对应的历史序号。 */
  history_seq: number
  /** 会话初始素材标识。 */
  original_asset_id: string
  /** 当前选中的会话素材标识。 */
  current_asset_id: string
  /** 服务端记录的创建时间。 */
  created_at: string
  /** 服务端记录的最近更新时间。 */
  updated_at: string
}

export type SessionDetail = Session & {
  /** 当前会话的画布文档。 */
  document: LayerDocument
  /** 用于前后对比的上一份文档，可为空。 */
  previous_document: LayerDocument | null
  /** 当前范围内可用的素材集合。 */
  assets: Asset[]
  /** 服务端是否允许撤销画布操作。 */
  can_undo: boolean
  /** 服务端是否允许重做画布操作。 */
  can_redo: boolean
}

export type HistoryEntry = {
  /** 历史记录在会话内的序号。 */
  seq: number
  /** 关联操作或提示中的可执行入口。 */
  action: string
  /** 提交给服务端工具的参数。 */
  params: Record<string, unknown>
  /** 服务端返回的工具结果数据。 */
  result: Record<string, unknown>
  /** 服务端记录的创建时间。 */
  created_at: string
}

export type SessionCreateInput = {
  /** 当前选中的会话素材标识。 */
  current_asset_id: string
  /** 参与当前操作的素材标识列表。 */
  asset_ids?: string[]
  /** 供用户识别的显示标题。 */
  title?: string
}

export type SessionPatchInput = {
  /** 供用户识别的显示标题。 */
  title?: string
  /** 当前选中的会话素材标识。 */
  current_asset_id?: string
}

export type ToolInvoke = {
  /** 关联的后台任务或提示动作。 */
  run: Run
  /** 会话详情及其可用素材。 */
  session: SessionDetail
}

export const ACTION_LABELS: Record<string, string> = {
  create_session: '新建会话',
  switch_current: '切换当前图',
  generate_image: '生成图片',
  replace_background: '换背景',
  expand_canvas: '扩图',
  upscale_image: '超分',
  remove_background: '去背景',
  adjust_image: '调色',
  erase_region: '局部消除',
  replace_region: '局部替换',
  crop_canvas: '裁剪',
  flip_layer: '翻转',
  set_layer_opacity: '透明度',
  set_layer_visible: '显隐',
  set_layer_text: '改文字',
  reorder_layer: '图层顺序',
  scale_layer: '缩放',
  rotate_layer: '旋转',
  move_layer: '移动',
  split_layers: '拆层',
  promote_object_to_layer: '提升为图层',
  generate_marketing: '营销图',
  prepare_delivery_sizes: '投放尺寸',
}

export type ExportPack = {
  /** 下载响应的二进制内容。 */
  blob: Blob
  /** 浏览器保存时使用的文件名。 */
  filename: string
}

export type Marker = {
  /** 界面序号或点选标记编号。 */
  index: number;
  /** 横向坐标；单位与所属画布或视图一致。 */
  x: number;
  /** 纵向坐标；单位与所属画布或视图一致。 */
  y: number
}

export type Selection = {
  /** 关联的会话文档版本，用于避免对过期文档操作。 */
  revision: number
  /** 服务端生成的选区遮罩素材。 */
  mask: Asset
  /** 当前选区的点选标记。 */
  markers: Marker[]
}

export type SelectInput = {
  /** 关联的会话文档版本，用于避免对过期文档操作。 */
  revision: number
  /** 选区点坐标，使用画布内 0～1 的归一化值。 */
  points?: {
    /** 横向坐标；单位与所属画布或视图一致。 */
    x: number;
    /** 纵向坐标；单位与所属画布或视图一致。 */
    y: number
  }[]
  /** 按笔画分组的归一化选区轨迹。 */
  strokes?: {
    /** 横向坐标；单位与所属画布或视图一致。 */
    x: number;
    /** 纵向坐标；单位与所属画布或视图一致。 */
    y: number
  }[][]
  /** 相对画布短边的笔刷尺寸比例。 */
  radius?: number
  /** 是否将点选合并到当前选区。 */
  append?: boolean
}

export const sessionsApi = {
  /**
   * 以素材建立编辑会话。
   *
   * @param input 提交给服务端的业务输入。
   * @returns
   */
  create: (input: SessionCreateInput) => api.post<SessionDetail>('/sessions', input),
  /**
   * 读取当前用户的编辑会话列表。
   *
   * @returns
   */
  list: () => api.get<Session[]>('/sessions'),
  /**
   * 读取会话文档及相关素材。
   *
   * @param id 当前记录的唯一标识。
   * @returns
   */
  get: (id: string) => api.get<SessionDetail>(`/sessions/${id}`),
  /**
   * 更新会话标题或当前素材。
   *
   * @param id 当前记录的唯一标识。
   * @param input 提交给服务端的业务输入。
   * @returns
   */
  patch: (id: string, input: SessionPatchInput) =>
    api.patch<SessionDetail>(`/sessions/${id}`, input),
  /**
   * 读取会话的文档操作历史。
   *
   * @param id 当前记录的唯一标识。
   * @returns
   */
  history: (id: string) => api.get<HistoryEntry[]>(`/sessions/${id}/history`),
  /**
   * 在会话中调用工具并取得任务与最新文档。
   *
   * @param id 当前记录的唯一标识。
   * @param tool 服务端注册的工具名称。
   * @param params 提交给服务端工具的参数。
   * @returns
   */
  invoke: (id: string, tool: string, params: Record<string, unknown> = {}) =>
    api.post<ToolInvoke>(`/sessions/${id}/tools`, { tool, params }),
  /**
   * 撤销最近一次画布文档操作。
   *
   * @param id 当前记录的唯一标识。
   * @returns
   */
  undo: (id: string) => api.post<SessionDetail>(`/sessions/${id}/undo`),
  /**
   * 重做最近撤销的画布文档操作。
   *
   * @param id 当前记录的唯一标识。
   * @returns
   */
  redo: (id: string) => api.post<SessionDetail>(`/sessions/${id}/redo`),
  /**
   * 以点选或笔刷输入更新会话选区。
   *
   * @param id 当前记录的唯一标识。
   * @param input 提交给服务端的业务输入。
   * @returns
   */
  select: (id: string, input: SelectInput) => api.post<Selection>(`/sessions/${id}/selection`, input),
  /**
   * 预热当前会话的选区推理资源。
   *
   * @param id 当前记录的唯一标识。
   * @returns
   */
  prepareSelection: (id: string) => api.post<void>(`/sessions/${id}/selection/prepare`),
  /**
   * 读取当前选区，尚无选区时为空。
   *
   * @param id 当前记录的唯一标识。
   * @returns
   */
  getSelection: (id: string) => api.get<Selection | null>(`/sessions/${id}/selection`),
  /**
   * 清除服务端保存的当前选区。
   *
   * @param id 当前记录的唯一标识。
   * @returns
   */
  clearSelection: (id: string) => api.delete<void>(`/sessions/${id}/selection`),
  /**
   * 下载会话中指定素材的压缩包。
   *
   * @param id 当前记录的唯一标识。
   * @param asset_ids 参与当前操作的素材标识列表。
   * @returns
   */
  export: (id: string, asset_ids: string[] = []) => downloadExport(id, asset_ids),
}

/**
 * 请求会话素材压缩包并提取下载文件名。
 *
 * @param id 当前记录的唯一标识。
 * @param asset_ids 参与当前操作的素材标识列表。
 * @returns
 */
async function downloadExport(id: string, asset_ids: string[]): Promise<ExportPack> {
  const response = await fetch(`/api/sessions/${id}/exports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ asset_ids }),
  })
  if (!response.ok) throw await apiError(response, '打包失败')
  return { blob: await response.blob(), filename: filenameOf(response.headers.get('Content-Disposition')) }
}

/**
 * 优先解析 UTF-8 下载文件名，缺失时使用默认名称。
 *
 * @param header 下载响应的 Content-Disposition 值。
 * @returns
 */
function filenameOf(header: string | null): string {
  if (!header) return '物料.zip'
  const encoded = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header)
  if (encoded) return decodeURIComponent(encoded[1])
  const plain = /filename="?([^"]+)"?/i.exec(header)
  return plain?.[1] ?? '物料.zip'
}
