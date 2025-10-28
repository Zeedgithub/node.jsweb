import express from "express";
import { conn } from "../dbconnect";
import { User } from "../model/user";
import mysql from "mysql2/promise";
import util from "util";

export const queryAsync = util.promisify(conn.query).bind(conn);
export const router = express.Router();

// ออกรางวัล ทั้งหมด
router.post("/all", async (req, res) => {
  try {
    const { prize, amount } = req.body;

    if (typeof prize !== "number" || prize < 1 || prize > 5)
      return res.status(400).json({ error: "prize ต้องเป็นเลข 1-5" });

    if (typeof amount !== "number" || amount <= 0)
      return res.status(400).json({ error: "amount ต้องเป็นจำนวนบวก" });

    // ✅ ตรวจสอบว่ารางวัลนี้ถูกสุ่มแล้วหรือยัง
    const [existing]: any = await conn.query(
      "SELECT * FROM prize WHERE prize_name = ?",
      [prize]
    );

    if (existing.length > 0) {
      return res
        .status(400)
        .json({ error: "รางวัลนี้ถูกสุ่มไปแล้ว ไม่สามารถสุ่มซ้ำได้" });
    }

    // 1️⃣ สุ่มล็อตเตอรี่ทั้งหมด
    const [allLottos]: any = await conn.query(
      "SELECT lotto_id FROM lotto ORDER BY RAND() LIMIT 1"
    );

    if (!allLottos || allLottos.length === 0)
      return res.status(400).json({ error: "ไม่มีล็อตเตอรี่" });

    const winner = allLottos[0];

    // 2️⃣ บันทึกรางวัลลง table prize
    const [prizeResult]: any = await conn.query(
      "INSERT INTO prize (prize_name, prize_amount) VALUES (?, ?)",
      [prize, amount]
    );

    const prize_id = prizeResult.insertId;

    // 3️⃣ บันทึกลง lotto_wins_prize
    await conn.query(
      "INSERT INTO lotto_wins_prize (lotto_id, prize_id) VALUES (?, ?)",
      [winner.lotto_id, prize_id]
    );

    // ✅ ดึงเลขล็อตเตอรี่มาโชว์แทน lotto_id
    const [lottoRow]: any = await conn.query(
      "SELECT number FROM lotto WHERE lotto_id = ?",
      [winner.lotto_id]
    );

    const lotto_number = lottoRow.length > 0 ? lottoRow[0].number : null;

    res.json({
      message: "สุ่มรางวัลจากล็อตเตอรี่ทั้งหมดสำเร็จ",
      winner_lotto: lotto_number,
      prize,
      amount,
    });
  } catch (error) {
    console.error("❌ Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ออกรางวัลเฉพาะที่ขายแล้ว (user_id IS NOT NULL)
router.post("/sold", async (req, res) => {
  try {
    const { prize, amount } = req.body;

    if (typeof prize !== "number" || prize < 1 || prize > 5)
      return res.status(400).json({ error: "prize ต้องเป็นเลข 1-5" });

    if (typeof amount !== "number" || amount <= 0)
      return res.status(400).json({ error: "amount ต้องเป็นจำนวนบวก" });

    // ✅ ตรวจสอบว่ารางวัลนี้ถูกสุ่มแล้วหรือยัง
    const [existing]: any = await conn.query(
      "SELECT * FROM prize WHERE prize_name = ?",
      [prize]
    );

    if (existing.length > 0) {
      return res
        .status(400)
        .json({ error: "รางวัลนี้ถูกสุ่มไปแล้ว ไม่สามารถสุ่มซ้ำได้" });
    }

    // 1️⃣ สุ่มเฉพาะล็อตเตอรี่ที่ขายแล้ว
    const [allLottos]: any = await conn.query(
      "SELECT lotto_id FROM lotto WHERE user_id IS NOT NULL ORDER BY RAND() LIMIT 1"
    );

    if (!allLottos || allLottos.length === 0)
      return res.status(400).json({ error: "ไม่มีล็อตเตอรี่ที่ขายแล้ว" });

    const winner = allLottos[0];

    // 2️⃣ บันทึกรางวัลลง table prize
    const [prizeResult]: any = await conn.query(
      "INSERT INTO prize (prize_name, prize_amount) VALUES (?, ?)",
      [prize, amount]
    );

    const prize_id = prizeResult.insertId;

    // 3️⃣ บันทึกลง lotto_wins_prize
    await conn.query(
      "INSERT INTO lotto_wins_prize (lotto_id, prize_id) VALUES (?, ?)",
      [winner.lotto_id, prize_id]
    );

    // ✅ ดึงเลขล็อตเตอรี่มาโชว์แทน lotto_id
    const [lottoRow]: any = await conn.query(
      "SELECT number FROM lotto WHERE lotto_id = ?",
      [winner.lotto_id]
    );

    const lotto_number = lottoRow.length > 0 ? lottoRow[0].number : null;

    res.json({
      message: "สุ่มรางวัลจากล็อตเตอรี่ที่ขายแล้วสำเร็จ",
      winner_lotto: lotto_number,
      prize,
      amount,
    });
  } catch (error) {
    console.error("❌ Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:name", async (req, res) => {
  try {
    const prize = req.params.name;

    const [rows] = await conn.query(
      "SELECT * FROM `prize` WHERE prize_name = ?",
      [prize]
    );
    res.json(rows);
  } catch (error) {
    console.error("❌ Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const [rows] = await conn.query(`
      SELECT 
        p.prize_id,
        p.prize_name,
        p.prize_amount,
        l.number
      FROM prize p
      LEFT JOIN lotto_wins_prize wp ON p.prize_id = wp.prize_id
      LEFT JOIN lotto l ON wp.lotto_id = l.lotto_id
      ORDER BY p.prize_name ASC;
    `);

    res.json(rows);
  } catch (error) {
    console.error("❌ Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//ตรวจสอบ และขึ้นเงินรางวัล
router.post("/castout", async (req, res) => {
  try {
    const { user_id, lotto_id } = req.body;

    if (!user_id || !lotto_id) {
      return res.status(400).json({ error: "Missing user_id or lotto_id" });
    }

    // ดึงรางวัลทั้งหมดที่ lotto_id นี้ถูกรางวัล
    const [prizes]: any = await conn.query(
      `SELECT prize.prize_id, prize.prize_name, prize.prize_amount 
       FROM lotto_wins_prize 
       JOIN prize ON lotto_wins_prize.prize_id = prize.prize_id 
       WHERE lotto_wins_prize.lotto_id = ?;`,
      [lotto_id]
    );

    if (prizes.length === 0) {
      // ไม่ถูกรางวัล → แต่เราจะลบเลข lotto ออกด้วย
      await conn.query("DELETE FROM lotto WHERE lotto_id = ?", [lotto_id]);
      return res.json({ message: "เสียใจด้วย คุณไม่ถูกรางวัล", totalPrize: 0, prizes: [] });
    }

    // รวมยอดเงินรางวัลทั้งหมด
    const totalPrize = prizes.reduce((sum: number, p: any) => sum + p.prize_amount, 0);

    // เพิ่มเงินรางวัลให้ user
    await conn.query(
      "UPDATE user SET user_wallet = user_wallet + ? WHERE user_id = ?",
      [totalPrize, user_id]
    );

    // ลบแถว lotto_wins_prize ของเลขนี้ทั้งหมด
    await conn.query("DELETE FROM lotto_wins_prize WHERE lotto_id = ?", [lotto_id]);

    // ลบเลขล็อตเตอรี่ออกจากตาราง lotto ด้วย
    await conn.query("DELETE FROM lotto WHERE lotto_id = ?", [lotto_id]);

    // สร้างข้อความรายละเอียดรางวัล เช่น "ถูกรางวัลที่ 1 (1500 บาท), ถูกรางวัลที่ 4 (600 บาท)"
    const prizeMessage = prizes
      .map((p: any) => `ถูกรางวัลที่ ${p.prize_name} (${p.prize_amount} บาท)`)
      .join(", ");

    res.json({
      message: "ยินดีด้วย! คุณถูกรางวัล!!",
      totalPrize,
      prizes,       // รายละเอียดแต่ละรางวัล
      prizeMessage, // ข้อความแจ้งผู้ใช้
    });

  } catch (error) {
    console.error("❌ Error in /castout:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});