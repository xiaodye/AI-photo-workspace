import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.asset import AssetOut
from app.schemas.run import RunOut

BATCH_TOOLS = (
    "remove_background",
    "replace_background",
    "adjust_image",
    "upscale_image",
    "expand_canvas",
    "prepare_delivery_sizes",
)

MAX_BATCH_ASSETS = 20
ExportFormat = Literal["png", "jpg"]


class BatchOpIn(BaseModel):
    """单个批处理步骤的工具与参数。"""

    # 工具的注册名称。
    tool: Literal[
        "remove_background",
        "replace_background",
        "adjust_image",
        "upscale_image",
        "expand_canvas",
        "prepare_delivery_sizes",
    ]
    # 工具调用的参数。
    params: dict = Field(default_factory=dict)


class BatchIn(BaseModel):
    """批量图片处理请求。"""

    # 待处理的素材标识列表。
    asset_ids: list[uuid.UUID] = Field(min_length=1, max_length=MAX_BATCH_ASSETS)
    # 按顺序执行的批处理步骤。
    operations: list[BatchOpIn] = Field(min_length=1, max_length=len(BATCH_TOOLS))
    # 成品需要导出的图片格式列表。
    formats: list[ExportFormat] = Field(default_factory=lambda: ["png"], min_length=1, max_length=2)


class BatchItemOut(BaseModel):
    """单张素材的批处理结果。"""

    # 本项处理使用的原始素材。
    source: AssetOut
    # 当前执行状态。
    status: str
    # 执行失败的错误说明。
    error: str | None = None
    # 该素材处理后生成的成品列表。
    outputs: list[AssetOut] = []


class BatchOut(BaseModel):
    """批处理任务及逐项结果。"""

    # 工具任务的执行信息。
    run: RunOut
    # 逐项处理或导出的结果列表。
    items: list[BatchItemOut] = []
    # 创建时间。
    created_at: datetime
