import axios from 'axios';

const API_KEY = 'NJ5M14WSIA8PI';
const LAT = 43.44138888888889;
const LNG = -80.48666666666666;
const START_DATE = '2026-01-01';
const END_DATE = '2026-12-31';
const LANG = 'en';
const LOC = 0;
const LDT = 1;

const url = `https://arabic.nojumi.org/api/api_prayertimes.aspx?key=${API_KEY}&lat=${LAT}&lng=${LNG}&startdate=${START_DATE}&enddate=${END_DATE}&lang=${LANG}&loc=${LOC}&ldt=${LDT}`;

const config = {
  method: 'get',
  maxBodyLength: Infinity,
  url,
  headers: { }
};

async function callNojumiAPI() {
  try {
    const response = await axios.request(config);
    console.log(JSON.stringify(response.data));
  } catch (error) {
    console.log(error);
  } finally {
    console.log('API call completed');
  };
}

callNojumiAPI();