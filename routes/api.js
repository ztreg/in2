let express = require('express');
let router = express.Router();
//authorization-check
const checkAuth = require('./check-auth');
let bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


//Returns 2 objects, one with all the restaurants and one with the AVG raiting for them
router.get('/restaurants', (req, res) => {
    let db = req.db;
    
    let sql = `SELECT COUNT(*) as nmrOfReviews, r.restaurant_ID, r.restaurant_Name, r.restaurant_Location, r.restaurant_Type, 
    ROUND(SUM(rev.reviewRaiting) / COUNT(rev.restaurant_ID),1) as topraited
    FROM restaurants r
    INNER JOIN reviews rev ON r.restaurant_ID = rev.restaurant_ID
    GROUP BY r.restaurant_ID
    ORDER BY r.restaurant_Name ASC`
    
    let sql2 = `SELECT * FROM restaurants`
    let alivarint = 0;
    let newobject = {};
   
    db.query(sql, function(err, result) {
        if(err) throw (err);
        db.query(sql2, (err, result2) => {
            if(err) throw(err);
            for(let i = 0; i < result2.length; i++) {
                for(let x = 0; x < result.length; x++) {
                    if(result2[i].restaurant_ID == result[x].restaurant_ID) {
                        console.log("test");
                        break;
                    }
                    else {
                        alivarint++;
                        console.log(alivarint + " ska vara " + result.length);
                        if(alivarint == result.length) {
                            newobject.nmrOfReviews = 0;
                            newobject.restaurant_ID = result2[i].restaurant_ID;
                            newobject.restaurant_Name = result2[i].restaurant_Name;
                            newobject.restaurant_Location = result2[i].restaurant_Location;
                            newobject.restaurant_Type = result2[i].restaurant_Type;
                            newobject.topraited = 0;
                            result.push(newobject);
                            console.log("in first if");
                            newobject = {};
                            if(result.length == result2.length){
                                console.log("in second if");
                                result.sort((a, b) => a.restaurant_Name.localeCompare(b.restaurant_Name));
                                result.sort(function(a, b){return a - b});
                                let responseObject = {
                                    result : result
                                };
                                console.log(responseObject);
                                res.send(responseObject);
                            }
                            break;
                            
                        }
                    }
                }
                alivarint = 0;
            }
        });
       
    });
   
});

router.get('/allTypes', (req, res) => {
    let db = req.db;

    let sql = `SELECT DISTINCT(restaurant_Type) FROM restaurants ORDER BY restaurant_Type ASC;`
    db.query(sql, (err, result) => {
        if(err) throw (err);
        let responseObject = {
            result : result
        };
        res.send(responseObject);
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
            bcrypt.hash(req.body.password, 10, (err, hash) => {
                if (err) {
                    return res.status(500).json({
                        error: err
                    })
                } else {
                    let username = req.body.username;
                    let password = hash;
                    let sql = "INSERT INTO `users` (`user_Name`, `user_Password`) VALUES (" + db.escape(username) + ", '" + password + "')";
                    db.query(sql, function (err, result) {
                        if (err) throw err;
                        console.log("user added to database with username : " + username);
                       return res.status(201).send({
                            response : "OK"
                        });
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
    
    let sql1 = "SELECT user_Name FROM users WHERE `user_ID` = " + db.escape(userToDelete) + ";"
    db.query(sql1, function (err, result) {
        if (err) throw err;
            console.log("Number of records deleted: " + result.affectedRows + " with id " + userToDelete);
            let sql2 = "DELETE FROM `users` WHERE `user_ID` = " + db.escape(userToDelete) + ";"
            db.query(sql2, function (err, result2) {
                if (err) throw err;
                console.log("Number of user deleted: " + result2.affectedRows + " with id " + userToDelete);
                let sql3 = "DELETE FROM `reviews` WHERE `WHERE` user_Name = "+ db.escape(result) +";"
                db.query(sql3, function (err, result3) {
                    if (err) throw err;
                    console.log("Number from reviews records deleted: " + result3.affectedRows + " with id " + userToDelete);
                });
            });
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
        }

        let responseObject = {
            result : dataToSend
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
        });  
    });
    return res.status(201).send({
        response : "OK"
    });
});

router.delete('/deleteReview', (req, res) => {
    let db = req.db;
    let id = req.body.reviewID;
    
    let sql = "DELETE FROM `reviews` WHERE `review_ID` = " +db.escape(id)+ ";"
  
    db.query(sql, function (err, result) {
        if (err) throw err;
        console.log("Number of records deleted: " + result.affectedRows + " with id " + id);
        let sql3 = "UPDATE `restaurants` SET `nmrOfReviews` = 'nmrOfReviews + 1' WHERE `restaurant_ID` = "+db.escape(id)+";"
        db.query(sql3, function (err, result) {
            if (err) throw err;
            console.log("tog bort 1 review för restaurang med id " + id + " " + result);
        });
    });
 
});

router.get('/top10', (req, res) => {
    let db = req.db;

    let sql = `SELECT COUNT(*) as nmrOfReviews, r.restaurant_ID, r.restaurant_Name, r.restaurant_Location, r.restaurant_Type,  SUM(rev.reviewRaiting) / COUNT(rev.restaurant_ID) as topraited
    FROM restaurants r
    INNER JOIN reviews rev ON r.restaurant_ID = rev.restaurant_ID
    GROUP BY r.restaurant_ID
    ORDER BY topraited DESC
    LIMIT 0, 10`

    db.query(sql, function(err, result){
        if (err) throw (err);
        console.log(result);
        let responseObject = {
            result : result
        };
        res.send(responseObject);
    });
    
});

module.exports = router;