import express from 'express';
import authController from '../controllers/authController.js';
import authenticateToken from '../middlewares/authMiddleware.js';

const router = express.Router();

// POST route to create a new user
router.post('/signup', authController.signup);

// POST route to sign in with existing user
router.post('/signin', authController.signin);

// POST route to get a new access token with by existing refresh token
router.post('/signin/new_token', authController.signinNewToken);

// GET route to get user information with valid refresh and access tokens
router.get('/info', authenticateToken, authController.info);

//  GET route to log out and get a new refresh token
router.get('/logout', authenticateToken, authController.logout);

export default router;