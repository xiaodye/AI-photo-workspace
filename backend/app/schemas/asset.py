import uuid
from datetime import datetime

from pydantic import BaseModel

from app import storage
from app.models import Asset
from app.models.asset import AssetKind, AssetSource


class AssetOut(BaseModel):
    """素材信息及其访问地址。"""

    # 唯一标识。
    id: uuid.UUID
    # 素材的业务分类。
    kind: AssetKind
    # 素材的产生方式。
    source: AssetSource
    # 图片编码格式。
    image_format: str
    # 图片宽度，单位为像素。
    width: int
    # 图片高度，单位为像素。
    height: int
    # 图片文件大小，单位为字节。
    size_bytes: int
    # 图片是否包含透明通道。
    has_alpha: bool
    # 创建时间。
    created_at: datetime
    # 文件的临时签名下载地址。
    url: str

    @classmethod
    def of(cls, asset: Asset) -> "AssetOut":
        """将业务记录转换为AssetOut 响应数据。"""
        return cls(
            id=asset.id,
            kind=asset.kind,
            source=asset.source,
            image_format=asset.image_format,
            width=asset.width,
            height=asset.height,
            size_bytes=asset.size_bytes,
            has_alpha=asset.has_alpha,
            created_at=asset.created_at,
            url=storage.signed_url(asset.storage_key),
        )


class LibraryGroupOut(BaseModel):
    """按编辑会话分组的素材列表。"""

    # 所属编辑会话的标识。
    session_id: uuid.UUID | None
    # 编辑会话的显示标题。
    title: str
    # 最近更新时间。
    updated_at: datetime
    # 素材分组的封面图片。
    cover: AssetOut
    # 关联的素材列表。
    assets: list[AssetOut]
