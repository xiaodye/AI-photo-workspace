import enum
import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import TIMESTAMPTZ, UUIDBase, enum_column


class RunStatus(enum.StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELED = "canceled"

    @property
    def is_terminal(self) -> bool:
        return self in {RunStatus.SUCCEEDED, RunStatus.FAILED, RunStatus.CANCELED}


class ToolRun(UUIDBase):
    """单次工具调用的执行记录。run id 同时作为队列任务 ID，重复投递不会重复执行。"""

    __tablename__ = "tool_runs"

    # 所属用户的标识。
    user_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # 从创作页直接发起生成时还没有会话，产出图片届时不进任何图片墙
    session_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("edit_sessions.id", ondelete="CASCADE"), default=None
    )
    # 工具的注册名称。
    tool: Mapped[str] = mapped_column(String(48))
    # 当前执行状态。
    status: Mapped[RunStatus] = mapped_column(enum_column(RunStatus), default=RunStatus.QUEUED)
    # 任务完成进度，取值为 0～100。
    progress: Mapped[int] = mapped_column(default=0)
    # 当前执行阶段的显示文本。
    stage: Mapped[str] = mapped_column(String(64), default="")
    # 工具调用的参数。
    params: Mapped[dict] = mapped_column(JSONB, default=dict)
    # 执行结果数据。
    result: Mapped[dict] = mapped_column(JSONB, default=dict)
    # 执行失败的错误说明。
    error: Mapped[str | None] = mapped_column(Text, default=None)
    # 任务已重试的次数。
    retries: Mapped[int] = mapped_column(default=0)
    # 任务开始执行的时间。
    started_at: Mapped[datetime | None] = mapped_column(TIMESTAMPTZ, default=None)
    # 任务结束的时间。
    finished_at: Mapped[datetime | None] = mapped_column(TIMESTAMPTZ, default=None)
