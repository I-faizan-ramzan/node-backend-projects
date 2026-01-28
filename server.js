const http = require("http");

// function rqListener(req, res) {}
// http.createServer(rqListener);
const server = http.createServer((req, res) => {
  console.log(req.url, req.method, req.headers);
  // process.exit();
  res.setHeader("content-type", "text/html");
  res.write("<html>");
  res.write("<head>");
  res.write("<title>My First Page");

  res.write("</title>");
  res.write("<body>");
  res.write("<h1>Hello from Node.js Server</h1>");
  res.write("<h1>Hello from Node.js Server</h1>");
  res.write("<h2>I am loving it</h2");

  res.write("</body>");
  res.write("</html>");
  res.end();
});

server.listen(3000);
