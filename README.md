# NewTone V0.1

NewTone V0.1 是一个本地优先的连续小说阅读器，以及由阅读进度驱动的 Phaser 2D 双层世界中枢。

## 技术栈

- React 19 + TypeScript + Vite
- Zustand
- Phaser 3
- IndexedDB (`idb`)
- Zod + JSZip
- Vitest + Playwright

## 本地运行

```bash
npm install
npm run dev
```

构建与验收：

```bash
npm test
npm run lint
npm run build
npm run test:e2e
```

Playwright 使用本机 Chrome，并把视觉证据写入 `artifacts/playtest/`。

## 产品闭环

1. Landing 选择语言并开始或继续阅读。
2. Reader 从 IndexedDB 读取章节，以稳定 block ID 追踪和自动保存位置。
3. 阅读位置经 `WorldResolver` 生成可序列化世界快照。
4. Center 用 Phaser 渲染表世界与里世界；React 负责 HUD、批注和详情。
5. 返回 Reader 时恢复原 block 与滚动位置。

## 内容包

支持 `.newtone` 与 `.zip`。内容包包含：

```text
manifest.json
chapters/*.md
world/world.json
assets/
```

示例内容源位于 `public/sample-content/`，标准 ZIP 由以下命令生成：

```bash
npm run build:sample
```

导入器会先进行 Zod 校验和预览，确认后再写入 IndexedDB。相同作品 ID 会被替换，也可在内容书架导出备份或删除。

## 架构边界

- `src/domain/`：内容、阅读位置、存档与世界状态契约。
- `src/adapters/`：本地内容包、IndexedDB 与浏览器存档。
- `src/reader/`：连续 DOM 阅读流。
- `src/center/runtime/`：薄 Phaser Scene 与可释放的渲染对象。
- `src/center/CenterPage.tsx`：DOM HUD、批注、详情与 Bridge 同步。
- Phaser 不持有业务真相，不读写 IndexedDB 或 Zustand。

## 第一版限制

- 示例内容为单章双语包；架构支持多章，但章节目录 UI 仍保持最小化。
- 世界地图使用内置程序化手绘占位图，不包含旧项目素材。
- 远程 `ContentPort` 已保留明确端口，第一版不连接外部服务。
- 不包含账号、云存档、支付、CMS 或社区功能。
