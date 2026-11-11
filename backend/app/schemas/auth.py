import uuid

from pydantic import BaseModel, Field, field_validator


class Credentials(BaseModel):
    """注册或登录使用的账号凭据。"""

    # 登录用户名。
    username: str = Field(min_length=3, max_length=32)
    # 用于登录或注册的密码。
    password: str = Field(min_length=6, max_length=64)

    @field_validator("username")
    @classmethod
    def _normalize(cls, value: str) -> str:
        """规范化并校验用户名。"""
        normalized = value.strip()
        if not normalized.replace("_", "").isalnum():
            raise ValueError("用户名只能包含字母、数字和下划线")
        return normalized


class UserOut(BaseModel):
    """返回给客户端的用户信息。"""

    # 唯一标识。
    id: uuid.UUID
    # 登录用户名。
    username: str

    model_config = {"from_attributes": True}
