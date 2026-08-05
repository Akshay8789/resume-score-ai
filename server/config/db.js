const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Ai-Resume';
  
  const maskedURI = mongoURI.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)[^@]+(@)/, '$1****$2');
  console.log(`[Database] Attempting connection to MongoDB at: ${maskedURI}`);
  
  try {
    // Attempt Mongoose connection with a short timeout so it doesn't hang forever
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000, // 5 seconds selection timeout
    });
    
    isConnected = true;
    console.log('======================================================');
    console.log('✓ SUCCESS: Connected to MongoDB Database successfully!');
    console.log('======================================================');
    return true;
  } catch (error) {
    isConnected = false;
    console.error('======================================================');
    console.error('⚠ DATABASE CONNECTION WARNING:');
    console.error(`MongoDB connection failed: ${error.message}`);
    console.error('The application will launch in GRACEFUL FALLBACK MODE.');
    console.error('Data will be stored in-memory on the server.');
    console.error('To save data permanently, please start your local MongoDB service');
    console.error('or set a valid MONGODB_URI in a server .env file.');
    console.error('======================================================');
    return false;
  }
};

const getStatus = () => isConnected;

module.exports = {
  connectDB,
  getStatus
};
