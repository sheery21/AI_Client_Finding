import { LeadsModel } from "../models/LeadModel.js";


export const createLead = async (req, res) => {
  try {
    const {
      businessName,
      website,
      email,
      phone,
      city,
      category,
      description,
      websiteScore,
      source,
    } = req.body;

    if (!businessName) {
      return res.status(400).json({
        success: false,
        message: "Business name is required",
      });
    }

    const lead = await LeadsModel.create({
      businessName,
      website,
      email,
      phone,
      city,
      category,
      description,
      websiteScore,
      source,
      createdBy: req.userId,
    });
    return res.status(201).json({
      success: true,
      message: "Lead created successfully",
      lead,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getLeads = async (req, res) => {
  try {
    const leads = await LeadsModel.find({
      createdBy: req.userId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: leads.length,
      leads,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getLeadById = async (req, res) => {
  try {
    const lead = await LeadsModel.findOne({
      _id: req.params.id,
      createdBy: req.userId,
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    return res.status(200).json({
      success: true,
      lead,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await LeadsModel.findOne({
      _id: id,
      createdBy: req.userId,
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    await LeadsModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Lead deleted successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};