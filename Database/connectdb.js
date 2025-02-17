import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const DATABASE_URL = process.env.DATABASE_URL;
        await mongoose.connect(DATABASE_URL);
        console.log("MongoDB connected successfully !!");
    } catch (error) {
        console.log("could not coonect to database", error);
    }
}

export default connectDB;