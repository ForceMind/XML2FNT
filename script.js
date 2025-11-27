document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const fileListDisplay = document.getElementById('fileList');
    const convertBtn = document.getElementById('convertBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const xmlPreview = document.getElementById('xmlPreview');
    const imageContainer = document.getElementById('imageContainer');
    const outputArea = document.getElementById('output');

    let currentXmlFile = null;
    let currentXmlContent = '';
    let currentImage = null; // 存储 Image 对象
    let currentChars = [];   // 存储解析出的字符位置信息

    // 监听文件选择
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // 重置状态
        // 注意：如果用户只选了 XML，我们保留之前的图片（如果想支持增量更新的话）
        // 但为了简单逻辑，这里每次选择都重置相关状态，或者根据文件类型更新
        // 更好的体验是：增量更新。
        
        // 这里我们采用增量更新策略：
        // 如果新选了 XML，更新 XML；如果新选了图片，更新图片。
        
        let hasNewXml = false;
        let hasNewImage = false;

        const xmlFile = files.find(f => f.name.toLowerCase().endsWith('.xml'));
        const imgFile = files.find(f => f.type.startsWith('image/'));

        if (xmlFile) {
            currentXmlFile = xmlFile;
            hasNewXml = true;
            // 重置 XML 相关
            currentXmlContent = '';
            currentChars = [];
            xmlPreview.value = '正在加载 XML...';
            convertBtn.disabled = true;
        }

        if (imgFile) {
            hasNewImage = true;
            // 重置图片相关
            currentImage = null;
            imageContainer.innerHTML = '<p class="placeholder">正在加载图片...</p>';
        }

        // 显示文件列表
        const fileNames = [];
        if (currentXmlFile) fileNames.push(currentXmlFile.name);
        if (imgFile) fileNames.push(imgFile.name); // 这里只显示新选的图片名，或者应该显示当前所有已加载的文件名
        // 简单起见，显示当前操作的文件名
        fileListDisplay.textContent = `当前加载: ${files.map(f => f.name).join(', ')}`;

        // 处理文件
        if (xmlFile) handleXmlFile(xmlFile);
        if (imgFile) handleImageFile(imgFile);
    });

    function handleXmlFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            currentXmlContent = e.target.result;
            xmlPreview.value = currentXmlContent;
            convertBtn.disabled = false;
            
            // 解析 XML 获取字符信息用于预览
            try {
                currentChars = parseXmlChars(currentXmlContent);
                updateImagePreview(); // XML 更新了，重绘图片上的框
            } catch (err) {
                console.error("XML 解析预览信息失败", err);
            }
        };
        reader.readAsText(file);
    }

    function handleImageFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                currentImage = img;
                updateImagePreview();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function updateImagePreview() {
        imageContainer.innerHTML = '';
        if (!currentImage) {
            imageContainer.innerHTML = '<p class="placeholder">图片将显示在这里...</p>';
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = currentImage.width;
        canvas.height = currentImage.height;
        const ctx = canvas.getContext('2d');

        // 1. 绘制原图
        ctx.drawImage(currentImage, 0, 0);

        // 2. 如果有字符信息，绘制红框
        if (currentChars && currentChars.length > 0) {
            ctx.strokeStyle = '#ff0000'; // 红色边框
            ctx.lineWidth = 1;
            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)'; // 半透明红色填充

            currentChars.forEach(char => {
                // 绘制矩形
                ctx.strokeRect(char.x, char.y, char.width, char.height);
                ctx.fillRect(char.x, char.y, char.width, char.height);
                
                // 可选：绘制 ID 或字符
                // ctx.fillStyle = 'white';
                // ctx.font = '10px Arial';
                // ctx.fillText(char.id, char.x + 2, char.y + 10);
                // ctx.fillStyle = 'rgba(255, 0, 0, 0.2)'; // 恢复填充色
            });
        }

        imageContainer.appendChild(canvas);
    }

    function parseXmlChars(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");
        const charNodes = xmlDoc.querySelectorAll('char');
        const chars = [];
        for (let i = 0; i < charNodes.length; i++) {
            const node = charNodes[i];
            chars.push({
                id: node.getAttribute('id'),
                x: parseInt(node.getAttribute('x') || 0),
                y: parseInt(node.getAttribute('y') || 0),
                width: parseInt(node.getAttribute('width') || 0),
                height: parseInt(node.getAttribute('height') || 0)
            });
        }
        return chars;
    }

    // 监听转换按钮
    convertBtn.addEventListener('click', () => {
        if (!currentXmlContent) return;

        try {
            const convertedContent = convertXmlToFnt(currentXmlContent);
            outputArea.value = convertedContent;
            downloadBtn.disabled = false;
        } catch (error) {
            alert('转换失败: ' + error.message);
            console.error(error);
        }
    });

    // 监听下载按钮
    downloadBtn.addEventListener('click', () => {
        const content = outputArea.value;
        if (!content) return;

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        // 保持原文件名，但修改后缀
        let downloadName = currentXmlFile ? currentXmlFile.name.replace(/\.xml$/i, '') + '.fnt' : 'font.fnt';
        
        a.href = url;
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // 核心转换逻辑
    function convertXmlToFnt(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");

        // 检查解析错误
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
            throw new Error('无效的 XML 文件');
        }

        // 获取原始数据
        const infoNode = xmlDoc.querySelector('info');
        const commonNode = xmlDoc.querySelector('common');
        const charNodes = xmlDoc.querySelectorAll('char');
        const kerningNodes = xmlDoc.querySelectorAll('kerning');
        
        // 提取关键属性
        // Laya 格式需要 size 和 lineHeight 在 info 节点中
        const size = infoNode ? (infoNode.getAttribute('size') || '32') : '32';
        const lineHeight = commonNode ? (commonNode.getAttribute('lineHeight') || '32') : '32';
        
        // 构建新的 XML 结构 (Laya 兼容格式)
        let result = '<?xml version="1.0" encoding="utf-8"?>\n';
        result += '<font>\n';
        
        // info 节点：Laya 格式将 lineHeight 放在这里，并添加 autoScaleSize
        result += `  <info autoScaleSize="true" size="${size}" lineHeight="${lineHeight}"/>\n`;
        
        // chars 节点
        result += '  <chars>\n';
        
        for (let i = 0; i < charNodes.length; i++) {
            const char = charNodes[i];
            // 提取需要的属性
            const id = char.getAttribute('id');
            const x = char.getAttribute('x');
            const y = char.getAttribute('y');
            const width = char.getAttribute('width');
            const height = char.getAttribute('height');
            const xoffset = char.getAttribute('xoffset');
            const yoffset = char.getAttribute('yoffset');
            const xadvance = char.getAttribute('xadvance');
            
            // 构建 char 标签
            // 注意：Laya 示例中有 img 属性，但通常用于散图。对于大图字体，通常不需要 img 属性，
            // 或者引擎会根据同名图片自动处理。这里我们只保留坐标信息。
            result += `    <char id="${id}" x="${x}" y="${y}" width="${width}" height="${height}" xoffset="${xoffset}" yoffset="${yoffset}" xadvance="${xadvance}"/>\n`;
        }
        
        result += '  </chars>\n';

        // kernings 节点 (如果原文件有，则保留，以防万一)
        if (kerningNodes.length > 0) {
            result += '  <kernings>\n';
            for (let i = 0; i < kerningNodes.length; i++) {
                const k = kerningNodes[i];
                const first = k.getAttribute('first');
                const second = k.getAttribute('second');
                const amount = k.getAttribute('amount');
                result += `    <kerning first="${first}" second="${second}" amount="${amount}"/>\n`;
            }
            result += '  </kernings>\n';
        }

        result += '</font>';

        return result;
    }

    // 辅助函数：将 DOM 元素的属性转换为 key=value 字符串
    // stringKeys: 指定哪些属性的值需要加引号
    function getAttributesAsString(element, stringKeys = []) {
        const attributes = element.attributes;
        let parts = [];
        
        // 定义属性顺序的优先级，虽然 FNT 格式不强制顺序，但保持一致性更好
        // 这里简单处理，直接遍历
        
        for (let i = 0; i < attributes.length; i++) {
            const attr = attributes[i];
            const name = attr.name;
            let value = attr.value;

            // 判断是否需要加引号
            // 1. 在 stringKeys 列表中
            // 2. 或者值包含空格
            // 3. 或者值为空字符串
            if (stringKeys.includes(name) || value.includes(' ') || value === '') {
                value = `"${value}"`;
            }

            parts.push(`${name}=${value}`);
        }

        return parts.join(' ');
    }
});