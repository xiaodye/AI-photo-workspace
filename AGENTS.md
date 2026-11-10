# 项目协作指南

本文件适用于整个仓库。默认使用中文沟通；修改前阅读相关实现和当前 Git 差异，保留用户已有改动。

## 项目结构

- `client/`：React、TypeScript、Vite、Konva 前端，使用。
- `backend/`：FastAPI 后端，使用 uv；Python 版本要求以 `backend/pyproject.toml` 为准。
- `backend/app/agent/`：计划生成、校验与编排。
- `backend/app/tools/`：UI 与 Agent 共用的工具定义；新增工具应沿用现有注册机制。
- `backend/app/tasks/`：后台任务；新增 ARQ 任务需在 `TASKS` 中注册。
- `backend/app/providers/`：模型服务抽象，保留 mock 与真实服务的切换能力。
- `backend/migrations/`：Alembic 数据库迁移。
- `backend/tests/`：pytest 测试。
- 根目录 `Dockerfile`、`docker-compose.yml`：多阶段构建及基础设施、部署服务。

## 本地运行

以下命令注明了执行目录。不要覆盖已有 `.env`；首次配置时参考 `.env.example`。

项目根目录启动基础设施：

```bash
docker compose up -d postgres redis minio
```

在 `backend/` 中安装依赖、迁移数据库并启动 API：

```bash
uv sync --all-extras --locked
uv run alembic upgrade head
uv run python -m app
```

另一个终端进入 `backend/`，启动 worker：

```bash
uv run python -m arq app.worker.WorkerSettings
```

在 `client/` 中运行前端：

```bash
pnpm install --frozen-lockfile
pnpm dev
```

前端默认 `http://localhost:7301`，API 默认 `http://localhost:7302`；开发代理转发 `/api`、`/events`。API 与 worker 是两个独立进程。

## 验证要求

根据改动范围执行检查，并如实说明哪些未运行：

```bash
# client/
pnpm lint
pnpm build

# backend/
uv run ruff check .
uv run pytest

# 项目根目录
docker compose --profile deploy config --quiet
git diff --check
```

- 后端测试依赖可用的 PostgreSQL、Redis 和 S3 兼容存储；按需先完成迁移。
- 测试 fixture 使用 mock 图片服务、corner 抠图和禁用 OCR，避免真实模型费用；不要移除这些隔离措施。
- 测试会创建、清理测试账号及相关数据，使用 Redis DB 1；禁止对生产环境执行测试。
- 前端当前没有独立测试脚本，不要声称 `pnpm build` 等同于业务测试。
- 不因已有、不相关的检查错误而扩大修改范围。

## 实现约定

- 保持现有代码风格：后端遵循 Ruff 配置，前端沿用现有组件、Hook、API 模块和状态管理方式。
- 长耗时图像任务通过后台队列执行；保持任务状态、取消/重试及 SSE 事件的一致性。
- 保持认证、资源归属检查和用户隔离；前端与 API 的同源 Cookie 及 SSE 行为不能随意更改。
- 修改数据库结构时添加对应 Alembic 迁移，不直接修改共享数据库代替迁移。
- 默认使用 mock 验证；未经用户授权，不调用收费模型或上传用户素材到第三方服务。
- 依赖变更需同步对应锁文件；前端使用 `pnpm-lock.yaml`，后端使用 `uv.lock`，不要混用 npm 锁文件。
- 不因网络错误盲目升级依赖、关闭 TLS 校验，或修改系统代理与全局包源。

## 目录与部署注意事项

- 前端构建产物位于 `client/dist`，由后端在生产环境同源托管。
- Docker 前端阶段使用 pnpm；产物复制到 `/app/client/dist`，后端工作目录为 `/app/backend`。
- `minio` 是 Compose 中的 S3 兼容存储服务名；具体镜像以 Compose 为准，不要因品牌名不同就更改服务地址。
- 调整目录结构时同时检查 Dockerfile、`.dockerignore`、静态资源路径、脚本和 README。
- `.venv` 默认包含绝对路径，不应提交或随意移动。目录改名后先排查入口脚本和 `VIRTUAL_ENV`；不要擅自删除、重建用户环境。
- `uv run` 不要求手动激活虚拟环境；不要把旧环境警告误判为依赖缺失。
- 验证 Dockerfile 修改时，Compose 配置通过不代表镜像构建通过；说明是否实际构建过。

## 安全与 Git

- 不提交 `.env`、密钥、令牌、`.venv`、`node_modules`、构建产物或运行数据。
- 配置示例只使用占位值；排查时不要输出真实密钥或完整敏感配置。
- 保留原有许可证、版权及第三方归属信息，不因更改仓库名称或 Git 作者而移除。
- 不擅自提交、推送、创建/合并 PR、重写历史或强制推送；仅在用户明确要求时执行。
- 禁止用破坏性 Git 命令清理用户改动。涉及数据删除、卷删除或环境重建时，先确认范围并保留恢复方案。
- 交付说明修改内容、实际验证结果及剩余风险；不要把未验证的功能描述为已正常运行。

## 文档查询

涉及库、框架、SDK、API、CLI 或云服务的具体用法时，使用 Context7 获取当前文档：

1. `npx ctx7@latest library "官方名称" "具体问题"`，先解析库 ID。
2. `npx ctx7@latest docs /org/project "具体概念"`，根据结果查询。
3. 每个问题最多三条查询命令；不在查询中包含凭据或私有代码。

纯业务逻辑、一般重构和代码审查不必查询。查询失败或限额时明确说明，不把推测当作最新文档结论。
