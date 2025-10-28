import express from "express";
import { conn } from "../dbconnect";
import { User } from "../model/user";


import mysql from "mysql2/promise";
import util from "util";

export const queryAsync = util.promisify(conn.query).bind(conn);
export const router = express.Router();

router.get('/',(req,res)=>{
    res.send("Get in login.ts")
});

router.get("/users", async (req, res) => {
  try {
    const [rows] = await conn.query("SELECT * FROM `user` ");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

//หา id_user:
router.get("/user_id/:id",async(req,res)=>{
    try {
    const id = req.params.id;

    const [rows] = await conn.query("SELECT * FROM `user` WHERE user_id = ?", [id]);

    res.json(rows);
  } catch (error) {
    console.error("❌ Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier คือ email หรือ username

    const sql = `
      SELECT * FROM user 
      WHERE (user_email = ? OR user_name = ?) 
        AND user_password = ?
    `;

    const [rows] = await conn.query(sql, [identifier, identifier, password]);

    if ((rows as any[]).length > 0) {
      res.status(200).json((rows as any[])[0]); // ส่ง object เดียว
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});