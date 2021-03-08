/*

Script for finding free time slots at Migri Service points.

 (c) Sergey Andryukhin, 2020
 */

const bent = require('bent');
const moment = require('moment');
const chalk = require('chalk');
const Promise = require('bluebird');


const OFFICES = {
    helsinki: {
        officeId: '25ee3bce-aec9-41a7-b920-74dc09112dd4',
        minTime: '0',
        maxTime: '24'
    },
    lahti: {
        officeId: 'a893849c-c0d9-489b-92a3-6dd8a36ef9f9',
        minTime: '10',
        maxTime: '16'
    },
    lappeenranta: {
        officeId: 'e4ef4cf7-6f46-4382-82e8-15b006c4da14',
        minTime: '12',
        maxTime: '15'
    },
    turku: {
        officeId: '074cc6f8-735b-4ea5-ad9a-9e517fef09bb',
        minTime: '10',
        maxTime: '16'
    },
    tampere: {
        officeId: '08d44a6b-af37-4a30-8462-1d6f5fc5cd61',
        minTime: '11',
        maxTime: '16'
    },
    // vaasa: '6b5d9667-e526-4136-af5a-b1d20f5d01b3'},
    // kuopio: '10a1fb12-3783-4a3b-a532-468b93bb85c9'},
    // aland: '87558cb4-975b-46e9-a411-51ca67c56a08'}
};

// URL: https://migri.vihta.com/public/migri/api/scheduling/offices/25ee3bce-aec9-41a7-b920-74dc09112dd4/2020/w44?end_hours=24&start_hours=0

// const SERVICE_ID = '4f53e3ce-ad70-4a8b-ad87-5b505aa200c7'; // ??
const SERVICE_ID = 'a87390ae-a870-44d4-80a7-ded974f4cb06'; // residence-permit - family (first and extended permit)
const SESSION_ID = 'b87ac6c9-0a49-4305-8401-3c7017e72e50';

const DATE_FORMAT = 'YYYY-MM-DD';
const DATETIME_FORMAT = 'YYYY-MM-DD HH:MM';

async function getOfficeTimes(officeId, year, week, minTime, maxTime) {

    const BODY = {"serviceSelections": [{"values": [SERVICE_ID]}], "extraServices": []};
    const URL = `https://migri.vihta.com/public/migri/api/scheduling/offices/${officeId}/${year}/w${week}?end_hours=${maxTime}&start_hours=${minTime}`;
    const headers = {
        'referer': 'https://migri.vihta.com/public/migri/',
        'Content-Type': 'application/json;charset=UTF-8',
        'Accept': 'application/json, text/plain, */*',
        'vihta-session': SESSION_ID,
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'cors',
        'sec-fetch-dest': 'empty',
        'origin': 'https://migri.vihta.com',
        'authority': 'migri.vihta.com'
    };

    const req = bent('POST', 'json', headers);

    const json = await req(URL, BODY);

    if (json && json.dailyTimesByOffice) {
        return json.dailyTimesByOffice;
    } else {
        console.log(json);
    }
    return [];
}


function printTime(officeName, year, week, slots) {

    if (!slots || !slots.length) return;

    let found = 0;

    for (let d = 0; d < slots.length; d++) { // iterate over working days

        for (let t = 0; t < slots[d].length; t++) { // iterate over time slots

            found++;

            let slot = slots[d][t];
            let numberOfQueues = slot.resources.length;
            let slotsDate = chalk.green(moment(slot.startTimestamp).format(DATETIME_FORMAT));

            console.log(`Migri ${officeName.toUpperCase()}: ${slotsDate}, windows available: ${numberOfQueues}`);
        }
    }

    return found;

    // console.log(`Office: ${ officeName }`, year, `Week ${ week }`, slots);

}

async function run() {

    // Show times for the next MONTHS months from now
    const MONTHS = 2;
    const startDate = moment();
    const endDate = moment(startDate).add(MONTHS, 'month');

    let officeId;
    const NOSLOTS = chalk.red('NO SLOTS FOUND');

    await Promise.map(
        Object.keys(OFFICES),

        async function (officeName) {
            let officeData = OFFICES[officeName];
            officeId = officeData.officeId;
            let dt = moment(startDate);
            let year, week, found = 0;

            while (dt < endDate) {

                year = dt.format('YYYY');
                week = dt.format('W');

                const times = await getOfficeTimes(officeId, year, week, officeData.minTime, officeData.maxTime);

                found += printTime(officeName, year, week, times);

                dt = dt.add(1, 'week');
            }

            if (found === 0) {
                console.log(`Migri ${officeName.toUpperCase()}: ${NOSLOTS} ${startDate.format(DATE_FORMAT)} - ${endDate.format(DATE_FORMAT)}`);
            }

            // console.log('\n');
        },

        {concurrency: 2}
    );

    console.log(`\nLast check done at ${moment().format('HH:mm')} avoid doing new check till ${chalk.red(moment().add(15, 'minute').format('HH:mm'))}`);

}


(async function () {
    await run();
})();
