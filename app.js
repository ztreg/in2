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

//Min egen auth-check
const checkAuth = require('./routes/check-auth');
// Initialize express
let app = express();


let server = require('http').Server(app);
//load environment configs from file .env 
require('dotenv').config({
    path: __dirname + '/.env'
});

console.log(process.env.CLEARDB_DATABASE_URL);

const httpPort = process.env.PORT || 3001;
// Server port
var mysqlConnection = mysql.createConnection(
    process.env.CLEARDB_DATABASE_URL
);

mysqlConnection.on('error', function(err) {
    console.log(err.code);
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
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
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
// al URL
app.get('/all', checkAuth, (req, res) => {
    let currentUser = req.userData.username;
    let dataToSend = [];
    let raitingArray = [];
 
    mysqlConnection.query(`SELECT * ` +
    `FROM restaurants`,(err,rows) => {   
        if(err) throw err;
        rows.forEach( (row) => {
            dataToSend.push(row);
        });
        //Find all reviews(raitings) with the same id that the restaurant has and add it to a array
        //After that, send the array to the view
        for(let i = 0; i < dataToSend.length; i++) {
            let AVGrate = "SELECT AVG(reviewRaiting) as 'AverageRaiting' FROM reviews WHERE restaurant_ID = '"+dataToSend[i].restaurant_ID+"';"
             mysqlConnection.query(AVGrate, function (err, result) {
                if (err) throw err;
                raitingArray.push(result[0].AverageRaiting);
                if(dataToSend[i+1] == null) {
                    if(currentUser.username == "admin") {
                        res.render('./allRestaurantsAdmin.ejs', {
                            "allRestaurants": dataToSend,
                            "raitings" : raitingArray
                        }); 
                    } 
                    else {
                        res.render('./allRestaurants.ejs', {
                            "allRestaurants": dataToSend,
                            "raitings" : raitingArray
                        }); 
                    } 
                }
            }); 
        }         
    }); 
});

app.get('/', (req, res) => {
  res.render('./login.ejs');
});

app.get('/newAccount', (req, res) => {
    res.render('./newAccount.ejs');
});

app.post('/login', (req, res) => {
    let username = req.body.userName;
    let password = req.body.password;
    let userAccess = 0;
    mysqlConnection.query(`SELECT user_ID, user_Name, user_Password FROM users`, (err,rows) => {   
        if(err) throw err;
        rows.forEach( (row) => {
            //console.log(row.user_Name);
           if(username == row.user_Name) {
            userAccess++;
           } else {
              console.log("fel username");
           }
        });
        if(err) throw err;
        rows.forEach( (db) => {
           bcrypt.compare(password, db.user_Password, (err, result) => {
            if(result) {
                userAccess++;
                if(userAccess == 2) {
                    const token = jwt.sign({
                        username : username,
                        userID : db.user_ID
                    }, 
                    process.env.JWT_KEY,
                    {
                        expiresIn : "1h"
                    }
                    );
                    //let stringyy = "Bearer " + token;
                    /*return res.status(200).json({
                        message : "ok it works",
                        token : stringyy
                    });*/
                    res.cookie('token', token, {maxAge: 500 * 1000, httpOnly: true});
                    res.redirect('/addRestaurant');
                   
                         
                } else if(userAccess !== 2) {
                    console.log("ops did not find you in the database"); 
                    res.sendStatus(401);
                }
            }
            if(err) {
                res.sendStatus(401);
                console.log("ops did not find you in the database");
            }
            });
         
        });
       
    }); 
    

  
});

app.post('/signup', (req, res) => {
    //Check if username already exists
   let userExists = false;
    mysqlConnection.query(`SELECT user_Name FROM users`, (err,rows) => {   
        if(err) throw err;
        rows.forEach( (row) => {
           if(req.body.username == row.user_Name) {
            userExists = true;
            console.log("oops found someone with the same username");
           } else {
              console.log("all good");
           }
        });
    if(userExists == false) {
        //hash password before saving it
        bcrypt.hash(req.body.password, 10, (err, hash) => {
            if(err) {
                return res.status(500).json({
                    error : err
                })
            } else {
                let username = req.body.username;
                let password = hash;
                let sql = "INSERT INTO `users` (`user_Name`, `user_Password`) VALUES ('"+username+"', '"+password+"')";
                mysqlConnection.query(sql, function (err, result) {
                    if (err) throw err;
                    console.log("sucess");
                    res.redirect("/all");
                }); 
            }
        })
    } else {
        console.log("account namn fanns redan");
        res.redirect('/newAccount');
    }
    });
    
});
app.get('/logout', (req, res) => {
    res.clearCookie('token', {path: '/'});
    res.redirect('/');
});
app.post('/deleteUser/:userID', checkAuth, (req, res) => {
    let userToDelete = req.params.userID;
    console.log(userToDelete);

    let sql = "DELETE FROM `users` WHERE `user_ID` = "+userToDelete+";"
    mysqlConnection.query(sql, function (err, result) {
        if (err) throw err;
        console.log("Number of records deleted: " + result.affectedRows + " with id " + userToDelete);
    });
    res.redirect("/");
});


//Get Review site
app.get('/reviewRestaurant', checkAuth, (req, res) => {
   console.log(req.userData);
    let dataToSend = [];

    mysqlConnection.query(`SELECT * ` +
    `FROM restaurants`,(err,rows) => {   
        if(err) throw err;
        rows.forEach( (row) => {
            dataToSend.push(row);
        });
        //console.log(dataToSend[0].restaurant_Location);
        res.render('./reviewRestaurant.ejs', {
            "allRestaurants": dataToSend
        }); 
    });
});

app.get('/addRestaurant', checkAuth, (req, res)=> {
    console.log(req.cookies['token']);
 
    res.render('./addRestaurant.ejs');
});

app.post('/addRestaurant', checkAuth, (req, res)=>{
    console.log(req.cookies);
    let resname = req.body.resname;
    let reslocation = req.body.reslocation;
    let restype = req.body.restype;

    let sql = "INSERT INTO `restaurants` (`restaurant_Name`, `restaurant_Location`, `restaurant_Type`) VALUES ("+mysqlConnection.escape(resname)+", "+mysqlConnection.escape(reslocation)+", "+mysqlConnection.escape(restype)+")";
    mysqlConnection.query(sql, function (err, result) {
        if (err) throw err;
        console.log("sucess");
        res.redirect("/all");
      }); 

      //var sql = "INSERT INTO `users` (`UserName`, `UserPassword`) VALUES ('"+useremail+"','"+ password+"')";
});
    
//delete restaurant and reviews related to the restaurant
app.post("/deleteRestaurant/:id", checkAuth, (req, res) => {
    let idToDelete = req.params.id;
    console.log(idToDelete);

    let sql = "DELETE FROM `restaurants` WHERE `restaurant_ID` = "+idToDelete+";"
    let sql2 = "DELETE FROM `reviews` WHERE `restaurant_ID` = "+idToDelete+";"
    mysqlConnection.query(sql, function (err, result) {
        if (err) throw err;
        console.log("Number of records deleted: " + result.affectedRows + " with id " + idToDelete);
    });
    mysqlConnection.query(sql2, function (err, result) {
        if (err) throw err;
        console.log("Number of records deleted: " + result.affectedRows + " with id " + idToDelete);
        res.redirect("/all");
    });
});

// get edit info
app.get('/editRestaurant/:id', checkAuth, (req, res) => {
    let idToFind = req.params.id;
    console.log(idToFind);
    let dataToSend = [];
   
    mysqlConnection.query(`SELECT * ` +
    `FROM restaurants WHERE restaurant_ID = `+idToFind+``,(err,result) => {  
        if(err) throw err;  
        dataToSend.push(result[0]);    
        res.render('./editRestaurants.ejs', {
            "theRestaurant": dataToSend
        }); 
    });
});

//post edit info
app.post('/editRestaurant/:id', checkAuth, (req, res) => {
    let idToEdit = req.params.id;
    let newName = req.body.resname;
    let newLocation = req.body.reslocation;
    let newType = req.body.restype;

    let sql = "UPDATE restaurants SET `restaurant_Name` = '"+newName+"', `restaurant_Location` = '"+newLocation+"', `restaurant_Type` = '"+newType+"' WHERE `restaurant_ID` = '"+idToEdit+"';"

    mysqlConnection.query(sql, function (err, result) {
        if (err) throw err;
        console.log("Number of records edited: " + result.affectedRows + " with id " + idToEdit);
        res.redirect("/all");
      });
});

//Submit the raitings to reviews table
app.post('/submitRaitings/', checkAuth, (req, res) => {
    let currentUser = req.userData.userID;
    let chosenRestaurant = req.body.chosenRestaurant;
    let reviewRaiting = req.body.reviewRaiting;
    let reviewText = req.body.reviewText;
    let restID;
    //First we need the ID of the restaurant
    let sql = "SELECT `restaurant_ID` FROM `restaurants` WHERE `restaurant_Name` = '"+chosenRestaurant+"';"
    mysqlConnection.query(sql, function (err, result) {
        if (err) throw err;
        restID = result[0].restaurant_ID;
        //Now we can add the review with the restaurantID
        let sql2 = "INSERT INTO `reviews` (`reviewRestName`, `reviewText`, `reviewRaiting`, `restaurant_ID`, `user_ID`) VALUES ('"+chosenRestaurant+"', '"+reviewText+"', '"+reviewRaiting+"', '"+restID+"', '"+currentUser+"')";
        mysqlConnection.query(sql2, function (err, result) {
            if (err) throw err;
            console.log("la till review för restaurang med id " + restID);
            res.redirect("/all");
          });   
    });
});

//Ska inte behöva vara inloggad som admin för att se andras reviews
app.get('/reviews/:id', (req, res) => {
    let ID = req.params.id;
    let dataToSend = []; 
    let writer = [];
    let testID = 0;

    mysqlConnection.query(`SELECT * ` +
    `FROM reviews WHERE restaurant_ID = '`+ID+`'`,(err,rows) => {   
        //console.log(rows);
        if(err) throw err;
        rows.forEach( (row) => {
            dataToSend.push(row);
            testID = row.user_ID;
            console.log(testID);
            //console.log(row.user_ID);
                let sql = "SELECT `user_Name` FROM `users` WHERE `user_ID` = '"+testID+"';"
                mysqlConnection.query(sql, function (err, result) {
                if (err) throw err;
                    //console.log(result);
                    console.log(result[0]);
                    writer.push(result.user_Name);
                    //console.log(writer);
                });
        });
        
        //console.log(row);
        //console.log(rows[]);
      
        res.render('./reviews.ejs', {
            "reviews": dataToSend,
            "writer" : writer
        }); 

    });
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