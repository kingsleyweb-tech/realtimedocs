import mongoose from "mongoose";


const connectDatabase = async () => {

  try {

    await mongoose.connect(
      "mongodb://localhost:27017/realtimeDocs"
    );


    console.log("MongoDB connected");

  } catch (error) {

    console.log("Database connection failed", error);

  }

};


export default connectDatabase;