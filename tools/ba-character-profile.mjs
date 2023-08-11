// Import puppeteer
import puppeteer from 'puppeteer';
import fs from 'fs-extra'

async function GetProperty(element, property) {
    return await (await element.getProperty(property)).jsonValue();
}

(async () => {
  // Launch the browser
  const browser = await puppeteer.launch();

  // Create a page
  const page = await browser.newPage();

  // Go to your site
  await page.goto('https://ba.gamekee.com/');

  // Query for an element handle.
  const t1 = `#menu-23941 > div:nth-child(3) > div:nth-child(2) > div:nth-child(1) div.pc-item-group a`
  const element = await page.waitForSelector(t1);
  const list1 = await page.$$(t1)

  for (let item1 of list1) {
    const href = await GetProperty(item1, 'href')
    const title = await GetProperty(item1, 'title')

    const page2 = await browser.newPage()
    await page2.goto(href);
  }

  // Dispose of handle
  await element.dispose();

  // Close browser.
  await browser.close();
})();