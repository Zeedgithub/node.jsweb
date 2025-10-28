import express from "express";
import { router as login } from "./api/login";
import { router as register } from "./api/register";
import { router as lotto } from "./api/lotto";
import { router as prize } from "./api/prize";
import { router as wallet } from "./api/wallet";
import bodyParser from "body-parser";
import cors from "cors";
import * as os from "os"; // <-- แก้ตรงนี้

export const app = express();

app.use(bodyParser.text());
app.use(bodyParser.json());
app.use(
  cors({
    origin: "http://localhost:4200",
  })
);
app.use("/", login);
app.use("/register", register);
app.use("/lotto", lotto);
app.use("/prize", prize);
app.use("/wallet", wallet);

