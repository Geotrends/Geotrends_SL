const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false,
    },
});

const secondaryPool = new Pool({
  user: process.env.DB2_USER,
  host: process.env.DB2_HOST,
  database: process.env.DB2_DATABASE,
  password: process.env.DB2_PASSWORD,
  port: process.env.DB2_PORT,
      ssl: {
        rejectUnauthorized: false,
    },
});

const geo360Pool = new Pool({
  user: process.env.DB3_USER,
  host: process.env.DB3_HOST,
  database: process.env.DB3_DATABASE,
  password: process.env.DB3_PASSWORD,
  port: process.env.DB3_PORT,
      ssl: {
        rejectUnauthorized: false,
    },
});
module.exports = {
  pool,
  secondaryPool,
  geo360Pool
};
