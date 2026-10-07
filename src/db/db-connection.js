import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Mongo DB connected SUCCESSFULLY');
  } catch (error) {
    console.error('Mongo DB connection error', error);
    process.exit(1);
  }
};

export default connectDB;
