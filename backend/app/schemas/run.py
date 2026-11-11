import uuid
from typing import Annotated

from pydantic import BaseModel, Field, field_validator

from app.models.tool_run import RunStatus, ToolRun
from app.ratios import Ratio
from app.schemas.asset import AssetOut

MAX_PROMPT = 1500
MAX_REFERENCES = 3


class GenerateIn(BaseModel):
    """图片生成请求。"""

    # 图片生成或编辑的提示词。
    prompt: Annotated[str, Field(min_length=1, max_length=MAX_PROMPT)]
    # 输出图片的宽高比。
    ratio: Ratio = Ratio.SQUARE
    # 需要生成的图片数量。
    count: Annotated[int, Field(ge=1, le=6)] = 4
    # 需要避免生成内容的提示词。
    negative_prompt: Annotated[str | None, Field(max_length=MAX_PROMPT)] = None
    # 用于复现生成结果的随机种子。
    seed: Annotated[int | None, Field(ge=0, le=2147483647)] = None
    # 参考素材的标识列表。
    reference_asset_ids: Annotated[list[uuid.UUID], Field(max_length=MAX_REFERENCES)] = []

    @field_validator("prompt")
    @classmethod
    def _require_prompt(cls, value: str) -> str:
        """清理提示词空白并校验内容。"""
        value = value.strip()
        if not value:
            raise ValueError("提示词不能为空")
        return value

    @field_validator("negative_prompt")
    @classmethod
    def _blank_to_none(cls, value: str | None) -> str | None:
        """规范化可选提示词并将空内容转为空值。"""
        return value.strip() or None if value else None


class RunOut(BaseModel):
    """工具任务的执行状态与结果。"""

    # 唯一标识。
    id: uuid.UUID
    # 工具的注册名称。
    tool: str
    # 当前执行状态。
    status: RunStatus
    # 任务完成进度，取值为 0～100。
    progress: int
    # 当前执行阶段的显示文本。
    stage: str
    # 执行失败的错误说明。
    error: str | None
    # 图片生成或编辑的提示词。
    prompt: str | None = None
    # 任务生成的候选素材。
    candidates: list[AssetOut] = []
    # 执行结果数据。
    result: dict = {}

    @classmethod
    def of(cls, run: ToolRun, candidates: list[AssetOut] | None = None) -> "RunOut":
        """将业务记录转换为RunOut 响应数据。"""
        return cls(
            id=run.id,
            tool=run.tool,
            status=run.status,
            progress=run.progress,
            stage=run.stage,
            error=run.error,
            prompt=run.params.get("prompt"),
            candidates=candidates or [],
            result=run.result or {},
        )
