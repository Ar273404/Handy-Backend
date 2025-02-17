import express from "express";
import dotenv from "dotenv";
dotenv.config();
import cors from 'cors';
import connectDB from "./Database/connectdb.js";
import cookieParser from "cookie-parser";
import authRoutes from './routes/authRoute.js';
import locationRoutes from "./routes/locationRoute.js";
import jobRoutes from "./routes/jobRoutes.js";
import workerRoutes from './routes/workerRoutes.js'


const app = express();

app.use(express.json());
app.use(cors({
    credentials:true,
    origin: process.env.CLIENT_URL
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// routes
app.use("/api/auth", authRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/worker", workerRoutes);


const PORT = process.env.PORT || 8003;

// MongoDB Connection
connectDB();

app.get("/", (req, res) => {
  res.send("hello Welcome to Handy-Website");
});

app.listen(PORT, () => {
    console.log(`server is listening on port:${PORT}`);
})