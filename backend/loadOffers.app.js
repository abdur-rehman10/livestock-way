const express = require("express");
const bodyParser = require("body-parser");
const marketplaceRouter = require("./marketplace.routes");

const app = express();
app.use(bodyParser.json());

app.use("/api/v1", marketplaceRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`LivestockWay API running on http://localhost:${PORT}`);
});
