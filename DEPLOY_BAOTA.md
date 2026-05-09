# 东亚电力公司宝塔部署步骤

本项目是 `Next.js 16 + Payload CMS + PostgreSQL` 企业站，生产环境需要常驻 Node 进程。宝塔里建议用“Node 项目”管理进程，再用 Nginx 反向代理到 Node 服务端口。

## 一、服务器环境

在宝塔面板安装：

- Nginx
- PostgreSQL，或使用外部 PostgreSQL 数据库
- Node.js 版本管理器，建议 Node.js 22 LTS，也可用 Node.js 20 LTS
- PM2 管理器，或宝塔自带 Node 项目管理

服务器目录示例：

```bash
/www/wwwroot/east-asia-power
```

Node 版本要求：

```bash
node -v
npm -v
```

建议 Node 版本为 `v20.9.0+` 或 `v22.x`。

## 二、上传代码包

本地生成的上传包在项目 `release/` 目录中，文件名类似：

```bash
east-asia-power-baota-YYYYMMDD-HHMMSS.zip
```

在宝塔“文件”中进入：

```bash
/www/wwwroot/east-asia-power
```

上传压缩包并解压。也可以用命令：

```bash
mkdir -p /www/wwwroot/east-asia-power
unzip east-asia-power-baota-*.zip -d /www/wwwroot/east-asia-power
cd /www/wwwroot/east-asia-power
```

压缩包不会包含本机运行目录和敏感文件，例如 `.env`、`node_modules`、`.next`、测试截图、测试报告、Git 目录。

## 三、创建 PostgreSQL 数据库

在宝塔 PostgreSQL 管理里创建：

- 数据库名：`east_asia_power`
- 用户名：自定义，例如 `east_asia_power`
- 密码：使用强密码
- 编码：`UTF8`

如果数据库不在本机，把主机地址和端口替换成实际 PostgreSQL 地址。

## 四、配置环境变量

在项目目录创建 `.env`：

```bash
cd /www/wwwroot/east-asia-power
cp .env.example .env
```

编辑 `.env`，至少修改这些值：

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://数据库用户:数据库密码@127.0.0.1:5432/east_asia_power
PAYLOAD_SECRET=换成32位以上随机字符串
PAYLOAD_PUBLIC_SERVER_URL=https://你的域名
SEED_ADMIN_EMAIL=admin@你的域名
SEED_ADMIN_PASSWORD=换成后台强密码
```

`PAYLOAD_SECRET` 必须使用随机长字符串，不要继续使用示例值。

## 五、安装依赖并构建

在宝塔终端进入项目目录：

```bash
cd /www/wwwroot/east-asia-power
npm ci
npm run build
```

本项目的 `build` 脚本使用：

```bash
next build --webpack
```

这样可以避开部分服务器或本地环境中 Turbopack 原生绑定不完整导致的构建失败。

## 六、初始化后台账号和默认内容

首次部署执行一次：

```bash
npm run seed
```

默认内容会写入 PostgreSQL。后台账号来自 `.env` 中的：

```env
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
```

以后如果只是更新代码，一般不需要重复执行 `npm run seed`。

## 七、启动 Node 服务

方式一：宝塔 Node 项目

1. 宝塔左侧进入“网站”或“Node 项目”。
2. 添加 Node 项目。
3. 项目目录选择 `/www/wwwroot/east-asia-power`。
4. 运行目录选择项目根目录。
5. 启动命令填写：

   ```bash
   npm run start
   ```

6. 端口填写 `3000`。
7. 环境变量可在面板里填，也可以直接使用项目根目录 `.env`。
8. 启动项目，并设置开机自启。

方式二：PM2

```bash
cd /www/wwwroot/east-asia-power
pm2 start npm --name east-asia-power -- run start
pm2 save
pm2 startup
```

检查本机服务：

```bash
curl -I http://127.0.0.1:3000/zh
curl -I http://127.0.0.1:3000/admin
```

## 八、配置域名和反向代理

在宝塔“网站”中新建站点，绑定域名，例如：

```text
www.example.com
example.com
```

站点根目录可以选择：

```bash
/www/wwwroot/east-asia-power
```

然后在站点设置中配置反向代理：

- 目标 URL：`http://127.0.0.1:3000`
- 发送域名：`$host`
- 开启 WebSocket 支持

如果手写 Nginx 配置，可参考：

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

## 九、开启 HTTPS

在宝塔站点设置里申请 SSL 证书，成功后开启：

- 强制 HTTPS
- HTTP/2

然后把 `.env` 中的地址改成 HTTPS 域名：

```env
PAYLOAD_PUBLIC_SERVER_URL=https://你的域名
```

改完后重启 Node 项目。

## 十、上线验证

浏览器访问：

- 中文首页：`https://你的域名/zh`
- 英文首页：`https://你的域名/en`
- 德文首页：`https://你的域名/de`
- 后台管理：`https://你的域名/admin`

服务器快速检查：

```bash
curl -I http://127.0.0.1:3000/zh
curl -I http://127.0.0.1:3000/en
curl -I http://127.0.0.1:3000/de
curl -I http://127.0.0.1:3000/admin
```

## 十一、更新代码流程

以后更新网站：

```bash
cd /www/wwwroot/east-asia-power
unzip -o east-asia-power-baota-新版本.zip -d /www/wwwroot/east-asia-power
npm ci
npm run build
pm2 restart east-asia-power
```

如果使用宝塔 Node 项目管理，则在面板里重启该 Node 项目。

## 常见问题

1. `npm run build` 内存不够  
   宝塔终端执行：

   ```bash
   export NODE_OPTIONS="--max-old-space-size=8000"
   npm run build
   ```

2. 数据库连接失败  
   检查 `.env` 的 `DATABASE_URL`，确认 PostgreSQL 用户、密码、主机、端口、数据库名正确，并确认服务器防火墙允许连接。

3. 后台打不开或登录异常  
   确认 `PAYLOAD_SECRET` 已设置，`PAYLOAD_PUBLIC_SERVER_URL` 是当前正式域名，修改后重启 Node 服务。

4. 页面 502  
   先检查 Node 服务是否运行：

   ```bash
   pm2 list
   curl -I http://127.0.0.1:3000/zh
   ```

   如果 Node 服务未启动，查看宝塔 Node 项目日志或 PM2 日志：

   ```bash
   pm2 logs east-asia-power
   ```
