import express from "express";
import axios from "axios";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const router = express.Router();

// Route to fetch location data
router.get("/get-location", async (req, res) => {
  const { latitude, longitude } = req.query;

  // Validate request parameters
  if (!latitude || !longitude) {
    return res
      .status(400)
      .json({ error: "Latitude and longitude are required" });
  }

  try {
    // Make request to LocationIQ API
    const response = await axios.get(
      `https://us1.locationiq.com/v1/reverse.php`,
      {
        params: {
          key: process.env.LOCATIONIQ_API_KEY, // Secure API Key
          lat: latitude,
          lon: longitude,
          format: "json",
        },
      }
    );

    // Send the location data back to the client
    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error fetching location data:", error);

    // Proper error handling for different cases
    if (error.response) {
      // API responded with an error
      return res
        .status(error.response.status)
        .json({ error: error.response.data.error || "Location API error" });
    } else if (error.request) {
      // No response from API
      return res
        .status(500)
        .json({ error: "No response from location service" });
    } else {
      // Unexpected error
      return res.status(500).json({ error: "Unexpected server error" });
    }
  }
});

export default router;
