from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import Protocol

ProgressCallback = Callable[[int, str], Awaitable[None]]


class ProviderError(Exception):
    """模型服务不可用或返回失败。"""


@dataclass(frozen=True)
class GenerateRequest:
    """传递给图像服务的生成参数。"""

    # 图片生成或编辑的提示词。
    prompt: str
    # 目标图片宽度，单位为像素。
    width: int
    # 目标图片高度，单位为像素。
    height: int
    # 需要生成的图片数量。
    count: int = 1
    # 需要避免生成内容的提示词。
    negative_prompt: str | None = None
    # 用于复现生成结果的随机种子。
    seed: int | None = None
    # 参考图以原始字节传入，由各 adapter 决定编码方式
    references: list[bytes] = field(default_factory=list)


@dataclass(frozen=True)
class EditRequest:
    """传递给图像服务的编辑参数。"""

    # 图片生成或编辑的提示词。
    prompt: str
    # 待编辑图片的原始字节。
    image: bytes
    # 需要生成的图片数量。
    count: int = 1
    # 目标输出宽度，单位为像素。
    width: int | None = None
    # 目标输出高度，单位为像素。
    height: int | None = None
    # 需要避免生成内容的提示词。
    negative_prompt: str | None = None


class ImageProvider(Protocol):
    """图像生成、编辑和放大服务的统一接口。"""

    # 图像服务提供方的名称。
    name: str

    async def generate(
        self, request: GenerateRequest, on_progress: ProgressCallback | None = None
    ) -> list[bytes]:
        """根据生成参数返回图片的原始字节列表。"""
        ...

    async def edit(
        self, request: EditRequest, on_progress: ProgressCallback | None = None
    ) -> list[bytes]:
        """根据提示词和目标尺寸编辑已有图片。"""
        ...

    async def upscale(
        self, image: bytes, scale: int, on_progress: ProgressCallback | None = None
    ) -> bytes:
        """提高分辨率，不改变构图。"""
        ...
