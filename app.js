const express = require("express");

const app = express();
app.use("/", (req, res, next) => {
  console.log("this always runs");
  //... sending response
  next();
});
app.use("/add-product", (req, res, next) => {
  console.log("In another middleware! product");
  //... sending response
  res.send("<h1>The Add Product page</h1>");
});
app.use("/", (req, res, next) => {
  console.log("In another midleware Express");
  res.send("<h1>Hello from Express</h1>");
});

// const server = http.createServer(app);
app.listen(3000);
// server.listen(3000, () => {
//   // console.log("Server running on http://localhost:3000");
// });
