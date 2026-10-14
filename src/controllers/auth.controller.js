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
  sendEmail({
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

const loginUser = asyncHandler(async (req, res) => {
  // Get credentials from body
  const { email, password, username } = req.body;

  // Allow log in from email or username
  if ((!username && !email) || !password)
    throw new ApiError(400, 'Username/Email and Password is required');

  // Get waht field is provided and what is its value
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
    secure: true,
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

export { registerUser, generateAccessAndRefreshTokens, loginUser };
