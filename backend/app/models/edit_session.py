import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import TIMESTAMPTZ, UUIDBase


class EditSession(UUIDBase):
    """编辑页左栏的一条对话。document 是该会话当前画布的权威描述。"""

    __tablename__ = "edit_sessions"

    # 所属用户的标识。
    user_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # 编辑会话的显示标题。
    title: Mapped[str] = mapped_column(String(80))
    # 创建会话时的原始素材标识。
    original_asset_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("assets.id", ondelete="RESTRICT")
    )
    # 当前采用的素材标识。
    current_asset_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("assets.id", ondelete="RESTRICT")
    )
    # 采用候选或切换图片墙时递增，用于判定旧选区已失效
    revision: Mapped[int] = mapped_column(default=1)
    # 指向当前撤销位置；新操作会截断该序号之后的重做分支
    history_seq: Mapped[int] = mapped_column(default=1)
    # 当前画布的图层文档。
    document: Mapped[dict] = mapped_column(JSONB, default=dict)
    # 最近更新时间。
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMPTZ, server_default=func.now(), onupdate=func.now()
    )


class SessionAsset(Base):
    """会话图片墙。未采用的候选一并留存，切换当前图不覆盖任何已有结果。"""

    __tablename__ = "session_assets"

    # 所属编辑会话的标识。
    session_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("edit_sessions.id", ondelete="CASCADE"), primary_key=True
    )
    # 关联素材的标识。
    asset_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("assets.id", ondelete="CASCADE"), primary_key=True
    )
    # 同一事务内插入多行的时间戳相同，靠显式序号保证图片墙顺序稳定
    position: Mapped[int]
