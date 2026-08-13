import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    websiteScore: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["new", "contacted", "interested", "converted", "rejected"],
      default: "new",
    },
    source: {
      type: String,
      default: "manual",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

export const LeadsModel = mongoose.model("Lead", leadSchema);
