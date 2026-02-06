const path = require("path");
const rootDir = require("../utill/path");
const express = require("express");
const adminData = require("./admin");

const router = express.Router();

router.get("/", (req, res, next) => {
  // console.log("In another midleware Express");
  const product = adminData.products;
  res.render("shop", { prods: product, docTitle: "Shop" });
});

module.exports = router;
