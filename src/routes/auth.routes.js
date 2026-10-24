import {
  changeCurrentPassword,
  forgotPasswordRequest,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  resendEmailVerification,
  resetForgotPassword,
  verifyEmail,
} from '../controllers/auth.controller.js';
import { registerUser } from '../controllers/auth.controller.js';
import { Router } from 'express';
import {
  userChangeCurrentPasswordValidator,
  userForgotPasswordValidator,
  userLoginValidator,
  userRegisterValidator,
  userResetForgotPasswordValidator,
} from '../validators/index.js';
import { validate } from '../middlewares/validator.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// Unsecure Routes
router.route('/login').post(userLoginValidator(), validate, loginUser);

router
  .route('/forgot-password')
  .post(userForgotPasswordValidator(), validate, forgotPasswordRequest);

router.route('/refresh-token').post(refreshAccessToken);

router.route('/register').post(userRegisterValidator(), validate, registerUser);

router
  .route('/reset-password/:resetToken')
  .post(userResetForgotPasswordValidator(), validate, resetForgotPassword);

router.route('/verify-email/:verificationToken').get(verifyEmail);

// Secure Routes (Routes with JWT verification)
router
  .route('/change-password')
  .post(
    verifyJWT,
    userChangeCurrentPasswordValidator(),
    validate,
    changeCurrentPassword
  );

router.route('/current-user').get(verifyJWT, getCurrentUser);

router
  .route('/resend-email-verification')
  .post(verifyJWT, resendEmailVerification);

router.route('/logout').post(verifyJWT, logoutUser);

export default router;
