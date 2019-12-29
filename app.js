// load express
let express = require('express');
// load path
let path = require('path');
// load cookieparser
let cookieParser = require('cookie-parser');
// load morgan (logging)
let logger = require('morgan');
// load route for api
let apiRouter = require('./routes/api');
// load sql 
const mysql = require('mysql');
// load jsonwebtoken (For tokens)

// load bcrypt
let bcrypt = require('bcryptjs');
// load fetch
let fetch = require("node-fetch");

// Initialize express
let app = express();


let server = require('http').Server(app);
//load environment configs from file .env 
/*require('dotenv').config({
    path: __dirname + '/.env'
});*/
const httpPort = process.env.PORT || 3001
// Server port
const mysqlConnection = mysql.createConnection({
    host: 'localhost',
    port: '10003',
    user: 'root',
    password: 'root',
    database: 'resturant_test',
    multipleStatements : true
});


// URL to api.
//let apiURL = `http://localhost:${httpPort}/api/v1`

// view engine setup
app.use(express.static("views"));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
mysqlConnection.connect((err) => {
    //console.log(mysqlConnection);
    if(err){
      console.log('Error connecting to Db');
      return;
    }
    console.log('Connection established at port ' + httpPort);

});
// Root URL
app.get('/', (req, res) => {
    let dataToSend = [];
    mysqlConnection.query(`SELECT * ` +
    ` FROM restaurants `,(err,rows) => {
        
        if(err) throw err;
       
        rows.forEach( (row) => {
            //console.log(`${row.restaurant_Name}` + " " +  `${row.restaurant_Location}`);
            dataToSend.push(row);
            
        });
        console.log(dataToSend[0].restaurant_Location);
        res.render('./allRestaurants.ejs', {
            "allRestaurants": dataToSend
        }); 
    });

    
});
/*mysqlConnection.query(`SELECT * ` +
` FROM restaurants `,(err,rows) => {
    if(err) throw err;
  
    rows.forEach( (row) => {
        console.log(`${row.restaurant_Name}` + " " +  `${row.restaurant_Location}`);
    });
});*/


// make it possible to use database connection in requests.
app.use(function (req, res, next) {
    req.db = db;
    next();
});

// create route for our api
app.use('/api/v1', apiRouter);



/*mysqlConnection.end((err) => {
    // The connection is terminated gracefully
    // Ensures all previously enqueued queries are still
    // before sending a COM_QUIT packet to the MySQL server.
});*/

server.listen(httpPort);