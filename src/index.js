const TerminalBrowser = require('./browser');

async function main() {
    const browser = new TerminalBrowser();
    await browser.init();
}

main().catch(console.error); 