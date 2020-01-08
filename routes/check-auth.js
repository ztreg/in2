const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        const token = req.cookies['token'];
        const decoded = jwt.verify(token, process.env.JWT_KEY);
        req.userData = decoded;
        return next();
    }
    catch(error) {
        res.redirect('/login');
    }
    return next();
};