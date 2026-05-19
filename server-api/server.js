require("dotenv").config();

const app = require("./app");

const port = Number(process.env.API_PORT || process.env.PORT || 4175);

app.listen(port, "127.0.0.1", () => {
  console.log(`FET API running at http://127.0.0.1:${port}`);
});
