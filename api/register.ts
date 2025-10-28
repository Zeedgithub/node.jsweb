import express from "express";
import {conn} from "../dbconnect";
import { User } from "../model/user";

import mysql from "mysql2/promise";
import util from "util";
import { ResultSetHeader } from "mysql2";

export const router = express.Router();

// router.get('/',(req,res)=>{
//     res.send('Get in register.ts');
// });

router.post("/", async (req, res) => {
  try {
    const user: User = req.body;
    console.log("📥 Register request:", user);

    const sql = `
      INSERT INTO user 
        (user_name, user_password, user_nick_name, user_email, user_wallet,user_role ) 
      VALUES (?, ?, ?, ?, 300,"customer")
    `;

    // ✅ ใส่ <ResultSetHeader> เพื่อให้ TS เข้าใจว่า query นี้คือ INSERT
    const [result] = await conn.query<ResultSetHeader>(sql, [
      user.user_name,
      user.user_password,
      user.user_nick_name,
      user.user_email,
    ]);

    res.status(201).json({
      affected_row: result.affectedRows,
      last_idx: result.insertId,
    });
  } catch (error) {
    console.error("❌ Register error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});