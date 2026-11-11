"""画布文档结构。工具只修改此文档，像素合成由渲染环节按文档执行。"""

import enum
import uuid

from pydantic import BaseModel, Field

from app.models import Asset

BASE_LAYER_ID = "base"
BACKGROUND_LAYER_ID = "background"
SUBJECT_LAYER_ID = "subject"


class LayerKind(enum.StrEnum):
    IMAGE = "image"
    TEXT = "text"
    SHAPE = "shape"


class Transform(BaseModel):
    """相对画布左上角的位置与形变，缩放为倍率而非像素。"""

    # 相对画布左上角的横坐标，单位为像素。
    x: float = 0
    # 相对画布左上角的纵坐标，单位为像素。
    y: float = 0
    # 水平方向的绝对缩放倍率。
    scale_x: float = 1
    # 垂直方向的绝对缩放倍率。
    scale_y: float = 1
    # 绝对旋转角度，单位为度。
    rotation: float = 0


class Layer(BaseModel):
    """画布中的单个图层。"""

    # 唯一标识。
    id: str
    # 图层类型：图片、文字或形状。
    kind: LayerKind
    # 显示名称。
    name: str
    # 图层原始宽度，单位为像素。
    width: int
    # 图层原始高度，单位为像素。
    height: int
    # 关联素材的标识。
    asset_id: uuid.UUID | None = None
    # 图层的位置、缩放和旋转参数。
    transform: Transform = Field(default_factory=Transform)
    # 图层不透明度，取值为 0～1。
    opacity: float = 1
    # 图层是否可见。
    visible: bool = True
    # 图层是否锁定。
    locked: bool = False
    # 用于识别重复拆层对象的选区指纹。
    source_hash: str | None = None
    # 文本内容。
    text: str | None = None
    # 文字字号，单位为像素。
    font_size: float = 24
    # 文字填充颜色。
    fill: str = "#141414"


class LayerDocument(BaseModel):
    """画布尺寸与图层集合。"""

    # 画布宽度，单位为像素。
    width: int
    # 画布高度，单位为像素。
    height: int
    # 按堆叠顺序排列的图层列表。
    layers: list[Layer] = Field(default_factory=list)


class LayerMissing(Exception):
    """指定图层不存在，或画布上没有可操作的图像层。"""


def resolve_layer(document: LayerDocument, layer_id: str | None) -> Layer:
    """按 id 取图层，找不到时按图层名兜底，Agent 可以直接说「物体2」。

    未指定时取最上层可见图像层，供界面与 Agent 共用默认目标。
    """
    if layer_id:
        wanted = layer_id.strip()
        for layer in document.layers:
            if layer.id == wanted:
                return layer
        for layer in document.layers:
            if layer.name == wanted:
                return layer
        raise LayerMissing(f"图层不存在：{layer_id}")

    for layer in reversed(document.layers):
        if layer.kind is LayerKind.IMAGE and layer.visible:
            return layer
    raise LayerMissing("没有可操作的图层")


def document_of(asset: Asset) -> LayerDocument:
    """以整张图片作为底图建立文档。底图锁定，拆层后才会被主体与背景层取代。"""
    return LayerDocument(
        width=asset.width,
        height=asset.height,
        layers=[
            Layer(
                id=BASE_LAYER_ID,
                kind=LayerKind.IMAGE,
                name="底图",
                width=asset.width,
                height=asset.height,
                asset_id=asset.id,
                locked=True,
            )
        ],
    )
