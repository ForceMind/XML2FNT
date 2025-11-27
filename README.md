# XML 转 FNT 工具 (Laya 专用版)

这是一个简单的网页工具，用于将 AngelCode BMFont 的 XML 格式字体描述文件转换为 **Laya 游戏引擎** 支持的 XML 格式 `.fnt` 文件。

## 功能
- 支持选择本地 XML 文件和对应的 PNG 图片。
- 在浏览器中直接解析转换，无需上传服务器。
- 实时预览源 XML 和图片。
- 生成符合 Laya 引擎规范的 XML 格式 `.fnt` 文件。

## 使用方法
1. 双击打开 `index.html` 文件（推荐使用 Chrome, Edge, Firefox 等现代浏览器）。
2. 点击 "选择文件 (XML 和 PNG)" 按钮。
   - 你可以同时选择 `.xml` 描述文件和对应的 `.png` 图片文件。
   - 按住 `Ctrl` (Windows) 或 `Command` (Mac) 键进行多选。
3. 界面将自动显示 XML 内容预览和图片预览。
4. 点击 "转换" 按钮。
5. 预览结果无误后，点击 "下载 .fnt 文件" 保存到本地。

## 转换规则
本工具会将标准的 AngelCode XML 转换为 Laya 特定的 XML 结构：
- 将 `common` 节点的 `lineHeight` 属性移动到 `info` 节点。
- 移除 `common` 和 `pages` 节点。
- 保留 `chars` 和 `char` 节点的核心属性 (`id`, `x`, `y`, `width`, `height`, `xoffset`, `yoffset`, `xadvance`)。
- 自动添加 `autoScaleSize="true"` 属性。

## 示例文件
项目中包含一个 `示例文件` 目录，里面有 3 组 XML 和 PNG 文件供测试使用。
你可以直接使用这些文件来体验工具的功能。

## 兼容性
本工具纯前端实现，依赖浏览器内置的 `DOMParser` 和 `FileReader` API。

## 常见问题
**Q: 为什么转换后的文件不能用？**
A: 请检查原 XML 文件是否为标准的 AngelCode BMFont XML 格式。某些自定义 XML 格式可能无法正确解析。

**Q: 为什么有些属性带引号，有些不带？**
A: 工具会自动识别包含空格的属性值并添加引号，同时对 `face`, `charset`, `file` 等特定字段强制添加引号，以符合 FNT 标准。
