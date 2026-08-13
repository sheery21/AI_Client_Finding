import mongoose from "mongoose";

export const dbConnect = () => {
  const URI = process.env.MONGO_URI;

  mongoose
    .connect(URI)
    .then(() => console.log("mongoDB Connected!"))
    .catch((err) => console.log("mongoDB Error", err.message));
};
