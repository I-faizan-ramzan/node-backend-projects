const express = require("express");
const path = require("path");

const rootDir = require("../utill/path");

const router = express.Router();

const products = [];
// /admin/add-product=>GET

router.get("/add-product", (req, res, next) => {
  // console.log("In another middleware! product");
  //... sending response
  res.render("add-product", { pageTitle: "Products Add" });
});

// /admin/add-product=>POST

router.post("/add-product", (req, res, next) => {
  products.push({ title: req.body.title });
  res.redirect("/");
});

exports.routes = router;
exports.products = products;
