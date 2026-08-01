import mongoose from "mongoose";


const connectDatabase = async () => {

  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/realtimeDocs";

  try {

    await mongoose.connect(mongoUri);

    console.log("MongoDB connected");

  } catch (error) {

    console.log("Database connection failed", error);

  }

};


export default connectDatabase;