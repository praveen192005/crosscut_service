const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.warn('MONGO_URI is not defined. Mongoose operation buffering disabled for instant fallback.');
      mongoose.set('bufferCommands', false);
      return false;
    }
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    console.log('Disabling Mongoose bufferCommands for instant fallback response.');
    mongoose.set('bufferCommands', false);
    return false;
  }
};

module.exports = connectDB;
