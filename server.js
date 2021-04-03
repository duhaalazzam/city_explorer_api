'use strict';

require('dotenv').config();


const express = require('express');
const pg = require('pg');
const superagent = require('superagent');
const cors = require('cors');

const PORT = process.env.PORT || 3001;
const ENV = process.env.ENV || 'DEP';
const DATABASE_URL = process.env.DATABASE_URL;
const GEO_CODE_API_KEY = process.env.GEO_CODE_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const PARKS_API_KEY = process.env.PARKS_API_KEY;
const MOVIE_API_KEY = process.env.MOVIE_API_KEY;
const YELP_API_KEY = process.env.YELP_API_KEY;
const app = express();
app.use(cors());

let client = '';
if (ENV === 'DEP') {
  client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
} else {
  client = new pg.Client({
    connectionString: DATABASE_URL,
  });
}

// Endpoints
app.get('/location', handleLocationRequest);
app.get('/weather', handleWeatherRequest);
app.get('/parks', handleParksRequest);
app.get('/movies', handleMoviesRequest);
app.get('/yelp', handleYelpRequest);
app.use('*', handleErrorNotFound);

// Handle Functions

function handleLocationRequest(req, res) {
  const searchQuery = req.query.city;
  const url = `https://us1.locationiq.com/v1/search.php?key=${GEO_CODE_API_KEY}&city=${searchQuery}&format=json`;

  if (!searchQuery) {
    res.status(404).send('no search query was provided');
  }

  const sqlQuery = `SELECT * FROM cities`;
  client.query(sqlQuery).then(result => {
    let sqlCheck = false;
    result.rows.forEach(entry => {
      if (entry.search_query === searchQuery) {
        sqlCheck = true;
        console.log('from db');
        res.status(200).send(entry);
      }
    });
    if (!sqlCheck) {
      console.log('new entry');
      superagent.get(url).then(resData => {
        const location = new Location(searchQuery, resData.body[0]);
        const safeValues = Object.values(location);
        const sqlQuery = `INSERT INTO cities(search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4)`;
        client.query(sqlQuery, safeValues).then(result => {
          res.status(200).json(result);
        }).catch(error => {
          console.log('error', error);
          res.status(500).send('internal server error');
        });

        res.status(200).send(location);
      }).catch((error) => {
        console.log('error', error);
        res.status(500).send('something went wrong');
      });
    }
  }).catch(error => {
    console.log('error', error);
    res.status(500).send('internal server error');
  });

}

function handleWeatherRequest(req, res) {

  const { search_query, latitude, longitude } = req.query;
  const url = `https://api.weatherbit.io/v2.0/forecast/daily?lat=${latitude}&lon=${longitude}&key=${WEATHER_API_KEY}`;


  if (!search_query) {
    res.status(404).send('no search query was provided');
  }

  superagent.get(url).then(resData => {

    const weatherData = [];
    resData.body.data.map(weather => {
      weatherData.push(new Weather(weather));
    });

    res.status(200).send(weatherData);
  }).catch((error) => {
    console.log('error', error);
    res.status(500).send('something went wrong');
  });
}

function handleParksRequest(req, res) {
  const searchQuery = req.query.search_query;
  const url = `https://developer.nps.gov/api/v1/parks?limit=10&q=${searchQuery}&api_key=${PARKS_API_KEY}`;

  if (!searchQuery) {
    res.status(404).send('no search query was provided');
  }

  superagent.get(url).then(resData => {
    const parksData = [];

    resData.body.data.map(park => {
      parksData.push(new Park(park));
    });
    res.status(200).send(parksData);
  }).catch((error) => {
    console.log('error', error);
    res.status(500).send('No parks in the vicinity!');
  });
}

function handleMoviesRequest (req, res) {
  const searchQuery = req.query.search_query;
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${MOVIE_API_KEY}&query=${searchQuery}&page=1&sort_by=popularity.desc&include_adult=false`;

  if (!searchQuery) {
    res.status(404).send('no search query was provided');
  }

  superagent.get(url).then(resData => {
    const moviesData = resData.body.results.map(movie => {
      return new Movie(movie);
    });
    res.status(200).send(moviesData);
  }).catch(error => {
    console.log('error', error);
    res.status(500).send('OOOPS!');
  });
}

function handleYelpRequest (req, res) {
  const searchQuery = req.query.search_query;
  const yelpOffset = req.query.page * 5 - 5;

  const url = `https://api.yelp.com/v3/businesses/search?term=restaurants&location=${searchQuery}&limit=5&offset=${yelpOffset}`;

  if (!searchQuery) { //for empty request
    res.status(404).send('no search query was provided');
  }

  superagent.get(url).set(`Authorization`, `Bearer ${YELP_API_KEY}`).then(resData => {
    const yelpData = resData.body.businesses.map(business => {
      return new Yelp(business);
    });
    res.status(200).send(yelpData);
  }).catch(e => {
    console.log('error', e);
    res.status(500).send('WOOPSIE, no restaurants listed in this area!!!!');
  });
}



// Constructors
function Location(searchQuery, data) {
  this.search_query = searchQuery; 
  this.formatted_query = data.display_name;
  this.latitude = data.lat;
  this.longitude = data.lon;
}

function Weather(data) {
  this.forecast = data.weather.description;
  this.time = data.valid_date;
}

function Park(data) {
  this.name = data.fullName;
  this.address = `${data.addresses[0].line1}, ${data.addresses[0].city}, ${data.addresses[0].stateCode} ${data.addresses[0].postalCode}`;
  this.fee = data.entranceFees[0].cost || '0.00';
  this.description = data.description;
  this.url = data.url;
}

function Movie(data) {
  this.title = data.title;
  this.overview = data.overview;
  this.average_votes = data.vote_average;
  this.total_votes = data.vote_count;
  this.image_url = `https://image.tmdb.org/t/p/w500/${data.poster_path}`;
  this.popularity = data.popularity;
  this.released_on = data.release_date;
}

function Yelp(data) {
  this.name = data.name;
  this.image_url = data.image_url;
  this.price = data.price;
  this.rating = data.rating;
  this.url = data.url;
}

function handleErrorNotFound(req, res) {
  res.status(404).send('Sorry, something went wrong');
}

client.connect().then(() => {
  app.listen(PORT, () => {
    console.log('connected to db', client.connectionParameters.database); //show what database we are connected to
    console.log(`Listening to Port ${PORT}`);
  });
}).catch(error => {
  console.log('error', error);
});