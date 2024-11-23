const puppeteer = require('puppeteer');
const blessed = require('blessed');
const { convert } = require('./renderer');

class TerminalBrowser {
    constructor() {
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'Termium Browser'
        });

        this.browser = null;
        this.page = null;
        this.elements = [];
        this.setupUI();
        this.setupKeys();
    }

    async init() {
        this.browser = await puppeteer.launch({ headless: "new" });
        this.page = await this.browser.newPage();
        await this.navigate('https://google.com');
    }

    setupUI() {
        // Main content box
        this.content = blessed.box({
            top: 1,
            left: 0,
            width: '100%',
            height: '100%-3',
            content: '',
            tags: true,
            border: {
                type: 'line'
            },
            style: {
                fg: 'white',
                border: {
                    fg: '#f0f0f0'
                }
            },
            scrollable: true,
            alwaysScroll: true,
            scrollbar: {
                ch: ' ',
                track: {
                    bg: 'cyan'
                },
                style: {
                    inverse: true
                }
            }
        });

        // URL bar
        this.urlBar = blessed.textbox({
            parent: this.screen,
            top: 0,
            left: 0,
            height: 1,
            width: '100%',
            keys: true,
            mouse: true,
            inputOnFocus: true,
            style: {
                fg: 'white',
                bg: 'blue'
            }
        });

        // Input box for interacting with elements
        this.inputBox = blessed.textbox({
            parent: this.screen,
            bottom: 0,
            left: 0,
            height: 1,
            width: '100%',
            keys: true,
            mouse: true,
            inputOnFocus: true,
            style: {
                fg: 'white',
                bg: 'green'
            }
        });

        this.screen.append(this.content);
        this.screen.append(this.urlBar);
        this.screen.append(this.inputBox);
    }

    setupKeys() {
        // Quit on Ctrl+C or q
        this.screen.key(['C-c', 'q'], () => {
            this.close();
            process.exit(0);
        });

        // Focus URL bar on Ctrl+L
        this.screen.key(['C-l'], () => {
            this.urlBar.focus();
        });

        // Handle URL submission
        this.urlBar.key(['enter'], async () => {
            const url = this.urlBar.getValue();
            await this.navigate(url);
            this.content.focus();
        });

        // Scrolling
        this.content.key(['up'], () => {
            this.content.scroll(-1);
            this.screen.render();
        });

        this.content.key(['down'], () => {
            this.content.scroll(1);
            this.screen.render();
        });

        // Interactive element selection
        this.screen.key(['i'], () => {
            this.inputBox.setValue('Enter element number: ');
            this.inputBox.focus();
        });

        // Handle element interaction
        this.inputBox.key(['enter'], async () => {
            const input = this.inputBox.getValue().replace('Enter element number: ', '');
            const elementIndex = parseInt(input);
            
            if (elementIndex && this.elements[elementIndex - 1]) {
                await this.interactWithElement(this.elements[elementIndex - 1]);
            }
            
            this.inputBox.setValue('');
            this.content.focus();
        });
    }

    async interactWithElement(element) {
        try {
            switch (element.type) {
                case 'link':
                    await this.navigate(element.href);
                    break;
                case 'input':
                    this.inputBox.setValue(`Enter value for ${element.inputType || 'text'} input: `);
                    this.inputBox.focus();
                    this.inputBox.key(['enter'], async () => {
                        const value = this.inputBox.getValue().replace(`Enter value for ${element.inputType || 'text'} input: `, '');
                        await this.page.evaluate((index, value) => {
                            const inputs = document.querySelectorAll('input');
                            inputs[index - 1].value = value;
                        }, element.index, value);
                        this.inputBox.setValue('');
                        this.content.focus();
                        await this.refreshContent();
                    });
                    break;
                case 'button':
                    await this.page.evaluate((index) => {
                        const buttons = document.querySelectorAll('button');
                        buttons[index - 1].click();
                    }, element.index);
                    await this.refreshContent();
                    break;
                case 'form':
                    await this.page.evaluate((index) => {
                        const forms = document.querySelectorAll('form');
                        forms[index - 1].submit();
                    }, element.index);
                    await this.refreshContent();
                    break;
            }
        } catch (error) {
            this.content.setContent(`Error interacting with element: ${error.message}`);
            this.screen.render();
        }
    }

    async navigate(url) {
        try {
            this.content.setContent('Loading...');
            this.screen.render();

            await this.page.goto(url);
            this.urlBar.setValue(this.page.url());
            await this.refreshContent();
        } catch (error) {
            this.content.setContent(`Error loading page: ${error.message}`);
            this.screen.render();
        }
    }

    async refreshContent() {
        const rendered = await convert(this.page);
        this.elements = rendered.elements;
        this.content.setContent(rendered.content);
        this.screen.render();
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

module.exports = TerminalBrowser; 