let express = require('express');
let router = express.Router();
//authorization-check
const checkAuth = require('./check-auth');
let bcrypt = require('bcryptjs');


//Returns 2 objects, one with all the restaurants and one with the AVG raiting for them
router.get('/restaurants', (req, res) => {
    let db = req.db;
    
    let dataToSend = [];
    let raitingArray = [];

    db.query(`SELECT * ` +
    `FROM restaurants`,(err,rows) => {   
        if(err) throw err;
        rows.forEach( (row) => {
            dataToSend.push(row);
        });
        //Find all reviews(raitings) with the same id that the restaurant has and add it to a array
        //After that, send the array to the view
        for(let i = 0; i < dataToSend.length; i++) {
            let AVGrate = "SELECT AVG(reviewRaiting) as AverageRaiting FROM reviews WHERE restaurant_ID = '"+dataToSend[i].restaurant_ID+"';"
            db.query(AVGrate, function (err, result) {
                if (err) throw err;
                raitingArray.push(result[0].AverageRaiting);
                if(dataToSend[i+1] == null) {
                    let responseObject = {
                        result1 : dataToSend,
                        result2 : raitingArray
                    };
                    res.send(responseObject);
                }
            }); 
        }         
    }); 
    
});

//Add new restaurant with info given in body
router.post('/restaurants',  (req, res) => {
   
let db = req.db;

let resname = req.body.resname;
let reslocation = req.body.reslocation;
let restype = req.body.restype;

    let sql = "INSERT INTO `restaurants` (`restaurant_Name`, `restaurant_Location`, `restaurant_Type`) VALUES ("+db.escape(resname)+", "+db.escape(reslocation)+", "+db.escape(restype)+")";
    db.query(sql, function (err, result) {
        if (err) throw err;
        res.status(201).send({
            response : "ok"
        });
    }); 
});


//Gets a restaurant ID, deletes restaurant and reviews with that ID
router.delete('/restaurants', (req, res) => {
    let db = req.db;
    let idToDelete = req.body.idToDelete;

    let sql = "DELETE FROM `restaurants` WHERE `restaurant_ID` = " + idToDelete + ";"
    let sql2 = "DELETE FROM `reviews` WHERE `restaurant_ID` = " + idToDelete + ";"
    db.query(sql, function (err, result) {
        if (err) throw err;
        console.log("Number of records deleted: " + result.affectedRows + " with id " + idToDelete);
    });
    db.query(sql2, function (err, result) {
        if (err) throw err;
        console.log("Number of records deleted: " + result.affectedRows + " with id " + idToDelete);
        res.redirect("/restaurants");
    });
});

router.get('/editRestaurant/:id', (req, res) => {
    let db = req.db;
    let idToFind = req.params.id;
    console.log("api time");

    db.query(`SELECT * ` +
    `FROM restaurants WHERE restaurant_ID = ` + idToFind + ``, (err, result) => {
        if (err) throw err;
        console.log(result[0]);
        let responseObject = {
            result : result[0],
        };
        
        res.send(responseObject);
    });

});

//Edits the restaurant given in the body
router.put('/restaurants', (req, res) => {
    let db = req.db;
    let idToEdit = req.body.idToEdit;
    let newName = req.body.newName;
    let newLocation = req.body.newLocation;
    let newType = req.body.newType;
    console.log(idToEdit + newName + newLocation + newType);
  
    let sql = "UPDATE restaurants SET `restaurant_Name` = " +db.escape(newName)+ ", `restaurant_Location` = " +db.escape(newLocation)+ ", `restaurant_Type` = " +db.escape(newType)+ " WHERE `restaurant_ID` = " +db.escape(idToEdit)+ ";"

    db.query(sql, function (err, result) {
        if (err) throw err;
        console.log(" edited id " + idToEdit);
        res.status(201).send({
            response : "OK"
        })
    });
});

//Handeles signup info to database, checks if username already exists
router.post('/signup', (req, res) => {
    let db = req.db;
    
    let userExists = false;
    db.query(`SELECT user_Name FROM users`, (err, rows) => {
        if (err) throw err;
        rows.forEach((row) => {
            if (req.body.username == row.user_Name) {
                userExists = true;
                console.log("oops found someone with the same username");
            } else {
                console.log("all good");
            }
        });
        if (userExists == false) {
            //hash password before saving it
            bcrypt.hash(req.body.password, 10, (err, hash) => {
                if (err) {
                    return res.status(500).json({
                        error: err
                    })
                } else {
                    let username = req.body.username;
                    let password = hash;
                    let sql = "INSERT INTO `users` (`user_Name`, `user_Password`) VALUES ('" + username + "', '" + password + "')";
                    db.query(sql, function (err, result) {
                        if (err) throw err;
                        console.log("user added to database with username : " + username);
                        res.redirect("/");
                    });
                }
            })
        } else {
            console.log("account namn fanns redan");
            res.redirect('/newAccount');
        }
    });
});

//Deletes the user with the id from body
router.delete('/user', (req, res) => {
    let db = req.db;
    let userToDelete = req.body.userToDelete;

    let sql = "DELETE FROM `users` WHERE `user_ID` = " + userToDelete + ";"
    db.query(sql, function (err, result) {
        if (err) throw err;
        console.log("Number of records deleted: " + result.affectedRows + " with id " + userToDelete);
    });
    res.redirect("/");

});

router.get('/reviews/:id',  (req, res) => {

    let db = req.db;
    let ID = req.params.id;
    let dataToSend = [];
    let testID = 0;

    db.query(`SELECT *`+
    `FROM reviews as r WHERE r.restaurant_ID = '` + ID + `'`, async (err, rows) => {
        if (err) throw err;
        
        for(let i = 0; i < rows.length; i++) {
            dataToSend.push(rows[i]);
            testID = dataToSend[i].user_ID;
            console.log("Id som har skrivit review: " +testID);
            //console.log(user_Name);     
        }

        let responseObject = {
            result1 : dataToSend
        };
        res.send(responseObject);
    });
});

router.post('/reviews', (req, res) => {
    let db = req.db;
    let currentUser = req.body.currentUser;
    let chosenRestaurant = req.body.chosenRestaurant;
    let reviewRaiting = req.body.reviewRaiting;
    let reviewText = req.body.reviewText;
    let restID;
    //First we need the ID of the restaurant
  
    let sql = "SELECT `restaurant_ID` FROM `restaurants` WHERE `restaurant_Name` = " + db.escape(chosenRestaurant)+ ";"
    db.query(sql, function (err, result) {
        if (err) throw err;
        restID = result[0].restaurant_ID;
        //Now we can add the review with the restaurantID
        let sql2 = "INSERT INTO `reviews` (`reviewRestName`, `reviewText`, `reviewRaiting`, `restaurant_ID`, `userName`) VALUES (" +db.escape(chosenRestaurant)+ ", " + db.escape(reviewText)+ ", " + db.escape(reviewRaiting)+ ", " + db.escape(restID)+ ", "+db.escape(currentUser)+")";
        db.query(sql2, function (err, result) {
            if (err) throw err;
            console.log("la till review för restaurang med id " + restID + " " + result);
            console.log("skickar jag tillbaka");
        });
       
    });
});

router.delete('/deleteReview', (req, res) => {
    let db = req.db;
    let id = req.body.reviewID;
    
    let sql = "DELETE FROM `reviews` WHERE `review_ID` = " +db.escape(id)+ ";"
  
    db.query(sql, function (err, result) {
        if (err) throw err;
        console.log("Number of records deleted: " + result.affectedRows + " with id " + id);
    });
 
});

module.exports = router;