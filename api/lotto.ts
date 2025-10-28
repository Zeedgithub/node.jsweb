import express from "express";

import { conn } from "../dbconnect";
import { User } from "../model/user";
import mysql from "mysql2/promise";

import util from "util";



export const queryAsync = util.promisify(conn.query).bind(conn);
export const router = express.Router();


router.get('/',(req,res)=>{
    res.send("Get in lotto.ts")
});

router.get("/users", async (req, res) => {
  try {
    const [rows] = await conn.query("SELECT * FROM `users` ");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});
// ⭐️ แก้ไข POST /login ให้ส่ง user_id มาด้วย
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Please provide email and password" });
    }

    const [rows]: any = await conn.query(
      "SELECT * FROM users WHERE email = ? AND password = ?",
      [email, password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // ⭐️⭐️ แก้ตรงนี้: ส่งข้อมูลที่ครบถ้วน ⭐️⭐️
    const user = rows[0];
    res.json({
      message: "Login successful",
      user: {
        user_id: user.user_id,    // 👈 สำคัญมาก! ต้องส่ง user_id
        name: user.name,
        email: user.email,
        role: user.role            // 👈 ใช้ 'role' (ไม่ใช่ user_role)
      }
    });

  } catch (error) {
    console.error("❌ Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ⭐️ เพิ่ม Endpoint นี้เพื่อดึงเกมเดียว
router.get("/image/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows]: any = await conn.query(
      "SELECT * FROM `image` WHERE image_id = ?", 
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "ไม่พบเกมนี้" });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});
router.get("/image", async (req, res) => {
  try {
    const [rows] = await conn.query("SELECT * FROM `image` ");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

///code
router.get("/codes", async (req, res) => {
  try {
    const sql = "SELECT * FROM codes ORDER BY created_at DESC";

    // ⭐️ รันคำสั่ง SQL ที่คุณให้มา
    const [rows] = await conn.query(sql);

    // ⭐️ ส่งข้อมูลคูปองทั้งหมดกลับไป
    res.json(rows);

  } catch (error) {
    console.error("❌ Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
//สร้าง code
router.post("/codes", async (req, res) => {
  try {
    // 1. ดึงข้อมูลจาก req.body
    const { code, discount_type, discount_value, max_uses } = req.body;

    // 2. ตรวจสอบข้อมูลเบื้องต้น
    if (!code || !discount_type || discount_value == null || max_uses == null) {
      return res.status(400).json({ 
        error: "กรุณาส่งข้อมูล code, discount_type, discount_value, และ max_uses ให้ครบถ้วน" 
      });
    }

    // (แนะนำ) ตรวจสอบประเภทส่วนลด
    if (discount_type !== 'percent' && discount_type !== 'fixed') {
      return res.status(400).json({ error: "discount_type ต้องเป็น 'percent' หรือ 'fixed' เท่านั้น" });
    }

    // 3. เตรียมคำสั่ง SQL
    const sql = `
      INSERT INTO codes (code, discount_type, discount_value, max_uses)
      VALUES (?, ?, ?, ?);
    `;

    // 4. รันคำสั่ง SQL
    const [result]: any = await conn.query(sql, [
      code,
      discount_type,
      discount_value,
      max_uses
    ]);

    // 5. ส่ง response สำเร็จ (Status 201 = Created)
    res.status(201).json({
      message: "สร้างคูปองสำเร็จ!",
      code_id: result.insertId // ส่ง ID ของคูปองที่เพิ่งสร้างกลับไป
    });

  } catch (err: any) {
    // 6. ⭐️ จัดการ Error (สำคัญมาก: กรณี Code ซ้ำ)
    // (จากไฟล์ .sql ของคุณ ตาราง codes มี UNIQUE KEY ที่คอลัมน์ code)
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Code นี้ถูกใช้งานแล้ว" });
    }

    // Error อื่นๆ
    console.error("❌ Database error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
//update code 
router.put("/codes/:id", async (req, res) => {
  try {
    // 1. ดึง ID ของคูปองที่จะแก้ไข (จาก URL params)
    const { id } = req.params;

    // 2. ดึงข้อมูลใหม่ (จาก req.body)
    const { code, discount_type, discount_value, max_uses } = req.body;

    // 3. ตรวจสอบข้อมูลเบื้องต้น
    if (!code || !discount_type || discount_value == null || max_uses == null) {
      return res.status(400).json({ 
        error: "กรุณาส่งข้อมูล code, discount_type, discount_value, และ max_uses ให้ครบถ้วน" 
      });
    }

    // 4. เตรียมคำสั่ง SQL
    const sql = `
      UPDATE codes
      SET code = ?, discount_type = ?, discount_value = ?, max_uses = ?
      WHERE code_id = ?;
    `;

    // 5. รันคำสั่ง SQL (สังเกตว่า 'id' อยู่ตัวสุดท้าย)
    const [result]: any = await conn.query(sql, [
      code,
      discount_type,
      discount_value,
      max_uses,
      id // ⭐️ id จาก req.params
    ]);

    // 6. ⭐️ ตรวจสอบว่าอัปเดตสำเร็จหรือไม่
    if (result.affectedRows === 0) {
      // ถ้า affectedRows = 0 แปลว่าไม่พบคูปองที่มี ID นั้น
      return res.status(404).json({ error: "ไม่พบคูปอง ID นี้" });
    }

    // 7. ส่ง response สำเร็จ
    res.json({
      message: "อัปเดตคูปองสำเร็จ!",
      updated_id: id,
      data: req.body
    });

  } catch (err: any) {
    // 8. ⭐️ จัดการ Error (กรณีพยายามเปลี่ยน code ให้ซ้ำกับที่มีอยู่)
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Code นี้ถูกใช้งานแล้ว" });
    }

    // Error อื่นๆ
    console.error("❌ Database error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.delete("/codes/:id", async (req, res) => {
  try {
    // 1. ดึง ID ของคูปองที่จะลบ (จาก URL params)
    const { id } = req.params;

    // 2. เตรียมคำสั่ง SQL
    const sql = "DELETE FROM codes WHERE code_id = ?";

    // 3. รันคำสั่ง SQL
    const [result]: any = await conn.query(sql, [id]);

    // 4. ⭐️ ตรวจสอบว่าลบสำเร็จหรือไม่
    if (result.affectedRows === 0) {
      // ถ้า affectedRows = 0 แปลว่าไม่พบคูปองที่มี ID นั้น
      return res.status(404).json({ error: "ไม่พบคูปอง ID นี้" });
    }

    // 5. ส่ง response สำเร็จ
    res.json({
      message: "ลบคูปองสำเร็จ!",
      deleted_id: id
    });

  } catch (err: any) {
    // 6. ⭐️ จัดการ Error (เช่น กรณีที่ code_id ถูกอ้างอิงโดยตารางอื่น)
    // จาก .sql ของคุณ ตาราง 'code_usage' มี Foreign Key ไปยัง 'codes'
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({ 
        error: "ไม่สามารถลบคูปองนี้ได้ เนื่องจากมีผู้ใช้งานคูปองนี้ไปแล้ว" 
      });
    }

    // Error อื่นๆ
    console.error("❌ Database error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

router.post("/add_basket", async (req, res) => {
    const {user_id, image_id} = req.body;
    const sql = "INSERT INTO basket (user_id, image_id) VALUES (?, ?)";
    try{
        const [result]: any = await conn.query(sql, [user_id, image_id]);
        res.status(201).json({
            message: "เพิ่มสินค้าลงตะกร้าสำเร็จ",
            basket_id: result.insertId
        });
    }catch(err){
        console.error("❌ Database error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/basket/:user_id", async (req, res) => {
    const { user_id } = req.params;
    const sql = `
      SELECT b.*,i.* FROM basket b
      JOIN image i ON b.image_id = i.image_id
      WHERE b.user_id = ?`;
    try {
      const [rows] = await conn.query(sql, [user_id]);
      res.json(rows);
    } catch (err) {
      console.error("❌ Database error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
});

router.delete("/delete_basket/:b_id", async (req, res) => {
    const { b_id } = req.params;
    const sql = "DELETE FROM basket WHERE b_id = ?";
    try {
      const [result]: any = await conn.query(sql, [b_id]);
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "ไม่พบรายการในตะกร้าที่ต้องการลบ" });
      }
  
      res.json({
        message: "ลบรายการจากตะกร้าสำเร็จ",
        deleted_id: b_id
      });
    } catch (err) {
      console.error("❌ Database error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/buy_basket", async (req, res) => {
  const { user_id, code_id } = req.body; // ⭐️ รับ code_id มาด้วย

  const sqlSelect = `
    SELECT b.user_id, b.image_id
    FROM basket b
    WHERE b.user_id = ?`;
  
  const sqlInsert = `
    INSERT INTO order_basket (user_id, image_id, code_id)
    VALUES (?, ?, ?)`;
  
  const sqlClearBasket = `DELETE FROM basket WHERE user_id = ?`;

  // ⭐️ SQL สำหรับบันทึกการใช้คูปอง
  const sqlRecordUsage = `
    INSERT INTO code_usage (code_id, user_id)
    VALUES (?, ?)`;

  // ⭐️ SQL สำหรับเพิ่ม used_count
  const sqlUpdateCoupon = `
    UPDATE codes 
    SET used_count = used_count + 1 
    WHERE code_id = ?`;

  try {
    // 1️⃣ เลือกรายการในตะกร้า
    const [items]: any = await conn.query(sqlSelect, [user_id]);

    if (items.length === 0) {
      return res.status(400).json({ error: "ไม่มีรายการในตะกร้า" });
    }

    // 2️⃣ Insert แต่ละรายการลง order_basket
    for (const item of items) {
      await conn.query(sqlInsert, [
        item.user_id,
        item.image_id,
        code_id || null  // ⭐️ ถ้าไม่มี code_id ให้ใส่ null
      ]);
    }

    // 3️⃣ ⭐️ ถ้ามีการใช้คูปอง ให้บันทึกและอัปเดต
    if (code_id) {
      await conn.query(sqlRecordUsage, [code_id, user_id]);
      await conn.query(sqlUpdateCoupon, [code_id]);
    }

    // 4️⃣ ลบ basket ของ user หลังจากสั่งซื้อ
    await conn.query(sqlClearBasket, [user_id]);

    res.json({ 
      message: "สั่งซื้อสำเร็จ", 
      items_ordered: items.length,
      coupon_used: code_id ? true : false
    });

  } catch (err) {
    console.error("❌ Database error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});
// ⭐️ ตรวจสอบและใช้คูปอง
router.post("/apply-coupon", async (req, res) => {
  try {
    const { code, subtotal, user_id } = req.body;

    // 1. ตรวจสอบข้อมูลที่ส่งมา
    if (!code || !subtotal || !user_id) {
      return res.status(400).json({ error: "กรุณาส่งข้อมูล code, subtotal และ user_id ให้ครบถ้วน" });
    }

    // 2. หาคูปองในฐานข้อมูล
    const [coupons]: any = await conn.query(
      "SELECT * FROM codes WHERE code = ?",
      [code.toUpperCase()]
    );

    if (coupons.length === 0) {
      return res.status(404).json({ error: "ไม่พบคูปองนี้ในระบบ" });
    }

    const coupon = coupons[0];

    // 3. ตรวจสอบว่าคูปองยังใช้ได้หรือไม่
    if (coupon.used_count >= coupon.max_uses) {
      return res.status(400).json({ error: "คูปองนี้ถูกใช้หมดแล้ว" });
    }

    // 4. ⭐️ ตรวจสอบว่า user คนนี้เคยใช้คูปองนี้หรือยัง (Optional)
    const [usageCheck]: any = await conn.query(
      "SELECT * FROM code_usage WHERE code_id = ? AND user_id = ?",
      [coupon.code_id, user_id]
    );

    if (usageCheck.length > 0) {
      return res.status(400).json({ error: "คุณเคยใช้คูปองนี้ไปแล้ว" });
    }

    // 5. คำนวณส่วนลด
    let discount = 0;
    if (coupon.discount_type === 'percent') {
      discount = (subtotal * coupon.discount_value) / 100;
    } else if (coupon.discount_type === 'fixed') {
      discount = coupon.discount_value;
    }

    // ⭐️ ห้ามลดเกินราคาสินค้า
    if (discount > subtotal) {
      discount = subtotal;
    }

    // 6. ส่งข้อมูลส่วนลดกลับไป
    res.json({
      message: "✅ ใช้คูปองสำเร็จ!",
      code_id: coupon.code_id,
      discount: discount,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value
    });

  } catch (error) {
    console.error("❌ Error applying coupon:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});



// --------------------
// ✅ 4️⃣ สมัครสมาชิก (Register)
// --------------------
router.post("/register", async (req, res) => {
  try {
    // 1. รับข้อมูล 3 อย่าง (❗️ ห้ามรับ role จาก req.body)
    const { name, email, password } = req.body;

    // 2. ตรวจสอบข้อมูลเบื้องต้น
    if (!name || !email || !password) {
      return res.status(400).json({ error: "กรุณากรอก name, email และ password ให้ครบ" });
    }

    // 3. 🛡️ เข้ารหัสรหัสผ่าน (สำคัญมาก)
  

    // 4. ⭐️ SQL ที่ถูกต้อง: hard-code 'user'
    //    (หรือ 'customer' ถ้าคุณใช้คำนั้นในระบบ)
    const sql = "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'user')";

    // 5. Insert ลง DB
    const [result]: any = await conn.query(sql, [
      name,
      email,
      password // ⭐️ ใช้รหัสที่เข้ารหัสแล้ว
    ]);

    // 6. ส่ง response สำเร็จ
    res.status(201).json({
      message: "สมัครสมาชิกสำเร็จ",
      userId: result.insertId // ส่ง ID ของ user ใหม่กลับไป
    });

  } catch (err: any) {
    // ❗️ จัดการ Error (สำคัญมาก: อีเมลซ้ำ)
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "อีเมลนี้ถูกใช้งานแล้ว" });
    }

    // Error อื่นๆ
    console.error("❌ Database error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});




























// --------------------
// ฟังก์ชันสุ่มเลข 6 หลัก (string)
// --------------------
function randomLottoNumber(): string {
  const num = Math.floor(Math.random() * 1000000); // 0 - 999999
  return num.toString().padStart(6, '0');          // เติมเลข 0 ด้านหน้าให้ครบ 6 หลัก
}

// --------------------
// 1️⃣ สร้างล็อตเตอรี่
// --------------------
router.post("/generate", async (req, res) => {
  const count = parseInt(req.body.count, 10); // ดึงจำนวนล็อตเตอรี่จาก body และแปลงเป็น number

  if (!count || count <= 0) {                 // ตรวจสอบจำนวนถูกต้อง
    return res.status(400).json({ error: "กรุณาระบุจำนวนที่ถูกต้อง" });
  }

  const created: string[] = [];               // เก็บเลขล็อตเตอรี่ที่สร้างสำเร็จ
  let attempts = 0;                            // นับจำนวนครั้งสุ่ม เพื่อป้องกัน loop ไม่จบ

  try {
    while (created.length < count && attempts < 10000) { // สุ่มจนกว่าจะครบ count หรือเกิน 10000 ครั้ง
      const lottoNumber = randomLottoNumber();           // สุ่มเลขใหม่ 6 หลัก

      try {
        // insert ลง DB เป็น string
        const [result]: any = await conn.query(
          "INSERT INTO lotto (number, price, status, user_id) VALUES (?, 100, 'unsold', NULL)",
          [lottoNumber]
        );

        if (result.affectedRows > 0) {
          created.push(lottoNumber); // insert สำเร็จ → เก็บเลข
        }
      } catch (err: any) {
        // ถ้าเลขซ้ำ (duplicate) → ข้ามไปสุ่มใหม่
        if (err.code !== "ER_DUP_ENTRY") {
          console.error("❌ Database error:", err);
          return res.status(500).json({ error: "Database error" });
        }
      }

      attempts++; // เพิ่มตัวนับ
    }

    if (created.length < count) { // ถ้าไม่สามารถสร้างครบตามที่ขอ
      return res.status(409).json({ error: "สุ่มหมายเลขไม่ครบตามที่ขอ" });
    }

    // ส่งเลขล็อตเตอรี่ที่สร้างสำเร็จกลับไป
    res.json({ lotto: created });
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --------------------
// 2️⃣ ซื้อล็อตเตอรี่
// --------------------
router.post("/buy", async (req, res) => {
  try {
    const { user_id, lotto_id } = req.body;


    if (!user_id || !lotto_id) {
      return res.status(400).json({ error: "Missing user_id or lotto_id" });
    }


    // 1. ตรวจสอบยอดเงินปัจจุบันของ user
    const [users]: any = await conn.query(
      "SELECT user_wallet FROM user WHERE user_id = ?",
      [user_id]
    );


    if (users.length === 0) {
      return res.status(404).json({ error: "ไม่พบ user" });
    }


    const currentWallet = users[0].user_wallet;


    // 2. เช็คว่าเงินพอหรือไม่
    if (currentWallet < 100) {
      return res.json({ message: "ยอดเงินไม่เพียงพอในการซื้อสลาก", user_wallet: currentWallet });
    }


    // 3. อัปเดตหักเงิน 100 บาท
    await conn.query(
      "UPDATE user SET user_wallet = user_wallet - 100 WHERE user_id = ?",
      [user_id]
    );


    // 4. อัปเดตสถานะสลากจาก unsold → sold (และกำหนด user_id)
    const [result]: any = await conn.query(
      "UPDATE lotto SET user_id = ?, status = 'sold' WHERE lotto_id = ? AND status = 'unsold'",
      [user_id, lotto_id]
    );


    // เช็คว่า update สลากสำเร็จไหม
    if (result.affectedRows === 0) {
      return res.json({ message: "สลากนี้ถูกขายไปแล้ว" });
    }


    // 5. ส่ง response กลับ
    res.json({
      message: "ซื้อสลากสำเร็จ",
      user_wallet: currentWallet - 100
    });


  } catch (error) {
    console.error("❌ Error in /buy:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// --------------------
// 3️⃣ ดูล็อตเตอรี่ที่ยังไม่ขาย
// --------------------
router.get("/unsold", async (req, res) => {
  try {
    const [rows] = await conn.query(
      "SELECT * FROM lotto WHERE status = 'unsold'"
    );
    res.json(rows);
  } catch (error) {
    console.error("❌ Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --------------------
// 3️⃣ ดูล็อตเตอรี่ที่ขายแล้ว
// --------------------
router.get("/sold", async (req, res) => {
  try {
    const [rows] = await conn.query(
      "SELECT * FROM lotto WHERE status = 'sold'"
    );
    res.json(rows);
  } catch (error) {
    console.error("❌ Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --------------------
// ลบล็อตเตอรี่ทั้งหมด + รางวัลทั้งหมด + prize + user (customer)
// --------------------
router.delete("/delete_all", async (req, res) => {
  try {
    // 1️⃣ ลบ child ก่อน (lotto_wins_prize)
    await conn.query("DELETE FROM lotto_wins_prize");

    // 2️⃣ ลบ parent (lotto)
    await conn.query("DELETE FROM lotto");

    // 3️⃣ รีเซ็ต AUTO_INCREMENT ของ lotto และ lotto_wins_prize
    await conn.query("ALTER TABLE lotto AUTO_INCREMENT = 1");
    await conn.query("ALTER TABLE lotto_wins_prize AUTO_INCREMENT = 1");

    // 4️⃣ ลบ prize ทั้งหมด
    await conn.query("DELETE FROM prize");
    await conn.query("ALTER TABLE prize AUTO_INCREMENT = 1");

    // 5️⃣ ลบ user ทั้งหมดที่เป็น customer
    await conn.query("DELETE FROM user WHERE user_role = 'customer'");
    await conn.query("ALTER TABLE user AUTO_INCREMENT = 1");

    res.json({ message: "ลบล็อตเตอรี่, รางวัล, prize และผู้ใช้ customer ทั้งหมดเรียบร้อยแล้ว" });
  } catch (error) {
    console.error("❌ Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//ค้นหา lotto ด้วยเลข
router.post("/search", async (req, res) => {
  try {
    const { number } = req.body; // ✅ รับค่าหมายเลขจาก body


    if (!number) {
      return res.status(400).json({ error: "Missing lotto number" });
    }


    // ✅ Query หาลอตเตอรี่ที่มีเลขบางส่วนตรงกับที่ส่งมา
    const [rows]: any = await conn.query(
      "SELECT * FROM lotto WHERE CAST(number AS CHAR) LIKE ?",
      [`%${number}%`]   // ตรงนี้แทน '%71%'
    );


    if (rows.length === 0) {
      return res.status(404).json({ error: "Lotto number not found" });
    }


    res.json(rows); // ถ้า unique จะได้ 1 record, ถ้าไม่ unique ได้ทั้งหมด
  } catch (error) {
    console.error("❌ Error searching lotto:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/user", async (req,res)=>{
    try{
        const { user_id } = req.body;
        const [rows] = await conn.query("SELECT * FROM `lotto` WHERE user_id = ?"
            ,[user_id]
        )
        res.json(rows);
    }catch(error){
        console.error("❌ Database error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


