import jwt from 'jsonwebtoken';

/**
 * Authorization check
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization;

    if (!token) {
        return res.status(process.env.UNAUTHORIZED_STATUS_CODE).json({
            message: 'Authorization failed: Missing Bearer(access) token'
        });
    }

    try {
        jwt.verify(token.split(' ')[1], process.env.ACCESS_TOKEN_SECRET);
        next();
    } catch (err) {
        console.log(err)
        return res.status(process.env.UNAUTHORIZED_STATUS_CODE).json({
            message: 'Authorization failed: Invalid Bearer(access) token'
        });
    }
};

export default authenticateToken;