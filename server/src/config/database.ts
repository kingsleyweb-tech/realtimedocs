import mongoose from "mongoose";


const connectDatabase = async () => {

  const mongoUri = process.env.MONGO_URI || "mongodb+srv://kingsleyanaab99_db_user:KH8WF0INlGK2fQEz@cluster0.5fx3wbd.mongodb.net/?appName=Cluster0";

  try {

    await mongoose.connect(mongoUri);

    console.log("MongoDB connected");

  } catch (error) {

    console.log("Database connection failed", error);

  }

};


export default connectDatabase;