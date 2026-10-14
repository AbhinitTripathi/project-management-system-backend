import { User } from '../models/user.model.js';
import { ApiResponse } from '../utils/api-response.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { emailVerificationContent, sendEmail } from '../utils/mail.js';

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

const registerUser = asyncHandler(async (reqm, res) => {
  const { email, username, password, role } = reqm.body;

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
  sendEmail({
    email: user?.email,
    subject: 'Please Verify your email',
    mailGenContent: emailVerificationContent(
      user.username,
      `${reqm.protocol}://${reqm.get('host')}/api/v1/users/verify-email/${unhashedToken}`
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

export { registerUser, generateAccessAndRefreshTokens };
