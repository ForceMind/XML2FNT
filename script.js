document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('xmlFile');
    const fileNameDisplay = document.getElementById('fileName');
    const convertBtn = document.getElementById('convertBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const outputArea = document.getElementById('output');

    let currentFile = null;
    let convertedContent = '';

    // 监听文件选择
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            currentFile = e.target.files[0];
            fileNameDisplay.textContent = currentFile.name;
            convertBtn.disabled = false;
            downloadBtn.disabled = true;
            outputArea.value = '';
        }
    });

    // 监听转换按钮
    convertBtn.addEventListener('click', () => {
        if (!currentFile) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const xmlContent = e.target.result;
                convertedContent = convertXmlToFnt(xmlContent);
                outputArea.value = convertedContent;
                downloadBtn.disabled = false;
            } catch (error) {
                alert('转换失败: ' + error.message);
                console.error(error);
            }
        };
        reader.readAsText(currentFile);
    });

    // 监听下载按钮
    downloadBtn.addEventListener('click', () => {
        if (!convertedContent) return;

        const blob = new Blob([convertedContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        // 保持原文件名，但修改后缀
        let downloadName = currentFile.name.replace(/\.xml$/i, '') + '.fnt';
        
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

        let result = '';

        // 1. info
        const info = xmlDoc.querySelector('info');
        if (info) {
            result += 'info ' + getAttributesAsString(info, ['face', 'charset']) + '\n';
        }

        // 2. common
        const common = xmlDoc.querySelector('common');
        if (common) {
            result += 'common ' + getAttributesAsString(common) + '\n';
        }

        // 3. pages
        const pages = xmlDoc.querySelectorAll('pages page');
        if (pages.length > 0) {
            // 某些 XML 格式可能没有 pages 标签包裹，直接是 page 列表，或者在 pages 下
            // 标准 AngelCode XML 是 <pages><page ... /><page ... /></pages>
            // 但为了健壮性，我们查找所有 page 元素
            // 注意：info 和 common 也是单例，但 page 是列表
            // 实际上 AngelCode XML 结构通常是 root -> pages -> page
            
            // 重新获取 pages 数量，因为 common 标签里通常有 pages 属性表示数量
            // 这里我们直接遍历找到的 page 元素
            for (let i = 0; i < pages.length; i++) {
                result += 'page ' + getAttributesAsString(pages[i], ['file']) + '\n';
            }
        }

        // 4. chars
        const charsElement = xmlDoc.querySelector('chars');
        const chars = xmlDoc.querySelectorAll('chars char');
        if (charsElement) {
            // 优先使用 XML 中的 count 属性，如果没有则使用实际数量
            const count = charsElement.getAttribute('count') || chars.length;
            result += `chars count=${count}\n`;
            
            for (let i = 0; i < chars.length; i++) {
                result += 'char ' + getAttributesAsString(chars[i]) + '\n';
            }
        }

        // 5. kernings
        const kerningsElement = xmlDoc.querySelector('kernings');
        const kernings = xmlDoc.querySelectorAll('kernings kerning');
        if (kerningsElement || kernings.length > 0) {
            const count = kerningsElement ? (kerningsElement.getAttribute('count') || kernings.length) : kernings.length;
            result += `kernings count=${count}\n`;
            
            for (let i = 0; i < kernings.length; i++) {
                result += 'kerning ' + getAttributesAsString(kernings[i]) + '\n';
            }
        }

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