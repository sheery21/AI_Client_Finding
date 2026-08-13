import { searchBusinesses } from "../services/overpass.service.js";

export const searchBusinessesController = async (req, res) => {
  try {
    const { city, category } = req.body;

    if (!city || !category) {
      return res.status(400).json({
        success: false,
        message: "City and category are required",
      });
    }

    const businessWebsites = await searchBusinesses(city, category);

    // Hamesha success return karein taake user interface disconnect na ho
    return res.status(200).json({
      success: true,
      count: businessWebsites ? businessWebsites.length : 0,
      results: businessWebsites || []
    });

  } catch (error) {
    console.error("Controller Execution Error:", error.message);
    return res.status(200).json({
      success: true,
      count: 0,
      results: []
    });
  }
};
