const chalk = require('chalk');

async function convert(page) {
    try {
        // Convert page content to terminal-friendly format
        const content = await page.evaluate(() => {
            let interactiveElements = [];
            let elementIndex = 0;

            function getVisualRepresentation(element) {
                const style = window.getComputedStyle(element);
                const isVisible = style.display !== 'none' && 
                                style.visibility !== 'hidden' && 
                                style.opacity !== '0';
                
                if (!isVisible) return '';

                switch (element.tagName?.toLowerCase()) {
                    case 'img':
                        const width = Math.min(element.width || 50, 50);
                        elementIndex++;
                        interactiveElements.push({
                            index: elementIndex,
                            type: 'image',
                            alt: element.alt,
                            src: element.src
                        });
                        return '\n' + '+'.repeat(width) + '\n' + 
                               '|' + ' '.repeat(width-2) + '|' + '\n' +
                               '+'.repeat(width) + '\n' +
                               `[${elementIndex}] [IMG: ${element.alt || 'image'}]\n`;
                    case 'input':
                        elementIndex++;
                        interactiveElements.push({
                            index: elementIndex,
                            type: 'input',
                            inputType: element.type,
                            name: element.name,
                            value: element.value,
                            placeholder: element.placeholder
                        });
                        return `[${elementIndex}] [INPUT${element.type ? ': ' + element.type : ''}] ${element.placeholder || ''}\n`;
                    case 'button':
                        elementIndex++;
                        interactiveElements.push({
                            index: elementIndex,
                            type: 'button',
                            text: element.textContent,
                            onclick: element.onclick ? true : false
                        });
                        return `[${elementIndex}] [BUTTON] ${element.textContent}\n`;
                    case 'form':
                        elementIndex++;
                        interactiveElements.push({
                            index: elementIndex,
                            type: 'form',
                            action: element.action,
                            method: element.method
                        });
                        return `[${elementIndex}] [FORM] ${element.action || 'form'}\n`;
                    case 'hr':
                        return '\n' + '-'.repeat(80) + '\n';
                    default:
                        return '';
                }
            }

            function processNode(node, depth = 0) {
                if (!node) return '';
                
                let result = '';
                const indent = ' '.repeat(depth * 2);

                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent.trim();
                    return text ? indent + text + '\n' : '';
                }

                const visual = getVisualRepresentation(node);
                if (visual) {
                    result += indent + visual;
                }

                if (node.tagName) {
                    switch (node.tagName.toLowerCase()) {
                        case 'h1':
                            result += indent + '### ' + node.textContent + ' ###\n';
                            break;
                        case 'h2':
                        case 'h3':
                            result += indent + '## ' + node.textContent + ' ##\n';
                            break;
                        case 'p':
                            result += indent + node.textContent + '\n\n';
                            break;
                        case 'a':
                            elementIndex++;
                            interactiveElements.push({
                                index: elementIndex,
                                type: 'link',
                                text: node.textContent.trim(),
                                href: node.href
                            });
                            result += indent + `[${elementIndex}] [LINK] ${node.textContent}\n`;
                            break;
                    }
                }

                for (const child of node.childNodes) {
                    result += processNode(child, depth + 1);
                }

                return result;
            }

            return {
                content: processNode(document.body),
                elements: interactiveElements
            };
        });

        // Format the content with colors and styling
        let formattedContent = chalk.white(content.content);
        
        // Add interactive elements section
        formattedContent += '\n\n' + chalk.cyan('=== Interactive Elements ===\n');
        content.elements.forEach(element => {
            switch (element.type) {
                case 'link':
                    formattedContent += chalk.yellow(`[${element.index}] Link: ${element.text}\n    → ${element.href}\n`);
                    break;
                case 'input':
                    formattedContent += chalk.green(`[${element.index}] Input: ${element.inputType || 'text'}\n    → ${element.placeholder || ''}\n`);
                    break;
                case 'button':
                    formattedContent += chalk.blue(`[${element.index}] Button: ${element.text}\n`);
                    break;
                case 'form':
                    formattedContent += chalk.magenta(`[${element.index}] Form: ${element.action}\n`);
                    break;
            }
        });

        return {
            content: formattedContent,
            elements: content.elements
        };
    } catch (error) {
        return {
            content: `Error rendering page: ${error.message}`,
            elements: []
        };
    }
}

module.exports = { convert }; 