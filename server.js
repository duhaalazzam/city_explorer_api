'use strict';


// declaring variable ;
const express = require('express');
const superAgent = require('superagent');
const cors = require('cors');
require('dotenv').config();


// initialize the server
const server = express();
server.use(cors());

//declaring a port
const PORT = process.env.PORT || 3000; //API key for locatins
const GEO_CODE_API_KEY = process.env.GEO_CODE_API_KEY; //API key for wheather
const WEATHER_CODE_API_KEY = process.env.WEATHER_CODE_API_KEY; //API key for PARK
const PARK_CODE_API_KEY = process.env.PARK_CODE_API_KEY;


// routes
server.get('/location', handelLocationRequest);
server.get('/weather', handelWeatheRequest);
server.get('/parks', handelParkRequest);



// localhost:3000/location?city = amman  // function to get location data
function handelLocationRequest(req, res) {
  const city = req.query.city;
  //const urlGEO = `https://us1.locationiq.com/v1/search.php?key=${GEO_CODE_API_KEY}&city=${city}&format=json`;
  const urlGEO = `https://us1.locationiq.com/v1/search.php`;
  const query = {
    key: GEO_CODE_API_KEY,
    city: city,
    format: 'json'
  };
  if (!city) {
    res.status(500).send('Status 500: Sorry, something went wrong');
  }
  console.log(city);
  superAgent.get(urlGEO).query(query).then(resData =>{
    const location = new Location( city , resData.body[0]);
    //console.log(latLonData);
    res.status(200).send(location);
  }).catch((error) => {
    console.log('ERROR', error);
    res.status(500).send('Sorry, something went wrong');
  });

}

// localhost:3000/weather?search_query=amman  //// function to get weather data
function handelWeatheRequest(req, res) {
  const url = `https://api.weatherbit.io/v2.0/forecast/daily?`;
  const queryObj = {
    lat:req.query.latitude,
    lon:req.query.longitude,
    key: WEATHER_CODE_API_KEY ,
  };

  superAgent.get(url).query(queryObj).then(reqData => {
    const myWeatherData = reqData.body.data.map(weather => {
      return new Weather(weather);
    });

    res.send( myWeatherData);
  }).catch((error) => {
    console.error('ERROR',error);
    res.status(500).send('there is no data weather');
  });
}

// localhost:3000/Park // function to get park data
function handelParkRequest(req, res) {
  const ParkUrl = `https://developer.nps.gov/api/v1/parks?q=${req.query.search_query}&api_key=${PARK_CODE_API_KEY}&limit=10`;
  superAgent.get(ParkUrl).then(reqData => {
    const myParkData = reqData.body.data.map(park => {
      return new Park(park);
    });

    res.send(myParkData);
  }).catch((error) => {
    console.error('ERROR',error);
    req.status(500).send('there is no data park');
  });
}

// constructors
function Location( city,data) {
  this.search_query = city;
  this.formatted_query = data.display_name;
  this.latitude = data.lat;
  this.longitude = data.lon;
}

function Weather(data) {
  this.forecast = data.weather.description;
  this.time = data.datetime;
}
// constructor function formate the park responed data
function Park(data) {
  this.name = data.name;
  this.description=data.description;
  this.address =`${data.addresses[0].linel} ${data.addresses[0].city} ${data.addresses[0].linel} ${data.addresses[0].statecode}  ${data.addresses[0].postalcode}  ` ;
  this.fee = data.fees[0] || '0.00';
  this.Park_url = data.url;
}
server.use('*', (req, res) => {
  res.send('all good nothing to see here!');
});
//test the server
server.listen(PORT, () => console.log(`Listening to Port ${PORT}`));
