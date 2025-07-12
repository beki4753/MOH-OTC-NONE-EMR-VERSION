const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const patientRoutes = require("./patients");

dotenv.config();
const app = express();
app.use(
  cors({
    origin: "*",
    methods: ["POST", "GET"],
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("<h1>Hello</h1>");
});
app.use("/api/patients", patientRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
