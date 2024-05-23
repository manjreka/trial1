const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const cors = require("cors");
const bp = require("body-parser");
const { format, isValid } = require("date-fns");

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: "*",
  })
);

app.use(
  cors({
    methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"],
  })
);

app.use(bp.json());
app.use(bp.urlencoded({ extended: true }));

const dbPath = path.join(__dirname, "tasks.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const axios = require("axios"); /*Importing the axios library*/

const fetchAndInsert = async () => {
  const response = await axios.get(
    "https://s3.amazonaws.com/roxiler.com/product_transaction.json"
  );
  const data = response.data;

  for (let item of data) {
    const queryData = `SELECT id FROM tasks WHERE id = ${item.id}`;
    const existingData = await db.get(queryData);
    if (existingData === undefined) {
      const query = `
   INSERT INTO tasks (id, title, price, description, category, image, sold, dateOfSale) 
   VALUES (
       ${item.id},
       '${item.title.replace(/'/g, "''")}',
       ${item.price},
       '${item.description.replace(/'/g, "''")}',
       '${item.category.replace(/'/g, "''")}',
       '${item.image.replace(/'/g, "''")}',
       ${item.sold},
       '${item.dateOfSale.replace(/'/g, "''")}'
   );
`; /*The .replace(/'/g, "''") in the SQL query helps prevent SQL injection attacks by escaping single quotes.*/

      await db.run(query);
    }
  }
  console.log("Transactions added");
};

fetchAndInsert();

//API 1
app.get("/tasks/", async (request, response) => {
  let data = null;

  const { search_q = "" } = request.query;

  let query = `select * from tasks where 
            title LIKE '%${search_q}%'
        OR description LIKE '%${search_q}%'
        OR price LIKE '%${search_q}%' LIMIT 10 OFFSET 0;`;

  try {
    data = await db.all(query);
    response.send(data);
  } catch (error) {
    console.log(error);
  }
});

//API 2

// ***** scenario 1 *****
app.get("/tasks/totalSales/", async (request, response) => {
  let data = null;

  const { month } = request.query;

  let query = `select sum(price) as totalSales from tasks where (sold = true) And
                (CAST(strftime('%m', dateOfSale) AS INTEGER) = ${month})
                ;`;

  try {
    data = await db.all(query);
    response.send(data);
  } catch (error) {
    console.log(error);
  }
});

// ***** scenario 2 *****
app.get("/tasks/toldSoldItem/", async (request, response) => {
  let data = null;

  const { month } = request.query;

  let query = `select count(id) as totalSoldItems from tasks where (sold = true) And
                (CAST(strftime('%m', dateOfSale) AS INTEGER) = ${month})
                ;`;

  try {
    data = await db.all(query);
    response.send(data);
  } catch (error) {
    console.log(error);
  }
});

// ***** scenario 3 *****
app.get("/tasks/totalUnsoldItems/", async (request, response) => {
  let data = null;

  const { month } = request.query;

  let query = `select count(id) as totalUnsoldItems from tasks where (sold = false) And
                (CAST(strftime('%m', dateOfSale) AS INTEGER) = ${month})
                ;`;

  try {
    data = await db.all(query);
    response.send(data);
  } catch (error) {
    console.log(error);
  }
});

//API 3

app.get("/tasks/barChart", async (request, response) => {
  console.log("clicked");
  let data = null;
  const { month } = request.query;

  console.log(month);

  let newQuery = `
  SELECT
  count(id) as numberOfItems, 
  CASE
    WHEN (price <= 100) THEN "0 - 100"
    WHEN (
      price > 100
      AND price <= 200
    ) THEN '101 - 200'
    WHEN (
      price > 200
      AND price <= 300
    ) THEN '201 - 300'
    WHEN (
      price > 300
      AND price <= 400
    ) THEN '301 - 400'
    WHEN (
      price > 400
      AND price <= 500
    ) THEN '401 - 500'
    WHEN (
      price > 500
      AND price <= 600
    ) THEN '501 - 600'
    WHEN (
      price > 600
      AND price <= 700
    ) THEN '601 - 700'
    WHEN (
      price > 700
      AND price <= 800
    ) THEN '701 - 800'
    WHEN (
      price > 800
      AND price <= 900
    ) THEN "801 - 900"
    ELSE "> 901 - above"
  END AS rangeOfPrice
FROM
  tasks 
  WHERE (CAST(strftime('%m', dateOfSale) AS INTEGER) = ${month}) 
  group by rangeOfPrice;`;

  try {
    data = await db.all(newQuery);
    response.send(data);
  } catch (error) {
    console.log(error);
  }
});

//API 4

app.get("/tasks/pieChart", async (request, response) => {
  console.log("clicked");
  let data = null;
  const { month } = request.query;

  let query = `
  select DISTINCT Category, count(id) as numberOfItems from tasks 
  WHERE (CAST(strftime('%m', dateOfSale) AS INTEGER) = ${month})
  group by category; 
  `;

  try {
    data = await db.all(query);
    response.send(data);
  } catch (error) {
    console.log(error);
  }
});

module.exports = app;
