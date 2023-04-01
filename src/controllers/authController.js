import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import Users from '../models/users.js';

/**
 * Get new Access and Refresh tokens
 * @param email
 * @returns {{accessToken: (*), refreshToken: (*)}}
 */
const generateTokenPair = (email) => {
    const accessToken = jwt.sign({email}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: process.env.ACCESS_TOKEN_EXP});
    const refreshToken = jwt.sign({email}, process.env.REFRESH_TOKEN_SECRET, {expiresIn: process.env.REFRESH_TOKEN_EXP});
    return {accessToken, refreshToken};
};

/**
 * Check if user exist in DB
 * @param email
 * @returns {Promise<boolean>}
 */
const isUserExistByEmail = async (email) => {
    return !!await Users.findOne({where: {email}});
};

/**
 * Update refreshToken in Cookies
 * @param res
 * @param refreshToken
 */
const updateCookieToken = (res, refreshToken) => {
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        maxAge: process.env.REFRESH_TOKEN_EXP,
    });
};

/**
 * @param refreshToken
 * @returns {Promise<{errorText: string, isError: boolean, user: {}}>}
 */
export const verifyUserByRefreshToken = async (refreshToken) => {
    let response = {isError: false, errorText: '', user: {}}

    try {
        // Verify the refresh token
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

        // Find the user associated with the refresh token
        const user = await Users.findOne({where: {refreshToken}});

        if (!user) {
            response.isError = true;
            response.errorText = 'Failed to find the user with the refresh token';

            return response;
        }

        response.user = user.dataValues;
    } catch (err) {
        response.isError = true;
        response.errorText = 'Something went wrong during the verification.';
        return response;
    }

    return response;
};

/**
 * @type {{signinNewToken(*, *): Promise<*>, logout(*, *): Promise<*>, signin(*, *): Promise<*>, signup(*, *): Promise<*>, info(*, *): Promise<*>}}
 */
const authController = {

    /**
     * @param req
     * @param res
     * @returns {Promise<*>}
     */
    async signup(req, res) {
        const {email, password} = req.body;

        if (await isUserExistByEmail(email)) {
            return res.status(+process.env.BAD_REQUEST_STATUS_CODE).json({message: 'User already exists', email});
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const {refreshToken} = generateTokenPair(email);
        const newUser = await Users.create({email, refreshToken, password: hashedPassword});

        updateCookieToken(res, refreshToken);

        return res.json({...newUser.dataValues, refreshToken});
    },

    /**
     * @param req
     * @param res
     * @returns {Promise<*>}
     */
    async signin(req, res) {
        const {email, password} = req.body;

        const user = await Users.findOne({where: {email}});

        if (!user) {
            return res.status(+process.env.NOT_FOUND_STATUS_CODE).json({message: 'User not found'});
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(+process.env.UNAUTHORIZED_STATUS_CODE).json({message: 'Incorrect password'});
        }

        const {refreshToken, accessToken} = generateTokenPair(email);

        await Users.update(
            {
                refreshToken: refreshToken,
            },
            {
                where: {id: user.id},
            }
        );

        updateCookieToken(res, refreshToken);

        return res.json({...user.dataValues, accessToken, refreshToken});
    },

    /**
     * @param req
     * @param res
     * @returns {Promise<*>}
     */
    async signinNewToken(req, res) {
        const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(+process.env.UNAUTHORIZED_STATUS_CODE).json({error: 'Missing refresh token'});
        }

        const verifiedUser = await verifyUserByRefreshToken(refreshToken)

        if (verifiedUser.isError) {
            return res.status(+process.env.UNAUTHORIZED_STATUS_CODE).json({message: verifiedUser.errorText});
        }

        // Generate a new access token for the current user
        const accessToken = jwt.sign({email: verifiedUser.user.email}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: process.env.ACCESS_TOKEN_EXP});

        return res.json({accessToken});
    },

    /**
     * @param req
     * @param res
     * @returns {Promise<*>}
     */
    async info(req, res) {
        const refreshToken = req.cookies.refreshToken;
        const verifiedUser = await verifyUserByRefreshToken(refreshToken)

        if (verifiedUser.isError) {
            return res.status(+process.env.UNAUTHORIZED_STATUS_CODE).json({message: verifiedUser.errorText});
        }

        return res.json({id: verifiedUser.user.id});
    },

    /**
     * Logout and update refreshToken in cookies
     * @param req
     * @param res
     * @returns {Promise<*>}
     */
    async logout(req, res) {
        const actualRefreshToken = req.cookies.refreshToken;
        const verifiedUser = await verifyUserByRefreshToken(actualRefreshToken)

        if (verifiedUser.isError) {
            return res.status(+process.env.UNAUTHORIZED_STATUS_CODE).json({message: verifiedUser.errorText});
        }

        const {refreshToken} = generateTokenPair(verifiedUser.user.email);

        await Users.update(
            {
                refreshToken: refreshToken,
            },
            {
                where: {id: verifiedUser.user.id},
            }
        );

        //Update refreshToken in cookies
        updateCookieToken(res, refreshToken);

        return res.json({message: 'Logged out successful', refreshToken});
    }
};

export default authController;