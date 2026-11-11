import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.asset import AssetKind


class ExportIn(BaseModel):
    """导出会话素材的请求。"""

    # 待处理的素材标识列表。
    asset_ids: list[uuid.UUID] = []


class ExportItemOut(BaseModel):
    """导出清单中的单个图片文件。"""

    # 图片在导出压缩包中的文件名。
    file: str
    # 素材的业务分类。
    kind: str
    # 输出图片的宽高比。
    ratio: str | None = None
    # 图片宽度，单位为像素。
    width: int
    # 图片高度，单位为像素。
    height: int
    # 关联素材的标识。
    asset_id: uuid.UUID | None = None


class ExportManifestOut(BaseModel):
    """导出压缩包的文件清单。"""

    # 编辑会话的显示标题。
    title: str
    # 所属编辑会话的标识。
    session_id: uuid.UUID
    # 创建时间。
    created_at: datetime
    # 逐项处理或导出的结果列表。
    items: list[ExportItemOut]


class ExportOut(BaseModel):
    """导出文件的下载信息。"""

    # 文件的临时签名下载地址。
    url: str
    # 下载文件的名称。
    filename: str
    # 导出文件清单。
    manifest: ExportManifestOut


# 默认打包营销图与投放尺寸；未指定时也只收这两类
EXPORT_KINDS = (AssetKind.MARKETING, AssetKind.EXPORT)
