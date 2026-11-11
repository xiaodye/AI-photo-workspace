import uuid

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import UUIDBase

HISTORY_LIMIT = 20


class EditHistory(UUIDBase):
    """线性编辑记录，只保留最近 HISTORY_LIMIT 条，不提供版本树与分支。"""

    __tablename__ = "edit_history"
    __table_args__ = (UniqueConstraint("session_id", "seq"),)

    # 所属用户的标识。
    user_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # 所属编辑会话的标识。
    session_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("edit_sessions.id", ondelete="CASCADE"), index=True
    )
    # 编辑操作在会话历史中的序号。
    seq: Mapped[int]
    # 编辑操作名称。
    action: Mapped[str] = mapped_column(String(48))
    # 工具调用的参数。
    params: Mapped[dict] = mapped_column(JSONB, default=dict)
    # 操作结果及用于恢复画布的历史快照。
    result: Mapped[dict] = mapped_column(JSONB, default=dict)
