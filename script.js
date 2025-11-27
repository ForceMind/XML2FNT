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

    // 监听文件选择
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // 重置状态
        currentXmlFile = null;
        currentXmlContent = '';
        xmlPreview.value = '';
        imageContainer.innerHTML = '';
        outputArea.value = '';
        convertBtn.disabled = true;
        downloadBtn.disabled = true;
        
        // 显示文件列表
        const fileNames = files.map(f => f.name).join(', ');
        fileListDisplay.textContent = `已选择: ${fileNames}`;

        // 处理文件
        files.forEach(file => {
            if (file.name.toLowerCase().endsWith('.xml')) {
                handleXmlFile(file);
            } else if (file.type.startsWith('image/')) {
                handleImageFile(file);
            }
        });
    });

    function handleXmlFile(file) {
        currentXmlFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            currentXmlContent = e.target.result;
            xmlPreview.value = currentXmlContent;
            convertBtn.disabled = false;
        };
        reader.readAsText(file);
    }

    function handleImageFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.title = file.name;
            imageContainer.appendChild(img);
        };
        reader.readAsDataURL(file);
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