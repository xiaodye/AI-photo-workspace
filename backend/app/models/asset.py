import enum
import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import UUIDBase, enum_column


class AssetKind(enum.StrEnum):
    ORIGINAL = "original"
    GENERATED = "generated"
    SUBJECT = "subject"
    BACKGROUND = "background"
    MASK = "mask"
    MARKETING = "marketing"
    EXPORT = "export"


class AssetSource(enum.StrEnum):
    UPLOAD = "upload"
    GENERATE = "generate"
    TOOL = "tool"


class Asset(UUIDBase):
    """图片素材及其存储信息。"""

    __tablename__ = "assets"

    # 所属用户的标识。
    user_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # 素材的业务分类。
    kind: Mapped[AssetKind] = mapped_column(enum_column(AssetKind))
    # 素材的产生方式。
    source: Mapped[AssetSource] = mapped_column(enum_column(AssetSource))
    # 图片在对象存储中的文件键。
    storage_key: Mapped[str] = mapped_column(String(255), unique=True)
    # 图片编码格式。
    image_format: Mapped[str] = mapped_column(String(8))
    # 图片宽度，单位为像素。
    width: Mapped[int]
    # 图片高度，单位为像素。
    height: Mapped[int]
    # 图片文件大小，单位为字节。
    size_bytes: Mapped[int]
    # 图片是否包含透明通道。
    has_alpha: Mapped[bool]
