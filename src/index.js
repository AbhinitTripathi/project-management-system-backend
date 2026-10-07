import app from './app.js';
import connectDB from './db/db-connection.js';
import dotenv from 'dotenv';
dotenv.config({
  path: './.env',
});

const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`App listening on PORT: ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Mongo Connection Error', err);
    process.exit(1);
  });
