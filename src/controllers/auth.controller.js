import { ApiError } from '../utils/api-error.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';
import crypto from 'crypto';
import {
  emailVerificationContent,
  resetPasswordContent,
  sendEmail,
} from '../utils/mail.js';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';

const changeCurrentPassword = asyncHandler(async (req, res) => {
  // Get old nad new passwords from req body
  const { oldPassword, newPassword } = req.body;

  // Find user by ID
  const user = await User.findById(req.user?._id);

  // Check if old password is correct
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect)
    throw new ApiError(
      400,
      'Current password is wrong. Please provide correct password!'
    );

  // Save the new password in DB
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Password changed successfully'));
});

const forgotPasswordRequest = asyncHandler(async (req, res) => {
  // User will fill in email and click submit
  // in the frontend
  const { email } = req.body;

  // Get user with this email
  const user = await User.findOne({ email });

  if (!user) throw new ApiError(404, 'User not found');

  // Generate temporary tokens for resetting password
  const { unhashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();

  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordTokenExpiry = tokenExpiry;

  await user.save({ validateBeforeSave: false });

  // Send email with the required unhashed token
  await sendEmail({
    email: user?.email,
    subject: 'Password reset request',
    mailGenContent: resetPasswordContent(
      user.username,
      `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unhashedToken}`
    ),
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        'Password reset mail has been sent on your registered mail id'
      )
    );
});

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      'Something went wrong while generating access or refresh token'
    );
  }
};

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, 'Current User Fetched Successfully'));
});

const loginUser = asyncHandler(async (req, res) => {
  // Get credentials from body
  const { email, password, username } = req.body;

  // Allow log in from email or username
  if ((!username && !email) || !password)
    throw new ApiError(400, 'Username/Email and Password is required');

  // Get what field is provided and what is its value
  // This helps in dynamic message generation
  const field = username ? 'username' : 'email';
  const value = username || email;

  // Find user in db by field and value
  const user = await User.findOne({ [field]: value });

  // No user found? Throw error
  if (!user) {
    throw new ApiError(400, `User with ${field} ${value} does not exist`);
  }

  // Check the password
  const isPasswordCorrect = await user.isPasswordCorrect(password);

  // Password incorrect? throw error
  if (!isPasswordCorrect) throw new ApiError(401, 'Invalid Password');

  // Generate access and refresh tokens using JWT
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // Get the logged in user
  const loggedInUser = await User.findById(user._id).select(
    '-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry'
  );

  // Cookie options
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };

  return res
    .status(200)
    .cookie('accessToken', accessToken, options)
    .cookie('refreshToken', refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        'User logged in successfully'
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // get user by id and alear the refresh token in DB
  await User.findByIdAndUpdate(
    // the auth.middleware appends decoded JWT to the req body
    req.user._id,
    {
      $set: {
        refreshToken: '',
      },
    },
    {
      returnDocument: 'after',
    }
  );

  // Use SAME OPTIONS AS LOGIN
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };

  // Clear cookies
  return res
    .status(200)
    .clearCookie('accessToken', options)
    .clearCookie('refreshToken', options)
    .json(new ApiResponse(200, {}, 'User logged out successfully'));
});

const registerUser = asyncHandler(async (req, res) => {
  const { email, username, password, role } = req.body;

  // Validate Data take care of by express-validator middleware

  // Check if User already in DB
  const userExist = await User.findOne({
    $or: [{ username }, { email }],
  });

  // If exist give error message / page
  if (userExist)
    throw new ApiError(409, 'User with email or username already exists', []);

  // Insert user in DB
  const user = await User.create({
    email,
    password,
    username,
    isEmailVerified: false,
  });

  // Create hashedToken to save in DB
  // Create unhashedToken to send in email
  // We use these to verify the user when they click on the link in the email
  const { unhashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();
  user.emailVerificationToken = hashedToken;
  user.emailVerificationTokenExpiry = tokenExpiry;

  // Persist user in DB with the hashedToken and tokenExpiry
  await user.save({ validateBeforeSave: false });

  // Send verification email to user
  await sendEmail({
    email: user?.email,
    subject: 'Please Verify your email',
    mailGenContent: emailVerificationContent(
      user.username,
      `${req.protocol}://${req.get('host')}/api/v1/users/verify-email/${unhashedToken}`
    ),
  });

  // Return the user data without the password and tokens for security
  const createdUser = await User.findById(user._id).select(
    '-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry'
  );

  if (!createdUser)
    throw new ApiError(500, 'Something went wrong while registering a user');

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { user: createdUser },
        'User registered successfully. Please check your email to verify your account'
      )
    );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  // Get user's refresh token from cookies or req body
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) throw new ApiError(401, 'Unauthorized Access');

  try {
    // Get data from the refresh token
    const payload = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // Find user having the decoded refresh token
    const user = await User.findById(payload?._id);
    if (!user) throw new ApiError(401, 'Invalid Refresh Token');

    // Match incoming token with db token
    // If they are not equal that means tokens have expired
    if (incomingRefreshToken !== user?.refreshToken)
      throw new ApiError(401, 'Refresh Token Expired');

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    };

    // Get new access and refresh tokens
    const { newAccessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    // Save new refresh Token in DB
    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    return res
      .status(200)
      .cookie('accessToken', newAccessToken, options)
      .cookie('refreshToken', newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { newAccessToken, refreshToken: newRefreshToken },
          'New Access & Refresh Tokens Generated'
        )
      );
  } catch (error) {
    throw new ApiError(401, 'Invalid refresh token');
  }
});

const resendEmailVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);

  if (!user) throw new ApiError(404, 'User does not exist');

  if (user.isEmailVerified) throw new ApiError(409, 'User is already verified');

  const { unhashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();
  user.emailVerificationToken = hashedToken;
  user.emailVerificationTokenExpiry = tokenExpiry;

  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user?.email,
    subject: 'Please Verify Your Email',
    mailGenContent: emailVerificationContent(
      user.username,
      `${req.protocol}://${req.get('host')}/api/v1/users/verify-email/${unhashedToken}`
    ),
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, {}, 'Mail has been sent to you registered email id')
    );
});

const resetForgotPassword = asyncHandler(async (req, res) => {
  // Get reset token and new password
  const { resetToken } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) throw new ApiError(400, 'Please fill in new password');

  // Hash the reset token to search user in db
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  const user = await User.findOne({ forgotPasswordToken: hashedToken });

  if (!user) throw new ApiError(400, 'Invalid Email Verification Token');

  // Check if toekn is still valid
  if (user.forgotPasswordTokenExpiry < Date.now())
    throw new ApiError(400, 'Email Verification Token has Expired');

  user.forgotPasswordToken = undefined;
  user.forgotPasswordTokenExpiry = undefined;

  // Change user's password
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Password reset successfully'));
});

const verifyEmail = asyncHandler(async (req, res) => {
  // Get Verification Token From URL
  const { verificationToken } = req.params;

  if (!verificationToken)
    throw new ApiError(400, 'Email Verification Token is missing');

  // DB stores hash version
  // hash the incoming token to search in db
  const hashedToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  // Search User by verification token
  const user = await User.findOne({ emailVerificationToken: hashedToken });

  if (!user) throw new ApiError(400, 'Invalid Email Verification Token');

  // If verification time has expired do not verify user
  if (user.emailVerificationTokenExpiry < Date.now())
    throw new ApiError(400, 'Email Verification Token Expired');

  // Verify User and remove token and expiry (save some bytes)
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationTokenExpiry = undefined;

  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isEmailVerified: true,
      },
      'User Email is verified'
    )
  );
});

export {
  changeCurrentPassword,
  forgotPasswordRequest,
  generateAccessAndRefreshTokens,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  refreshAccessToken,
  resendEmailVerification,
  resetForgotPassword,
  verifyEmail,
};
