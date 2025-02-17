// server.js or routes/location.js
import express from "express";
import axios from 'axios';

const router = express.Router();

// Route to fetch location data
router.get("/get-location", async (req, res) => {
  const { latitude, longitude } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: "Latitude and longitude are required" });
  }

  try {
    // const response = await axios.get(
    //   `https://us1.locationiq.com/v1/reverse.php`,
    //   {
    //     params: {
    //       key: process.env.LOCATIONIQ_API_KEY,
    //       lat: latitude,
    //       lon: longitude,
    //       format: "json",
    //     },
    //   }
    // );

    const response = await axios.get( `https://us1.locationiq.com/v1/reverse.php?key=${process.env.LOCATIONIQ_API_KEY}&lat=${latitude}&lon=${longitude}&format=json`);

    // Send the location data back to the client
    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error fetching location data:", error);
    res.status(500).json({ error: "Failed to fetch location data" });
  }
});

export default router;
