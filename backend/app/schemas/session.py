import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field

from app.layers import LayerDocument
from app.models import EditHistory, EditSession
from app.schemas.asset import AssetOut
from app.schemas.run import RunOut

MAX_WALL_ASSETS = 12


class SessionCreateIn(BaseModel):
    """创建编辑会话的请求。"""

    # 当前采用的素材标识。
    current_asset_id: uuid.UUID
    # 同批未采用的候选一并进图片墙
    asset_ids: Annotated[list[uuid.UUID], Field(max_length=MAX_WALL_ASSETS)] = []
    # 编辑会话的显示标题。
    title: str | None = None


class SessionPatchIn(BaseModel):
    """更新会话标题或当前素材的请求。"""

    # 编辑会话的显示标题。
    title: str | None = None
    # 当前采用的素材标识。
    current_asset_id: uuid.UUID | None = None


class ToolInvokeIn(BaseModel):
    """编辑会话中的工具调用请求。"""

    # 工具的注册名称。
    tool: str
    # 工具调用的参数。
    params: dict = {}


class PointIn(BaseModel):
    """画布上的归一化坐标点。"""

    # 横坐标占画布宽度的比例。
    x: float = Field(ge=0, le=1)
    # 纵坐标占画布高度的比例。
    y: float = Field(ge=0, le=1)


class SelectIn(BaseModel):
    """创建或追加选区的请求。"""

    # 画布修订号，用于校验选区与文档版本。
    revision: int
    # 点选选区的归一化坐标列表。
    points: list[PointIn] = []
    # 笔刷轨迹列表，每条轨迹由归一化坐标组成。
    strokes: list[list[PointIn]] = []
    # 笔刷半径占画布短边的比例。
    radius: float = Field(default=0.03, ge=0.005, le=0.12)
    # 是否将本次点选追加到已有选区。
    append: bool = False


class MarkerOut(BaseModel):
    """选区点选标记。"""

    # 点选标记的显示序号。
    index: int
    # 横坐标占画布宽度的比例。
    x: float
    # 纵坐标占画布高度的比例。
    y: float


class SelectionOut(BaseModel):
    """选区遮罩及其标记信息。"""

    # 画布修订号，用于校验选区与文档版本。
    revision: int
    # 表示当前选区范围的遮罩素材。
    mask: AssetOut
    # 当前选区的点选标记列表。
    markers: list[MarkerOut] = []


class SessionOut(BaseModel):
    """编辑会话的基本信息。"""

    # 唯一标识。
    id: uuid.UUID
    # 编辑会话的显示标题。
    title: str
    # 画布修订号，用于校验选区与文档版本。
    revision: int
    # 当前编辑历史的位置，用于撤销和重做。
    history_seq: int
    # 创建会话时的原始素材标识。
    original_asset_id: uuid.UUID
    # 当前采用的素材标识。
    current_asset_id: uuid.UUID
    # 创建时间。
    created_at: datetime
    # 最近更新时间。
    updated_at: datetime

    @classmethod
    def of(cls, record: EditSession) -> "SessionOut":
        """将业务记录转换为SessionOut 响应数据。"""
        return cls(
            id=record.id,
            title=record.title,
            revision=record.revision,
            history_seq=record.history_seq,
            original_asset_id=record.original_asset_id,
            current_asset_id=record.current_asset_id,
            created_at=record.created_at,
            updated_at=record.updated_at,
        )


class SessionDetailOut(SessionOut):
    """编辑会话的画布、素材及历史状态。"""

    # 当前画布的图层文档。
    document: LayerDocument
    # 上一次编辑的画布文档，用于前后对比。
    previous_document: LayerDocument | None = None
    # 关联的素材列表。
    assets: list[AssetOut] = []
    # 当前是否可以撤销编辑。
    can_undo: bool = False
    # 当前是否可以重做编辑。
    can_redo: bool = False

    @classmethod
    def of_detail(
        cls,
        record: EditSession,
        assets: list[AssetOut],
        *,
        previous_document: LayerDocument | None = None,
        can_undo: bool = False,
        can_redo: bool = False,
    ) -> "SessionDetailOut":
        """将业务记录转换为SessionDetailOut 响应数据。"""
        return cls(
            **SessionOut.of(record).model_dump(),
            document=LayerDocument.model_validate(record.document),
            previous_document=previous_document,
            assets=assets,
            can_undo=can_undo,
            can_redo=can_redo,
        )


class ToolInvokeOut(BaseModel):
    """工具调用结果及最新会话信息。"""

    # 工具任务的执行信息。
    run: RunOut
    # 工具执行后的编辑会话详情。
    session: SessionDetailOut


class HistoryOut(BaseModel):
    """单条编辑历史记录。"""

    # 编辑操作在会话历史中的序号。
    seq: int
    # 编辑操作名称。
    action: str
    # 工具调用的参数。
    params: dict
    # 执行结果数据。
    result: dict
    # 创建时间。
    created_at: datetime

    @classmethod
    def of(cls, entry: EditHistory) -> "HistoryOut":
        """将业务记录转换为HistoryOut 响应数据。"""
        return cls(
            seq=entry.seq,
            action=entry.action,
            params=entry.params,
            result=entry.result,
            created_at=entry.created_at,
        )
