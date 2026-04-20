# 味迹 TasteVerse

个人品鉴记录 + 3D 星图可视化应用。邮箱验证码登录，每个账号的数据独立存储在 localStorage；保存品鉴时同步到 EverOS 云端记忆。

## 本地开发

```bash
npm install
npm run dev     # http://localhost:5173
```

注意：`/api/everos` 是 Vercel Serverless Function，本地 `npm run dev` 不会运行它。想在本地也触发云端同步：`npm i -g vercel && vercel dev`。

## 部署（Vercel）

在 Vercel 导入此仓库，框架会被自动识别为 Vite。配置环境变量：

| Variable | Example |
|---|---|
| `EVEROS_UPSTREAM` | `https://api.evermind.ai/api/v1` |
| `EVEROS_API_KEY`  | 在 https://everos.evermind.ai/api-keys 生成的 key（必填） |

配完环境变量后必须去 Deployments → 最新部署 → Redeploy 才会生效。

## 目录结构

```
src/
├── App.jsx                      # DOM 壳，JSX 映射原 HTML body
├── main.jsx                     # React 18 入口
├── lib/
│   ├── bootstrap.js             # 把 three / 3d-force-graph 挂到 window
│   └── tasteverse.js            # 核心逻辑（3D 图 / 登录 / EverOS / 存储 …）
├── sommelier/
│   ├── AISommelier.jsx          # AI 品鉴师面板（"AI 品鉴师" tab）
│   ├── sommelier-engine.js      # 对话 / 推荐引擎
│   └── sommelier.css            # 品鉴师面板样式
└── styles/global.css            # 逐字移植的原 <style>

api/everos/[...path].js          # EverOS 云端代理（绕过 CORS）
```
