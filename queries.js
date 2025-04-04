// require("dotenv").config()
// const Pool = require("pg").Pool;

// // const knex = require('knex')({
// //     client: 'pg',
// //     connection: {
// //       host : '127.0.0.1',
// //       port : 5432,
// //       user : 'wp',
// //       password : 'farhan165',
// //       database : 'VanLife'
// //     }
// //   });
  

// const pool = new Pool({
//     connectionString: process.env.POSTGRES_URL + "?sslmode=require",
// }) ;


require('dotenv').config();  // Ensure dotenv is loaded

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});


module.exports = {pool}