# 东亚电力公司上线部署说明

本项目是 Next.js + Payload CMS 企业站，后台地址为 `/admin`，数据库使用 PostgreSQL。

## 服务器要求

- Node.js 20 LTS 或 22 LTS
- PostgreSQL 16 或兼容版本
- 可运行常驻 Node 进程的环境，例如 PM2、Docker、宝塔 Node 项目、systemd
- 反向代理建议使用 Nginx，将域名代理到 `127.0.0.1:3000`

## 上传包内容

上传包位于 `release/` 目录，文件名类似：

```bash
east-asia-power-upload-YYYYMMDD-HHMMSS.zip
```

压缩包不包含本地开发文件：`node_modules`、`.next`、测试截图、Playwright 报告、采集分析资源包、`.env`、Git 元数据等。

## 部署步骤

1. 上传并解压压缩包到服务器目录，例如：

   ```bash
   mkdir -p /www/wwwroot/east-asia-power
   unzip east-asia-power-upload-*.zip -d /www/wwwroot/east-asia-power
   cd /www/wwwroot/east-asia-power
   ```

2. 安装依赖并生成生产构建：

   ```bash
   npm ci
   npm run build
   ```

3. 创建 `.env`：

   ```bash
   cp .env.example .env
   ```

   必填项：

   ```env
   DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/east_asia_power
   PAYLOAD_SECRET=请替换为32位以上随机字符串
   PAYLOAD_PUBLIC_SERVER_URL=https://你的域名
   ```

4. 首次部署时初始化内容和管理员账号：

   ```bash
   npm run seed
   ```

   如需自定义管理员账号，先在 `.env` 中设置：

   ```env
   SEED_ADMIN_EMAIL=admin@example.com
   SEED_ADMIN_PASSWORD=请设置强密码
   ```

5. 启动生产服务：

   ```bash
   npm run start
   ```

   使用 PM2 示例：

   ```bash
   pm2 start npm --name east-asia-power -- run start
   pm2 save
   ```

6. 配置 Nginx 反向代理到：

   ```text
   http://127.0.0.1:3000
   ```

## 验证

部署完成后访问：

- 中文首页：`https://你的域名/zh`
- 英文首页：`https://你的域名/en`
- 德文首页：`https://你的域名/de`
- 后台管理：`https://你的域名/admin`

服务器本机快速检查：

```bash
curl -I http://127.0.0.1:3000/zh
curl -I http://127.0.0.1:3000/admin
```

本地打包前已通过：

```bash
npm run lint
npm run build
npm run test:e2e
```
