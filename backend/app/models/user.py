from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import UUIDBase


class User(UUIDBase):
    """用户账号及登录凭据。"""

    __tablename__ = "users"

    # 登录用户名。
    username: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    # 登录密码的哈希值。
    password_hash: Mapped[str] = mapped_column(String(128))
