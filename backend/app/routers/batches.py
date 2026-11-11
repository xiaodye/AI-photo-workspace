import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import Response

from app.db import SessionDep
from app.deps import CurrentUser
from app.schemas.batch import BatchIn, BatchOut
from app.schemas.run import RunOut
from app.services import batch, runs, tools
from app.services.batch import EmptyBatch, UnknownBatchAsset
from app.services.runs import RunNotFound
from app.services.tools import InvalidParams
from app.tools.batch import BATCH_NAME

router = APIRouter(prefix="/batches", tags=["batches"])


@router.post("", status_code=status.HTTP_202_ACCEPTED)
async def create_batch(payload: BatchIn, user: CurrentUser, session: SessionDep) -> RunOut:
    """提交批量图片处理任务。"""
    try:
        await batch.require_assets(session, user.id, payload.asset_ids)
    except UnknownBatchAsset as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "素材不存在") from exc
    try:
        run = await tools.submit(session, user.id, BATCH_NAME, payload.model_dump(mode="json"))
    except InvalidParams as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc
    return RunOut.of(run)


@router.get("")
async def list_batches(
    user: CurrentUser,
    session: SessionDep,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
) -> list[BatchOut]:
    """返回当前用户的批处理任务列表。"""
    records = await batch.list_for_user(session, user.id, limit)
    return [await batch.detail(session, record) for record in records]


@router.get("/{run_id}")
async def get_batch(run_id: uuid.UUID, user: CurrentUser, session: SessionDep) -> BatchOut:
    """返回批处理任务及逐项处理结果。"""
    try:
        run = await runs.get(session, run_id, user.id)
    except RunNotFound as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "任务不存在") from exc
    if run.tool != BATCH_NAME:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "任务不存在")
    return await batch.detail(session, run)


@router.get("/{run_id}/export")
async def export_batch(run_id: uuid.UUID, user: CurrentUser, session: SessionDep) -> Response:
    """打包并下载批处理成品。"""
    try:
        run = await runs.get(session, run_id, user.id)
    except RunNotFound as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "任务不存在") from exc
    if run.tool != BATCH_NAME:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "任务不存在")
    try:
        packed = await batch.pack(session, run)
    except EmptyBatch as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, "还没有可打包的结果") from exc
    return Response(
        content=packed.data,
        media_type="application/zip",
        headers={"Content-Disposition": packed.disposition},
    )
