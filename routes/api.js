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
            let AVGrate = "SELECT AVG(reviewRaiting) as 'AverageRaiting' FROM reviews WHERE restaurant_ID = '"+dataToSend[i].restaurant_ID+"';"
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
    let writer = [];
    let testID = 0;
   
    /*SELECT customer_info.firstname, customer_info.lastname, purchases.item

    FROM customer_info INNER JOIN purchases
    
    ON customer_info.customer_number = purchases.customer_number;
*/

    db.query(`SELECT *`+
    `FROM reviews as r WHERE r.restaurant_ID = '` + ID + `'`, async (err, rows) => {
        if (err) throw err;
        
        for(let i = 0; i < rows.length; i++) {
            dataToSend.push(rows[i]);
            testID = dataToSend[i].user_ID;
            console.log("Id som har skrivit review: " +testID);
            //console.log(user_Name);
        
            let sql = "SELECT `user_Name` as Name FROM `users` WHERE `user_ID` = '" + testID + "';"
            await db.query(sql, function (err, result) {
                if (err) throw err;
                console.log("svar från usernames: " + result[i]);
                writer.push(result[i]);
                
                
            });
            
        }


         
       
        let responseObject = {
            result1 : dataToSend,
            result2 : writer
        };
        console.log(responseObject);
        res.send(responseObject);
    });
});

/*// return password hash based on Email address.
router.get('/getPasswordHash/:email', (request, response) => {
    let email = request.params.email;
    let responseObject = {
        response: "OK"
    };

    let db = request.db;

    let collection = db.get("users");

    collection.find({
        "email": email
    }, {
        fields: {
            "password": 1,
            _id: 0
        }
    }, (err, data) => {
        if (err) throw err;
        if (data.length < 1 || data == "") {
            responseObject.result = false;
        } else {
            responseObject.result = data[0].password;
        }
        response.send(responseObject);
    });

});

// get user info based of email address.
router.get('/getUserInfo/:email', (request, response) => {
    let email = request.params.email;
    let responseObject = {
        response: "OK"
    }

    let db = request.db;
    let collection = db.get("users");

    collection.find({
        "email": email
    }, {
        projection: {
            "username": 1,
            _id: 1,
            userRole: 1
        }
    }, (error, data) => {
        if (error) {
            response.send({
                error
            });
            return;
        }

        if (data.length < 1 || data == "") {
            responseObject.result = false;

            response.send(responseObject);
            return;
        }
        responseObject.result = data[0];

        response.send(responseObject);

    });
});

// check if a data type exist and if the wanted data exists.
// used for checking for usersname and email
router.get('/exist/:dataType/:dataToSearch', (request, response) => {
    const allowedTypes = [
        "email",
        "username",
        "_id"
    ];
    let responseObject = {
        response: "OK"
    };
    let dataToSearch = request.params.dataToSearch;
    let dataType = request.params.dataType;

    if (allowedTypes.indexOf(dataType) == -1) {
        responseObject.response = "ERROR";
        responseObject.result = "Datatype not existing!";
        response.send(responseObject);
        return;
    }

    let db = request.db;
    let collection = db.get('users');
    collection.find({
        [dataType]: dataToSearch
    }, {}, (error, data) => {
        if (error) throw error;

        if (data.length < 1 || data == "") {
            responseObject.result = false;
        } else {
            responseObject.result = true;
        }
        response.send(responseObject);
    });

});

// add a new user from post request
router.post('/addUser', (request, response) => {
    let db = request.db;
    let collectionUsers = db.get('users');

    collectionUsers.insert({
        "username": request.body.username,
        "email": request.body.email,
        "password": request.body.password,
        "profilePicturePath": "/images/default.png",
        "userRole": "normalUser"
    }, (error, result) => {
        if (error) {
            response.send({
                error
            })
            return;
        } else {
            response.send({
                result: "OK"
            });
        }
    });
});

// get UserId's status
router.get('/status/:userId', (request, response) => {
    let userId = request.params.userId;

    let db = request.db;
    let collectionUsers = db.get('users');

    let query = {
        _id: userId
    };

    let wantedData = {
        projection: {
            _id: 0,
            status: 1
        }
    };

    let responseObject = {
        response: "OK"
    };

    collectionUsers.findOne(query, wantedData, (error, result) => {
        if (result.length < 1 || result == "") {
            responseObject.response = "ERROR";
            responseObject.result.message = "Could not find user!"

            response.send(responseObject);
            return;
        }
        responseObject.result = result;
        response.send(responseObject);
    });

});

// get all users statuses.
router.get('/status', (request, response) => {
    let db = request.db;
    let collectionUsers = db.get('users');
    let query = {};
    let wantedData = {
        projection: {
            _id: 1,
            status: 1,
            username: 1
        }
    };

    let responseObject = {
        response: "OK"
    };

    collectionUsers.find(query, wantedData, (error, result) => {
        if (result.length < 1 || result == "") {
            responseObject.response = "ERROR";
            responseObject.result.message = "Could not find user!"

            response.send(responseObject);
            return;
        }
        responseObject.result = result;
        response.send(responseObject);
    });
});

// update a specific users status.
router.post('/updateStatus', (request, response) => {
    let db = request.db;
    let collectionUsers = db.get('users');
    let query = {
        _id: request.body.userId
    };
    let updatedValues = {
        $set: {
            status: request.body.status
        }
    };

    if (request.body.userId == "" || request.body.status == "") {
        response.send({
            response: "ERROR",
            result: {
                message: "userId or status missing!"
            }
        });

        return;
    }

    collectionUsers.update(query, updatedValues, (error, result) => {
        if (error) {
            response.send({
                response: "ERROR",
                result: {
                    error
                }
            });
            return;
        }
        response.send({
            response: "OK",
            result: {
                message: result
            }
        });
    });
});

//Recieves data from server, returns given info to server.
router.get('/getProfileData/:userName', (req, res) => {

    currentUserName = req.params.userName;
    let db = req.db;
    let usersCollection = db.get('users');

    usersCollection.find({
        "username": currentUserName
    }, {}, (err, data) => {
        if (err) {
            res.send("user does not exist");
        } else {
            let responseObject = {
                results: data
            };
            res.send(responseObject);
        }

    })
});
//Recieves data from server, returns needed info to show the data needed.
router.get('/editProfile/:userName', (req, res) => {
    let usernameToEdit = req.params.userName;
    let db = req.db;
    let usersCollection = db.get('users');

    usersCollection.findOne({
        username: usernameToEdit
    }, (err, data) => {
        if (err) {
            res.send("error accured when editing");
        } else {
            let responseObject = {
                results: data
            };
            res.send(responseObject);
        }
    });
});
//Recieves data from server, edits/does nothing and returns something to server.
//Deos a check if the profileimage was sent aswell, if not, don't do anything with it.
router.put('/editProfileData/:oldusername', (request, response) => {
    let db = request.db;
    let userTabell = db.get('users');
    let newUserName = request.body.username;
    let newEmail = request.body.email;

    let dataToChange = {
        'username': newUserName,
        'email': newEmail
    };
    if (request.body.profilePicturePath) {
        let newProfilePicturePath = request.body.profilePicturePath;
        dataToChange.profilePicturePath = newProfilePicturePath;
    }

    userTabell.update({
        'username': request.params.oldusername
    }, {
        $set: dataToChange
    }, (err, item) => {
        if (err) {
            // If it failed, return error
            response.send("There was a problem adding the information to the database.");
        } else {
            response.send({
                result: "OK"
            });
        }
    });

});
//Recieves data from server, returns data deleted from database.
router.get('/deleteProfile/:userToDelete', (req, res) => {
    let userToDelete = req.params.userToDelete;
    let db = req.db;
    let userTabell = db.get('users');

    userTabell.findOneAndDelete({
        username: userToDelete
    }, (err, data) => {
        if (err) {
            // If it failed, return error
            response.send("There was a problem deleting the information to the database.");
        } else {
            let responseObject = {
                results: data
            };
            res.send(responseObject);
        }
    });
});

// find chat room
router.get('/findChatRoom/:room', (req, res) => {
    let db = req.db;

    db.get('chatrooms').findOne({
        roomname: req.params.room
    }, (err, data) => {
        if (err) {
            throw err;
        } else {
            let responseObject = {
                response: "OK",
                result: data
            };
            res.send(responseObject);
        }
    });
});

// create chat room
router.post('/createChatRoom', (req, res) => {
    let db = req.db;

    db.get('chatrooms').insert({
        roomname: req.body.roomname,
        members: req.body.members
    }, (err, result) => {
        if (err) {
            throw err;
        } else {
            let responseObject = {
                response: 'OK'
            };
            res.send(responseObject);
        }
    });
});

// find user
router.get('/findUser/:user', (req, res) => {
    let db = req.db;

    db.get('users').findOne({
        username: req.params.user
    }, (err, data) => {
        if (err) {
            throw err;
        } else {
            let responseObject = {
                response: "OK",
                result: data
            };
            res.send(responseObject);
        }
    });
});

// get chat room list
router.get('/getAllChatRooms', (req, res) => {
    let db = req.db;

    db.get('chatrooms').find({}, {
        projection: {
            roomname: 1
        }
    }, (err, data) => {
        if (err) {
            throw err;
        } else {
            let responseObject = {
                response: "OK",
                results: data
            };
            res.send(responseObject);
        }
    });
});

// get old chat room messages
router.get('/getMessages/:room', (req, res) => {
    let db = req.db;

    db.get('messages').find({
        chatroomid: req.params.room
    }, (err, data) => {
        if (err) {
            throw err;
        } else {
            let responseObject = {
                response: "OK",
                results: data
            };
            res.send(responseObject);
        }
    });
});

// get old private messages
router.get('/getPrivateMessages/:sender/:receiver', (req, res) => {
    let db = req.db;

    db.get('private-messages').find({
        senderID: req.params.sender,
        receiverID: req.params.receiver
    }, (err, data) => {
        if (err) {
            throw err;
        } else {
            let responseObject = {
                response: "OK",
                results: data
            };
            res.send(responseObject);
        }
    });
});

// saves chat room messages
router.post('/addMessage', (req, res) => {
    let db = req.db;

    db.get('messages').insert({
        userid: req.body.userid,
        chatroomid: req.body.chatroomid,
        dateAndTime: req.body.dateAndTime,
        message: req.body.message
    }, (err, result) => {
        if (err) {
            throw err;
        } else {
            let responseObject = {
                response: "OK",
                result: result
            };
            res.send(responseObject);
        }
    });
});

// saves private messages
router.post('/addPrivateMessage', (req, res) => {
    let db = req.db;

    db.get('private-messages').insert({
        senderID: req.body.senderID,
        receiverID: req.body.receiverID,
        dateAndTime: req.body.dateAndTime,
        message: req.body.message
    }, (err, result) => {
        if (err) {
            throw err;
        } else {
            let responseObject = {
                response: "OK",
                result: result
            };
            res.send(responseObject);
        }
    });
});

// edit messages
router.put('/editMessage', (req, res) => {
    let db = req.db;

    db.get(req.body.messageType + 'messages').update({
        _id: req.body._id
    }, {
        $set: {
            message: req.body.message
        }
    }, (err, result) => {
        if (err) {
            throw err;
        } else {
            let responseObject = {
                response: "OK",
            };
            res.send(responseObject);
        }
    });
});

// delete message
router.delete('/deleteMessage', (req, res) => {
    let db = req.db;

    db.get(req.body.messageType + 'messages').remove({
        _id: req.body._id
    }, (err, result) => {
        if (err) {
            throw err;
        } else {
            let responseObject = {
                response: "OK",
            };
            res.send(responseObject);
        }
    });
});

// get user info
router.get('/getUser/:userID', (req, res) => {
    let db = req.db;

    db.get('users').findOne({
        _id: req.params.userID
    }, (err, data) => {
        if (err) {
            throw err;
        } else {
            let responseObject = {
                response: "OK",
                result: data
            };
            res.send(responseObject);
        }
    });
});

// returns user data from all users
router.get('/getUsersData', (req, res) => {
    let db = req.db;

    db.get('users').find({}, {
        projection: {
            _id: 1,
            username: 1,
            profilePicturePath: 1
        }
    }, (err, data) => {
        if (err) {
            throw err;
        } else {
            let responseObject = {
                response: "OK",
                results: data
            };
            res.send(responseObject);
        }
    });
});
*/
module.exports = router;