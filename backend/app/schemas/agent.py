import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, field_validator

from app.models import AgentRun
from app.models.tool_run import RunStatus
from app.tools import label_of

MAX_MESSAGE = 1000


class MessageIn(BaseModel):
    """提交给 Agent 的编辑指令。"""

    # 用户提交的自然语言编辑指令。
    text: Annotated[str, Field(min_length=1, max_length=MAX_MESSAGE)]

    @field_validator("text")
    @classmethod
    def _require_text(cls, value: str) -> str:
        """清理编辑指令空白并校验内容。"""
        value = value.strip()
        if not value:
            raise ValueError("指令不能为空")
        return value


class PlanStepOut(BaseModel):
    """计划中单个工具步骤的执行信息。"""

    # 唯一标识。
    id: str
    # 工具的注册名称。
    tool: str
    # 面向用户显示的名称。
    label: str
    # 执行前需要完成的步骤标识列表。
    depends_on: list[str] = []
    # 步骤对应的工具任务标识。
    run_id: uuid.UUID | None = None
    # 当前执行状态。
    status: str = "pending"

    @classmethod
    def of(cls, step: dict) -> "PlanStepOut":
        """将业务记录转换为PlanStepOut 响应数据。"""
        run_id = step.get("run_id")
        return cls(
            id=step.get("id") or step["tool"],
            tool=step["tool"],
            label=label_of(step["tool"], step.get("params")),
            depends_on=list(step.get("depends_on") or []),
            run_id=uuid.UUID(run_id) if run_id else None,
            status=step.get("status") or ("succeeded" if run_id else "pending"),
        )


class TurnOut(BaseModel):
    """一轮 Agent 对话的计划与执行结果。"""

    # 唯一标识。
    id: uuid.UUID
    # 画布修订号，用于校验选区与文档版本。
    revision: int
    # 用户本轮提交的编辑目标。
    goal: str
    # Agent 向用户返回的说明。
    reply: str
    # 当前执行状态。
    status: RunStatus
    # 执行失败的错误说明。
    error: str | None
    # 创建时间。
    created_at: datetime
    # 本轮计划的步骤及执行状态。
    steps: list[PlanStepOut] = []

    @classmethod
    def of(cls, turn: AgentRun) -> "TurnOut":
        """将业务记录转换为TurnOut 响应数据。"""
        return cls(
            id=turn.id,
            revision=turn.revision,
            goal=turn.goal,
            reply=turn.reply,
            status=turn.status,
            error=turn.error,
            created_at=turn.created_at,
            steps=[PlanStepOut.of(step) for step in turn.plan],
        )
