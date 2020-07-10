require('dotenv').config()
const mongoose = require('mongoose');
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const TeeTime = require('./models/TeeTime');

const MONGODB_URI = 'mongodb://localhost:27017/bethpage-scraper';
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
const FULL_COURSES_SHORT_NAME = {
  '2431': 'Black',
  // '2517': 'Bethpage 9 Holes Midday Blue or Yellow Course',
  '2433': 'Blue',
  // '2539': 'Bethpage Early AM 9 Holes Blue',
  // '2538': 'Bethpage Early AM 9 Holes Yellow',
  '2434': 'Green',
  '2432': 'Red',
  '2435': 'Yellow',
};
const COURSES_SHORT_NAME_BY_FULL_NAME = {
  'Bethpage Black Course': 'Black',
  'Bethpage Blue Course': 'Blue',
  'Bethpage Green Course': 'Green',
  'Bethpage Red Course': 'Red',
  'Bethpage Yellow Course': 'Yellow',
}

let allTeeTimes = [];
let newTeeTimes = [];

// Connect to database
mongoose
  .connect(MONGODB_URI, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(self => {
    console.log(`Connected to the database: "${self.connection.name}"`);
    
    (async () => {
      allTeeTimes = await TeeTime.find()
    })();


  })
  .catch(error => {
    console.error('Error connecting to the database', error);
  });

// Connect to nodemailer
let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
         user: process.env.EMAIL_USERNAME,
         pass: process.env.EMAIL_PASSWORD
     }
});

// Generate date array
let dates = [...Array(6).keys()]; // TODO: change to 7
let formattedDates = {};
let millisecondsInADay = 1000 * 3600 * 24;

dates = dates.map(index => {
  let date = new Date(Date.now() + millisecondsInADay * (index + 1)); // TODO: remove 1
  let dateTimeFormat = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit' }) 
  let [{ value: month },,{ value: day },,{ value: year }] = dateTimeFormat .formatToParts(date);
  let dateString = `${month}-${day}-${year}`;
  
  let formattedDate = date.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' });
  formattedDates[dateString] = formattedDate;

  return dateString;
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
        // await page.waitForSelector('div > .row > #content > .booking-classes > .btn:nth-child(2)')
        // await page.click('div > .row > #content > .booking-classes > .btn:nth-child(2)')
        // await new Promise(r => setTimeout(r, 1000));
    
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
            let notLoaded = 'Loading Tee times...Use Time/Day filters to find desired teetimeTo see more times, try adjusting the filters (date, holes, players, or time of day)'
            
            if (text === noTeeTimes || text === before7pm || text === notLoaded) {
                text = '-'
            } else {
                let teeTimesArray = text.replace(/(\r\n|\n|\r)/gm, "").split(' ').filter(el => el.trim().length);

                // Process array and save into the database
                let numTeeTimes = teeTimesArray.length / 3;
                for (let i = 0; i < numTeeTimes; i++) {
                  let time = teeTimesArray[3 * i];
                  let hour = time[0];
                  let holes = teeTimesArray[3 * i + 1];
                  let players = teeTimesArray[3 * i + 2];
                  let formattedDate = formattedDates[date]
                  let id = [FULL_COURSES_SHORT_NAME[course], formattedDate, time, holes.toString() + ' holes', players.toString() + ' players'].join(' | ');

                  let teeTime = {
                    _id: id,
                    course: FULL_COURSES[course],
                    date: date,
                    time: time,
                    holes: holes,
                    players: players,
                  }

                  if (players >= 3 && (hour <= 4 || hour >= 7) ) {
                    newTeeTimes.push(teeTime);
                  }

                  if (allTeeTimes.some(element => element._id === teeTime._id)) {
                    // console.log('Repeated')
                  } else {
                    // console.log('Different');
                    // newTeeTimes.push(teeTime);
                    TeeTime.create(teeTime)
                    .then(res => '')
                    .catch(err => console.log(`Error`));
                  }
                }

                text = teeTimesArray.join(' - ');
                
            }
            console.log(`${Math.floor((Date.now() - timeStart)/1000)}s | ${date.substring(0,5)}: ${text}`)
        }    
    }
        
    await browser.close();

    mongoose.disconnect()
    .then(res => console.log('Disconnected from database'))
    .catch(err => console.log(err))

    // Send email
    let emailHtml = `
    <h1>Bethpage Scraper | New Tee Times</h1>
    <p>Available tee times for next 7 days: </p>
    <ul id="teeTimes">
    `
    
    if (newTeeTimes.length > 0) {
      newTeeTimes.forEach(teeTime => {
        emailHtml += `<li style="color:${COURSES_SHORT_NAME_BY_FULL_NAME[teeTime.course].toLowerCase()};">${teeTime._id}</li>`
      })
      
      emailHtml += '</ul>'
      
      const mailOptions = {
        from: process.env.EMAIL_USERNAME,
        to: ['albertgozzi@gmail.com', 'santisarquis@gmail.com', 'burza1964@gmail.com', 'pflaumnicolas@gmail.com', 'konta.sebastian@gmail.com'], // list of receivers
        subject: 'Bethpage Scraper | New Tee Times', // Subject line
        html: emailHtml,
      };
          
      transporter.sendMail(mailOptions, function (err, info) {
          if(err)
            console.log(err)
          else
            console.log(info);
      });  
    }

  } catch (error) {
    console.log(error);
  }

})();


