'use strict';


// declaring variable ;
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// initialize the server
const server = express();
server.use(cors());

//declaring
const PORT = process.env.PORT || 3000;


// routes
server.get('/location', handelLocationRequest);
server.get('/weather', handelWeatheRequest);



function handelLocationRequest(req, res) {


  const locationsRawData = require('./data/location.json');
  const location = new Location(locationsRawData[0])
  res.send(location);
}
function handelWeatheRequest(req, res) {

  const weathersRawData = require('./data/weather.json');
  const weatherRaw=weathersRawData.data;
  const weathersData = [];

  weatherRaw.forEach(weather => {
    weathersData.push(new Weather(weather));
  });

  res.send(weathersData);

}

// constructors

function Location(data) {
  this.formatted_query = data.display_name;
  this.latitude = data.lat;
  this.longitude = data.lon;
}

function Weather(data) {
  this.forecast = data.weather.description;
  this.time = data.datetime;

}

server.listen(PORT, () => console.log(`Listening to Port ${PORT}`));

//error handler
server.use('*', (req, res) => {
  let status =404;
  res.status(status).send({status:status , msg:'Not found'});
});