# Piston Letter Studio

一个可以替换字母、编辑行程曲线、导出网页动画和 GIF 的纯前端工作台。

## 生成器定版 v1.2.0

生成器功能在此版本定版。默认使用用户确认的
[minecraft-original-0.94s.json](assets/presets/minecraft-original-0.94s.json)：
MC 原版、0.94 秒周期、100% 行程、透明背景，以及文件中完整的非对称行程曲线。
页面默认启动动画并尝试播放音乐；受浏览器有声自动播放策略限制时，在首次点击或按 Enter / 空格后启动音乐。
手动暂停后不会被后续页面操作重新播放。

此版本首次打开采用上述默认值，之后仍会记住本机编辑；旧版本的本机配置不覆盖本次定版默认值。
导出的独立组件保留当前配置；未传配置的裸组件维持 OOOO 默认值。
正式版本：[v1.2.0](https://github.com/XJH-Jorhai/piston-letter-studio/releases/tag/v1.2.0)。

- 演示：<https://xjh-jorhai.github.io/piston-letter-studio/>
- 最小双实例嵌入示例：<https://xjh-jorhai.github.io/piston-letter-studio/examples/embed.html>
- 三套完整 A–Z：短体金属、拉长金属、南瓜造型，共 78 个透明 PNG。
- 头部、躯干、左侧、右侧四个字母分别可调；额外保留 DDMC 的镜像左 D。
- 两侧字母同步伸缩，中间字母反向联动。底座固定，收回终点没有外露活塞臂。
- 可编辑完整周期的 Bézier 曲线，独立控制伸出、停留、收回。
- GIF 在浏览器本地生成和下载，无需服务器上传或聊天代理。
- 独立 HTML 导出内嵌所选素材和组件，可离线播放。
- 页面播放器使用用户提供的 “Sam Gellaitry - Assumptions.mp3”，支持自动播放、暂停、进度和音量控制；有声自动播放遵守浏览器策略。音源位于 assets/audio/，不加入字母组件的导出文件。
- 新增 [MC 原版预设](https://xjh-jorhai.github.io/piston-letter-studio/?mode=minecraft)：雕刻南瓜、四个 T 形铁块和三个固定活塞，原版 16×16 像素纹理。

## MC 原版

在编辑器中点击“MC 原版”即可切换。它沿用当前的周期、背景与完整曲线，行程固定为 100%；
OOOO 按钮可以切回字母，四个位置仍可自由选择 A–Z。JSON、GIF 和独立 HTML 都保留选择的造型。

原版结构高三格，行程固定为 100%（一格），包括组件 API、导入配置和两种导出。字母版的行程仍可自由调节。左右铁块同步，中间上下两个铁块反向联动；
南瓜头固定，三个活塞底座固定，活塞杆和活塞头随铁块伸缩，收回时杆完全缩入底座。
渲染采用逐像素深度检测，WebGL 加速与 CPU 回退均按实际几何位置遮挡。
这是动画示意，不模拟游戏中的红石逻辑。

组件也支持直接指定：

    <piston-letters mode="minecraft" period="0.67" stroke="100"></piston-letters>

或设置 config.mode = 'minecraft'；设为 'letters' 返回字母造型。
本预设的方块尺寸固定，四个字母选择仅用于字母造型。
材质来源、版本及归属见 [assets/minecraft/README.md](assets/minecraft/README.md)。

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

Minecraft 原版纹理来自 [InventivetalentDev/minecraft-assets](https://github.com/InventivetalentDev/minecraft-assets/tree/1.21.4/assets/minecraft/textures/block) 的 Java Edition 1.21.4 提取镜像，归 Mojang / Microsoft 所有；
详见 [原版材质来源](assets/minecraft/README.md)。

GitHub Pages 可直接从 main 分支根目录部署，.nojekyll 已提供。dist/ 是用于其他静态托管的构建输出。
