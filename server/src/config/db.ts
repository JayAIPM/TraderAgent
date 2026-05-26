import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://admin:admin304%40pzj@localhost:27017/?authSource=admin';
const DB_NAME = 'todo-agent';

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log(`✅ MongoDB connected successfully to database: ${DB_NAME}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
  console.error('❌ MongoDB error:', error);
});
