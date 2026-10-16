import { loginUser } from '../controllers/auth.controller.js';
import { registerUser } from '../controllers/auth.controller.js';
import { Router } from 'express';
import {
  userLoginValidator,
  userRegisterValidator,
} from '../validators/index.js';
import { validate } from '../middlewares/validator.middleware.js';

const router = Router();

router.route('/register').post(userRegisterValidator(), validate, registerUser);

router.route('/login').post(userLoginValidator(), validate, loginUser);

export default router;
