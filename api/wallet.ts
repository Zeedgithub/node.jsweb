import express from "express";
import {conn} from "../dbconnect";
import { User } from "../model/user";

import mysql from "mysql2/promise";
import util from "util";
import { ResultSetHeader } from "mysql2";

export const router = express.Router();

router.post("/add", async (req,res)=>{
    try{
        const  { user_id, money } = req.body;
        if(!user_id){
            return res.json({ message: "ไม่มี user id "});
        }
    await conn.query(
       "UPDATE user SET user_wallet = user_wallet + ? WHERE user_id = ?",
      [money,user_id]
    );
    res.json({
      message: "เติมเงินสำเร็จ",
    });
    }catch(error){
        console.error("❌ Error in /castout:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
