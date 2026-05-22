require("dotenv").config();

const express = require("express");
const { requestContext } = require("./auth");
const { corsMiddleware } = require("./http/cors");
const { errorHandler } = require("./http/error-handler");
const dispatchRoutes = require("./routes/dispatches");
const inventoryRoutes = require("./routes/inventory");
const jsonpRoutes = require("./routes/jsonp");
const masterDataRoutes = require("./routes/master-data");
const pageDataRoutes = require("./routes/page-data");
const receiptRoutes = require("./routes/receipts");
const reportRoutes = require("./routes/reports");
const settingsRoutes = require("./routes/settings");
const systemRoutes = require("./routes/system");
const userRoutes = require("./routes/users");

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(corsMiddleware);
app.use(requestContext);

app.use("/api", systemRoutes);
app.use("/api", pageDataRoutes);
app.use("/api", masterDataRoutes);
app.use("/api", reportRoutes);
app.use("/api/dispatches", dispatchRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/jsonp", jsonpRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/users", userRoutes);

app.use(errorHandler);

module.exports = app;
