import { body, oneOf } from 'express-validator';

const userRegisterValidator = () => {
  return [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Email is invalid'),
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required')
      .isLowercase()
      .withMessage('Username must be in lowercase')
      .isLength({ min: 3, max: 20 })
      .withMessage('Username must be 3 to 20 characters long'),
    body('password').notEmpty().withMessage('Passowrd is required'),
    body('fullName').optional().trim(),
  ];
};

const userLoginValidator = () => {
  return [
    oneOf([
      body('email').trim().isEmail().withMessage('Email is Invalid'),

      body('username')
        .trim()
        .isLength({ min: 3, max: 20 })
        .withMessage('Username is Invalid'),
    ]),
    body('password').notEmpty().withMessage('Password is required'),
  ];
};

export { userRegisterValidator, userLoginValidator };
