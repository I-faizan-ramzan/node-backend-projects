const http = require("http");
const fs = require("fs");
// function rqListener(req, res) {}
// http.createServer(rqListener);
const server = http.createServer((req, res) => {
  // console.log(req.url, req.method, req.headers);
  const url = req.url;
  const method = req.method;
  if (url === "/") {
    res.write("<html>");
    res.write("<head><title>Enter Message</title></head>");
    res.write("<body>");
    res.write(
      '<form action="/message" method="POST"><input type="text" name="message"><button type="submit" >sent</button></form>',
    );
    res.write("</body>");
    res.write("</html>");
    return res.end();
  }
  if (url === "/message" && method === "POST") {
    const body = [];
    req.on("data", (chunk) => {
      console.log(chunk);
      body.push(chunk);
    });
    req.on("end", () => {
      const parseBody = Buffer.concat(body).toString();
      const message = parseBody.split("=")[1];
      console.log(parseBody);
      console.log(message);
      fs.writeFile("Message.txt", message, (err) => {
        res.statusCode = 302;
        res.setHeader("Location", "/");
        return res.end();
      });
    });
  }

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
