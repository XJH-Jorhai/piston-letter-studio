# Piston Letter Studio

一个可以替换字母、编辑行程曲线、导出网页动画和 GIF 的纯前端工作台。

- 演示：<https://xjh-jorhai.github.io/piston-letter-studio/>
- 三套完整 A–Z：短体金属、拉长金属、南瓜造型，共 78 个透明 PNG。
- 头部、躯干、左侧、右侧四个字母分别可调；额外保留 DDMC 的镜像左 D。
- 两侧字母同步伸缩，中间字母反向联动。底座固定，收回终点没有外露活塞臂。
- 可编辑完整周期的 Bézier 曲线，独立控制伸出、停留、收回。
- GIF 在浏览器本地生成和下载，无需服务器上传或聊天代理。
- 独立 HTML 导出内嵌所选素材和组件，可离线播放。

## 本地运行

需要 Node.js 20+。

    npm run dev
    # http://127.0.0.1:4173

运行时不需要安装依赖；GIF 编码器已固定版本并随仓库提供。

    npm test
    npm run build

浏览器验收：

    npm install
    npx playwright install chromium
    npm run dev
    # 另一个终端，按实际端口设置 BASE_URL：
    BASE_URL=http://127.0.0.1:4173/ npm run test:browser

Windows 会优先使用已安装的 Edge。PowerShell 可使用 $env:BASE_URL 设置测试地址。

## 用法一：导出单文件动画

1. 在编辑器中选择四个字母，修改周期、行程和曲线。
2. 点击“导出网页动画”，下载独立 HTML。
3. 直接打开，或把文件放到自己的网站中：

    <iframe src="./my-piston-animation.html"
      title="字母动画"
      style="width:360px;max-width:100%;aspect-ratio:1;border:0"
      loading="lazy"></iframe>

文件中已经包含所选字母和活塞，无需连接本演示页。

## 用法二：Web Component

    <script type="module"
      src="https://xjh-jorhai.github.io/piston-letter-studio/src/piston-letters.js"></script>

    <piston-letters id="logo" left="G" right="T" body="M" top="C"
      period="0.67" stroke="160"
      style="width:360px;max-width:100%"></piston-letters>

period 是一次完整伸出、收回的秒数；stroke 是行程百分比。设置 paused 属性可从静止状态开始。组件尊重系统的减少动画偏好。

    const logo = document.querySelector('#logo');
    await logo.ready;
    logo.pause();
    logo.renderAt(0.7); // 周期中的归一化时间
    logo.play();

    const config = logo.config;
    config.letters.top = 'A';
    config.period = 1.2;
    await logo.setConfig(config);

提供完整配置时，也可使用 JSON config 属性，或 config-id 指向同一文档内的 application/json 脚本。编辑器的“嵌入与用法”会生成当前配置对应的代码。

组件事件：ready、frame（detail.phase 与 detail.position）、animation-error。dispose() 用于彻底释放不用的离屏实例。

## 用法三：下载 GIF

编辑完点击“下载 GIF”。GIF 使用当前素材、背景和曲线，输出 768 × 768 的无限循环动图。透明背景会使用 GIF 的单比特透明，其他背景直接合成到画面中。GIF 时长保留到 10ms，短帧不小于 20ms。

可以导入、导出 JSON 配置。编辑器也自动保存当前浏览器中的配置。

## 曲线数据

curve 是按 t 递增的关键帧数组。t、v 均为 0–1；in 和 out 是独立 Bézier 控制点。起止关键帧固定为 (0,0) 与 (1,0)，保证循环和完全收回。中间的平段表示停留。

    [
      { t: 0,   v: 0, in: null,               out: { t: 0.15, v: 0 } },
      { t: 0.5, v: 1, in: { t: 0.35, v: 1 }, out: { t: 0.65, v: 1 } },
      { t: 1,   v: 0, in: { t: 0.85, v: 0 }, out: null }
    ]

手柄靠近关键帧时会外移显示，虚线连接真实位置；拖动按相对位移处理，避免点选时曲线跳变。也可选择手柄后输入精确坐标。

## 素材目录

    assets/
      letters/compact/A.png … Z.png
      letters/tall/A.png … Z.png
      letters/pumpkin/A.png … Z.png
      variants/D-left.png
      piston-base.png
      manifest.json

manifest.json 保存尺寸和位于实心笔画上的连接点。更换字母时会按连接点定位后方底座；底座在动画周期内保持固定。

三套字母由内置 image_gen 根据已批准的参考贴纸生成，原 G、T、M、C 等素材复用。源图集与提示词见 assets/atlases/ 和 assets/prompts.md。

## 第三方

GIF 编码使用 [gifenc 1.0.3](https://github.com/mattdesl/gifenc)，遵循 MIT 许可，原许可见 vendor/gifenc.LICENSE.md。其他运行时功能无第三方框架依赖。

GitHub Pages 可直接从 main 分支根目录部署，.nojekyll 已提供。dist/ 是用于其他静态托管的构建输出。
