import io
from dataclasses import dataclass

from PIL import Image

from app.config import get_settings


@dataclass(frozen=True)
class TextBox:
    """识别出的文字内容及其在图片中的边界框。"""

    # 识别出的文字内容。
    text: str
    # 文字框左边界的像素坐标。
    x: int
    # 文字框上边界的像素坐标。
    y: int
    # 文字框宽度，单位为像素。
    width: int
    # 文字框高度，单位为像素。
    height: int


_engine = None


def detect_text(data: bytes) -> list[TextBox]:
    """识别画面中的文字框。测试或未安装 OCR 时返回空列表。"""
    if get_settings().ocr_provider == "none":
        return []
    try:
        boxes = _rapidocr(data)
    except Exception:
        if get_settings().ocr_provider == "rapidocr":
            raise
        return []
    return [box for box in boxes if box.text.strip() and box.width > 2 and box.height > 2]


def _rapidocr(data: bytes) -> list[TextBox]:
    import numpy as np
    from rapidocr_onnxruntime import RapidOCR

    global _engine
    if _engine is None:
        _engine = RapidOCR()

    image = np.array(Image.open(io.BytesIO(data)).convert("RGB"))
    result, _ = _engine(image)
    if not result:
        return []

    boxes: list[TextBox] = []
    for item in result:
        quad, text, _score = item[0], item[1], item[2]
        xs = [point[0] for point in quad]
        ys = [point[1] for point in quad]
        left, top = int(min(xs)), int(min(ys))
        boxes.append(
            TextBox(
                text=str(text).strip(),
                x=left,
                y=top,
                width=max(1, int(max(xs) - left)),
                height=max(1, int(max(ys) - top)),
            )
        )
    return boxes
