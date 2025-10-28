import http from "http";
import { app } from "./app";

// ใช้ process.env.PORT ตาม Vercel แนะนำ
const port = process.env.PORT || 3000;

const server = http.createServer(app);

server.listen(port, () => {
  console.log(`Server is started on port ${port}`);
});