require('dotenv').config()
const puppeteer = require('puppeteer');

const ALL_COURSES = {
    '2431': 'Bethpage Black Course',
    '2517': 'Bethpage 9 Holes Midday Blue or Yellow Course',
    '2433': 'Bethpage Blue Course',
    '2539': 'Bethpage Early AM 9 Holes Blue',
    '2538': 'Bethpage Early AM 9 Holes Yellow',
    '2434': 'Bethpage Green Course',
    '2432': 'Bethpage Red Course',
    '2435': 'Bethpage Yellow Course',
};

const FULL_COURSES = {
    '2431': 'Bethpage Black Course',
    // '2517': 'Bethpage 9 Holes Midday Blue or Yellow Course',
    '2433': 'Bethpage Blue Course',
    // '2539': 'Bethpage Early AM 9 Holes Blue',
    // '2538': 'Bethpage Early AM 9 Holes Yellow',
    '2434': 'Bethpage Green Course',
    '2432': 'Bethpage Red Course',
    '2435': 'Bethpage Yellow Course',
};

// Generate date array
let dates = [...Array(7).keys()];
let millisecondsInADay = 1000 * 3600 * 24;

dates = dates.map(index => {
  let date = new Date(Date.now() + millisecondsInADay * index);
  let dateTimeFormat = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit' }) 
  let [{ value: month },,{ value: day },,{ value: year }] = dateTimeFormat .formatToParts(date );
  return `${month}-${day}-${year }`;
});

// Scrape site
(async () => {
  try {
    const timeStart = Date.now();

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage()

    console.log(`${Math.floor((Date.now() - timeStart)/1000)}s | Going to site`)
    await page.goto('https://foreupsoftware.com/index.php/booking/19765',{
        waitUntil: "networkidle2",
        timeout: 30000
      })
    await page.setViewport({ width: 1920, height: 937 })

    console.log(`${Math.floor((Date.now() - timeStart)/1000)}s | Trying to access before logging in`)
    await page.waitForSelector('div > .row > #content > .booking-classes > .btn:nth-child(2)')
    await page.click('div > .row > #content > .booking-classes > .btn:nth-child(2)')
    await page.waitForSelector('#content > #teetime-login > div > .center-block > .btn')
    await page.click('#content > #teetime-login > div > .center-block > .btn')

    console.log(`${Math.floor((Date.now() - timeStart)/1000)}s | Logging in`)
    await page.waitForSelector('#login_form #login_email')
    await page.click('#login_form #login_email')  
    await page.type('#login_form #login_email', process.env.BETHPAGE_LOGIN)
    await page.waitForSelector('#login_form #login_password')
    await page.click('#login_form #login_password')
    await page.type('#login_form #login_password', process.env.BETHPAGE_PASSWORD)
    await page.click('#login > div > div.modal-footer > div:nth-child(1) > button.btn.btn-primary.login.col-xs-12.col-md-2')

    for (const course in FULL_COURSES) {
        console.log(`${Math.floor((Date.now() - timeStart)/1000)}s | ${FULL_COURSES[course]}`)
        await new Promise(r => setTimeout(r, 1000));
        await page.waitForSelector('#bs-example-navbar-collapse-1 > ul:nth-child(1) > li:nth-child(1) > a')
        await page.click('#bs-example-navbar-collapse-1 > ul:nth-child(1) > li:nth-child(1) > a')
        await page.waitForSelector('#nav #schedule_select')
        await page.click('#nav #schedule_select')
        await page.select('#nav #schedule_select', course)
    
        // console.log(`${Math.floor((Date.now() - timeStart)/1000)}s | Selecting 'Resident'`)
        await page.waitForSelector('div > .row > #content > .booking-classes > .btn:nth-child(2)')
        await page.click('div > .row > #content > .booking-classes > .btn:nth-child(2)')
        await new Promise(r => setTimeout(r, 1000));
    
        // console.log(`${Math.floor((Date.now() - timeStart)/1000)}s | Preparing to iterate through dates`)
        await page.setViewport({ width: 985, height: 937 })
          
        // console.log(`${Math.floor((Date.now() - timeStart)/1000)}s | Iterating through dates`)  
        for (const date of dates) {
            await page.waitForSelector('.row #date-menu')
            await page.click('.row #date-menu')
            await page.select('.row #date-menu', date)
            await new Promise(r => setTimeout(r, 1000));
            let element = await page.$("#times");
            let text = await page.evaluate(element => element.textContent, element);
            
            let noTeeTimes = 'Use Time/Day filters to find desired teetimeTo see more times, try adjusting the filters (date, holes, players, or time of day)'
            let before7pm = 'No tee times availableBooking for 6/06/2020 starts at 7:00pm (EDT)'
            if (text === noTeeTimes || text === before7pm) {
                text = '-'
            } else {
                text = text.replace(/(\r\n|\n|\r)/gm, "").split(' ').filter(el => el.trim().length).join(' - ');
            }
            console.log(`${Math.floor((Date.now() - timeStart)/1000)}s | ${date.substring(0,5)}: ${text}`)
        }    
    }
        
    await browser.close();
  } catch (error) {
    console.log(error);
  }
})();

