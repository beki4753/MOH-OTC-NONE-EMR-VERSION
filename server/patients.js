const express = require("express");
const { poolPromise, sql } = require("./db");
const router = express.Router();

router.get("/search", async (req, res) => {
  const { query } = req.query;

  if (!query) return res.status(400).json({ error: "Missing query param" });

  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("query", sql.NVarChar, `"${query}*"`)
      .execute(`dbo.sp_getNameSuggestion`);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
});

module.exports = router;
