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
const jwt = require('jsonwebtoken');
// load bcrypt
let bcrypt = require('bcryptjs');
// load fetch
let fetch = require("node-fetch");
//load bodyparser
var bodyParser = require('body-parser')
require('events').EventEmitter.prototype._maxListeners = 100;
//authorization-check
const checkAuth = require('./routes/check-auth');

// Initialize express
let app = express();

let server = require('http').Server(app);
//load environment configs from file .env 
require('dotenv').config({
    path: __dirname + '/.env'
});

console.log(process.env.CLEARDB_DATABASE_URL);

var mysqlConnection = mysql.createPool(
    process.env.CLEARDB_DATABASE_URL
);

// Server port
const httpPort = process.env.PORT || 3001;
console.log(httpPort);
// URL to api.
let apiURL = `http://localhost:${httpPort}/api/apirequests`;

// make it possible to use database connection in requests.
app.use((request, response, next) => {
    request.db = mysqlConnection;
    next();
});

// view engine setup
app.use(express.static("views"));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// create route for our api
app.use('/api/apirequests', apiRouter);

app.get('/redirectroute', (req, res) => {
    res.redirect('/restaurants');
});

// allRestaurants URL
app.get('/restaurants', checkAuth, async (req, res) => {
  
    let currentUser = req.userData;
    console.log(req.userData.username);

    let result = await fetch(`${apiURL}/restaurants`)
        .then(response => response.json());
    let allTypes = await fetch(`${apiURL}/allTypes`)
        .then(response => response.json());

    if (currentUser.username == "admin") {
        res.render('./allRestaurantsAdmin.ejs', {
            "allRestaurants": result.result,
            "currentUser": currentUser.username,
            "allTypes" : allTypes.result
        });
    } else {
        res.render('./allRestaurants.ejs', {
            "allRestaurants": result.result,
            "currentUser": currentUser.username,
            "allTypes" : allTypes.result
        });
    }
});

// top 10 raited resaurants URL
app.get('/top10', checkAuth, async (req, res) => {
  
    let currentUser = req.userData;
    console.log(req.userData.username);

    let result = await fetch(`${apiURL}/top10`)
        .then((response => response.json()));
    let allTypes = await fetch(`${apiURL}/allTypes`)
        .then(response => response.json());
    
        res.render('./top10.ejs', {
            "allRestaurants": result.result,
            "currentUser" : currentUser.username,
            "allTypes" : allTypes.result
        });
});

//Add new restaurant
app.post('/restaurants', (req, res) => {
    let dataToSend = {
        resname: req.body.resname,
        reslocation: req.body.reslocation,
        restype: req.body.restype
    };
     fetch(`${apiURL}/restaurants`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
    }).then(response => response.json()).then(data => {
        res.redirect('/redirectroute');
    });
   
});


//delete restaurant and reviews related to the restaurant
app.post("/restaurants/:id", checkAuth, (req, res) => {
    let idToDelete = req.params.id;
    let dataToSend = {
       idToDelete : idToDelete
   }
    
    fetch(`${apiURL}/restaurants`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
    }).then(response => response.json());
    res.redirect('/redirectroute');
    
});
// get restaurant to edit
app.get('/editRestaurants/:id', async (req, res) => {
    let idToFind = req.params.id;
    console.log(idToFind);

    let result = await fetch(`${apiURL}/editRestaurant/${idToFind}`)
    .then((response => response.json()));

    console.log(result.result);
    res.render('./editRestaurants.ejs', {
        "theRestaurant": result.result
    });
});
//post edit info, måste ha annat namn (annars samma post ovan)
app.post('/editRestaurants/:id', checkAuth, (req, res) => {
    let idToEdit = req.params.id;
    let newName = req.body.resname;
    let newLocation = req.body.resloc;
    let newType = req.body.restype;

    let dataToSend = {
        idToEdit : idToEdit,
        newName : newName,
        newLocation : newLocation,
        newType : newType
    }

    fetch(`${apiURL}/restaurants`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
    }).then(response => response.json().then(data => {
        res.redirect('/redirectroute');
    }));
    
});

app.get('/login', (req, res) => {
    res.render('./login.ejs');
});


//signup get
app.get('/signup', (req, res) => {
    res.render('./newAccount.ejs');
});

//signup post
app.post('/signup', (req, res) => {
    let username = req.body.username;
    let db = req.db;
    let password = req.body.password;

    db.escape(password);

    let dataToSend = {
        username : username,
        password : password
    }
    fetch(`${apiURL}/signup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
    }).then(response => response.json());
    res.redirect('/login');
});

//login post
app.post('/login', (req, res) => {
    let username = req.body.userName;
    let password = req.body.password;
    let db = req.db;
    db.query(`SELECT user_ID, user_Name, user_Password FROM users`, (err, rows) => {
        if (err) throw err;
        rows.forEach((row) => {
            if (username == row.user_Name) {
                bcrypt.compare(password, row.user_Password, (err, result) => {
                if (result) {
                    console.log("im in");
                    const token = jwt.sign({
                            username: username,
                            userID: row.user_ID
                        },
                        process.env.JWT_KEY, {
                            expiresIn: "1h"
                        }
                    );
                    console.log("set token");
                    
                    //RESPONDING AS A COOKIE WAS THE WAY
                    res.cookie('token', token, {maxAge: 500 * 1000,httpOnly: true});   
                    res.redirect('/restaurants');
                    }
                    if(err) {
                        res.sendStatus(404).json({
                            message : "failed login"
                        })
                    }
                });
            }
        });

           

    });
    //res.redirect('/restaurants');
});

app.get('/logout', (req, res) => {
    res.clearCookie('token', {
        path: '/'
    });
    res.redirect('/login');
});

//Delete user
app.post('/deleteUser/:userID', checkAuth, (req, res) => {
    let userToDelete = req.params.userID;
    console.log(userToDelete);

    let dataToSend = {
        userToDelete : userToDelete
    }

    fetch(`${apiURL}/user`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
    }).then(response => response.json());
    res.redirect('/login');

});


//Get Review site
app.get('/reviewRestaurant', checkAuth, (req, res) => {
    console.log(req.userData);
    let dataToSend = [];

    mysqlConnection.query(`SELECT * ` +
        `FROM restaurants`, (err, rows) => {
            if (err) throw err;
            rows.forEach((row) => {
                dataToSend.push(row);
            });
            res.render('./reviewRestaurant.ejs', {
                "allRestaurants": dataToSend
            });
        });
});

app.get('/addRestaurant', checkAuth, (req, res) => {
    res.render('./addRestaurant.ejs');
});


//Submit the raitings to reviews table
app.post('/reviews', checkAuth, async (req, res) => {
    let currentUser = req.userData.username;
    console.log(currentUser);
    let chosenRestaurant = req.body.chosenRestaurant;
    let reviewRaiting = req.body.reviewRaiting;
    let reviewText = req.body.reviewText;

    let dataToSend = {
        currentUser : currentUser,
        chosenRestaurant : chosenRestaurant,
        reviewRaiting : reviewRaiting,
        reviewText : reviewText
    };
    console.log("nu skickar vi fetch");
    await fetch(`${apiURL}/reviews`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
    }).then(response => response.json().then(data => {
        res.redirect('/redirectroute');
    }));;
    
});

//Ska inte behöva vara inloggad som admin för att se andras reviews
app.get('/reviews/:id', checkAuth, async (req, res) => {
    let ID = req.params.id;
    let currentUser = req.userData.username;
    console.log("logged in as " + req.userData.username);

    let result = await fetch(`${apiURL}/reviews/${ID}`)
    .then((response => response.json()));
   
    res.render('./reviews.ejs', {
        "reviews": result.result,
        "currentUser" : currentUser
    });

       
});

app.post('/deleteReview/:id', (req, res) => {
    let reviewID = req.params.id;
    let dataToSend = {
        reviewID : reviewID
    };
    fetch(`${apiURL}/deleteReview`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
    }).then(response => response.json());
    res.redirect('/restaurants');
});

/*
// create route for our api
app.use('/api/v1', apiRouter);
*/


/*mysqlConnection.end((err) => {
    // The connection is terminated gracefully
    // Ensures all previously enqueued queries are still
    // before sending a COM_QUIT packet to the MySQL server.
});*/

server.listen(httpPort);

module.exports = app;