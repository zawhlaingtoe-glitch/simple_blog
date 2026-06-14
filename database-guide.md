# Database Guide — CRUD Blog Simple Project

> **ဤ File သည် စတင်လေ့လာသူများအတွက် ရည်ရွယ်ပါသည်။**  
> မြန်မာလိုရှင်းပြထားပြီး English ဝေါဟာရများကိုလည်း ထည့်သွင်းထားပါသည်။

---

## Database ဆိုတာဘာလဲ? (What is a Database?)

**Database** ဆိုတာ **ဒေတာတွေကို စနစ်တကျသိမ်းတဲ့နေရာ** ဖြစ်ပါတယ်။

ဥပမာ — မှတ်ပုံတင်ထားတဲ့ User တွေ၊ ရေးထားတဲ့ Post တွေ၊ Comment တွေအားလုံးကို Database ထဲမှာသိမ်းပါတယ်။

ဒီ Project မှာသုံးထားတဲ့ Database ကတော့ **MySQL** ဖြစ်ပါတယ်။

---

## 1. Database Connection (Database နဲ့ချိတ်ဆက်ပုံ)

ကျွန်တော်တို့ App က Database ဆီကို သွားချင်ရင် **လိပ်စာ (Host)**, **Username**, **Password**, နဲ့ **Database Name** ဆိုတဲ့ အချက်လေး (၄) ချက် လိုပါတယ်။

ဒီ Project မှာ အဲ့ဒီအချက်တွေကို `.env` ဆိုတဲ့ file ထဲမှာသိမ်းထားပြီး `config/database.js` ကနေ ဖတ်သုံးပါတယ်။

```javascript
// config/database.js
const mysql = require("mysql2");
const pool = mysql.createPool({
    host: process.env.DB_HOST,      // Database ရှိတဲ့နေရာလိပ်စာ
    user: process.env.DB_USER,      // ဝင်ခွင့်ရှိတဲ့သူရဲ့နာမည်
    password: process.env.DB_PASS,  // ဝင်ခွင့်လက်မှတ် (စကားဝှက်)
    database: process.env.DB_NAME   // သုံးမယ့် Database အမည်
});
module.exports = pool.promise();
```

💡 **Connection Pool** ဆိုတဲ့ စနစ်သုံးထားပါတယ်။ ဆိုလိုတာက Database ဆီသွားတဲ့လမ်းကြောင်းတွေကို အဆင်သင့်ထားပေးတဲ့ ကားပါကင်လိုပါပဲ — တစ်ခါချိတ်ဆက်ဖို့ပြင်နေစရာမလိုတော့ဘူးပေါ့။

---

## 2. Tables (Database ထဲမှာ ဒေတာစုတဲ့ပုံစံ)

Database ထဲမှာ **Table** တွေနဲ့ ဒေတာတွေကို စုစည်းပါတယ်။ Table ဆိုတာ **Excel Spreadsheet** လို့မြင်လို့ရပါတယ် — **Column (ဒေါင်လိုက်)** နဲ့ **Row (အလျားလိုက်)** တွေပါတယ်။

ဒီ Project မှာ Table (၆) ခုရှိပါတယ်။

---

### 2.1 `users` Table — User တွေရဲ့အချက်အလက်တွေ

| Column (ခေါင်းစဉ်) | သိမ်းတဲ့ဒေတာ | ရှင်းပြချက် |
|--------|------|-------|
| `id` | နံပါတ် (အလိုအလျောက်တိုး) | User တစ်ယောက်ချင်းစီရဲ့ ID — auto-increment |
| `username` | စာသား | အကောင့်နာမည် |
| `email` | စာသား | အီးမေးလ်လိပ်စာ |
| `password` | စာသား (hash လုပ်ထား) | လျှို့ဝှက်စကားဝှက် (bcrypt နဲ့စာဝှက်ထား) |
| `profile_photo` | စာသား (သို့မဟုတ် NULL) | ကိုယ်ပိုင်ဓါတ်ပုံလမ်းကြောင်း |

```sql
-- USERS table ထဲမှာ row အသစ်ထည့်တဲ့အခါ
INSERT INTO users (username, email, password) 
VALUES ('zaw', 'zaw@email.com', 'hashed_password_123');

-- USERS table ထဲက ဒေတာတွေကိုဖတ်တဲ့အခါ
SELECT * FROM users WHERE email = 'zaw@email.com';
```

**ဥပမာ - Table ထဲမှာမြင်ရပုံ**

| id | username | email | password | profile_photo |
|----|----------|-------|----------|---------------|
| 1 | zaw | zaw@email.com | $2b$10$...hashed... | uploads/zaw.jpg |
| 2 | su | su@email.com | $2b$10$...hashed... | NULL |

---

### 2.2 `posts` Table — ရေးသားချက်တွေ (Blog Posts)

| Column | သိမ်းတဲ့ဒေတာ | ရှင်းပြချက် |
|--------|------|-------|
| `id` | နံပါတ် | Post တစ်ခုချင်းစီရဲ့ ID |
| `user_id` | နံပါတ် | ဘယ် User က ရေးထားလဲ (→ users.id) |
| `title` | စာသား | ခေါင်းစဉ် |
| `content` | စာသား (အရှည်ကြီး) | အကြောင်းအရာ |
| `photo` | စာသား (သို့မဟုတ် NULL) | Post အတွက်ဓါတ်ပုံ |
| `visibility` | `'public'` သို့မဟုတ် `'private'` | ဘယ်သူတွေမြင်ရမလဲ |
| `created_at` | ရက်စွဲ/အချိန် | ဘယ်အချိန်ကရေးထားလဲ |

```sql
-- Post အသစ်ထည့်မယ်
INSERT INTO posts (user_id, title, content, visibility) 
VALUES (1, 'မင်္ဂလာပါ', 'ဒါကကျွန်တော့်ရဲ့ပထမဆုံး Post ပါ', 'public');

-- Public Post တွေကိုရှာမယ်
SELECT * FROM posts WHERE visibility = 'public' ORDER BY created_at DESC;
```

---

### 2.3 `tags` & `post_tags` Tables — အမျိုးအစားခွဲခြားတဲ့စနစ်

**`tags` Table** — Tag အမျိုးအစားတွေ

| Column | ရှင်းပြချက် |
|--------|-------|
| `id` | Tag ID |
| `name` | Tag နာမည် (ဥပမာ - "JavaScript") |
| `slug` | URL-friendly နာမည် (ဥပမာ - "javascript") |

**`post_tags` Table** — Post နဲ့ Tag ကိုဆက်ပေးတဲ့တံတား

| Column | ရှင်းပြချက် |
|--------|-------|
| `post_id` | ဘယ် Post လဲ (→ posts.id) |
| `tag_id` | ဘယ် Tag လဲ (→ tags.id) |

> 💡 **Many-to-Many Relationship**: Post တစ်ခုမှာ Tag အများကြီးရှိနိုင်တယ်၊ Tag တစ်ခုက Post အများကြီးမှာပါနိုင်တယ်။ ဒါမျိုးကို **Many-to-Many** လို့ခေါ်ပြီး ကြားခံ Table (`post_tags`) လိုပါတယ်။

```
ဥပမာ:
  Post: "JavaScript သင်ခန်းစာ" 
    → Tags: ["Programming", "JavaScript", "Web"]
  
  Tag: "JavaScript" 
    → Posts: ["JavaScript သင်ခန်းစာ", "React မိတ်ဆက်", "Node.js အခြေခံ"]
```

---

### 2.4 Social Tables — Like, Comment, Share လုပ်တဲ့စနစ်

**`post_reactions`** — Like/Reaction တွေ

| Column | ရှင်းပြချက် |
|--------|-------|
| `post_id` | ဘယ် Post ကို Like လုပ်တာလဲ |
| `user_id` | ဘယ်သူက Like လုပ်တာလဲ |
| `reaction_type` | ဘာ Reaction လဲ (ဥပမာ - "like") |

> ⚠️ ဒီမှာ **UNIQUE constraint** ပါတယ် — User တစ်ယောက်က Post တစ်ခုကို တစ်ခါပဲ Like လုပ်နိုင်တယ် (ထပ်လုပ်ရင် error တက်မယ်)။

**`post_comments`** — Comment တွေ

| Column | ရှင်းပြချက် |
|--------|-------|
| `post_id` | ဘယ် Post အတွက်လဲ |
| `user_id` | ဘယ်သူက ရေးတာလဲ |
| `content` | Comment စာသား |
| `parent_id` | (NULL သို့မဟုတ် ID) — ဘယ် Comment ကို reply လုပ်တာလဲ |

> 💡 **Self-referencing**: `parent_id` က သူ့ Table ထဲက `id` ကိုပဲပြန်ညွှန်းတယ်။ ဒါက **threaded comment** (အဖေပြန်/အမေပြန် စကားပြောခန်း) လိုမျိုး လုပ်ဖို့သုံးတယ်။

**`post_shares`** — Share တွေ

| Column | ရှင်းပြချက် |
|--------|-------|
| `post_id` | ဘယ် Post ကို Share လုပ်တာလဲ |
| `user_id` | ဘယ်သူက Share လုပ်တာလဲ |

---

## 3. Entity Relationships (Table တွေချိတ်ဆက်ပုံ) — အရေးကြီးဆုံးအပိုင်း

```
users (၁) ───── (အများ) posts
  │                    │
  │                    ├── post_reactions  (Like)
  │                    ├── post_comments   (Comment)
  │                    └── post_shares     (Share)
  │
tags ─── post_tags ───┘  (Many-to-Many)
```

### ရှင်းရှင်းလင်းလင်းပြောရရင်:

| Relationship | ရှင်းပြချက် | Foreign Key |
|-------------|-------|-------------|
| **User → Posts** | User တစ်ယောက်မှာ Post အများကြီးရှိနိုင် | `posts.user_id` → `users.id` |
| **Post → Reactions** | Post တစ်ခုကို User အများကြီးက Like လုပ်နိုင် | `post_reactions.post_id` → `posts.id` |
| **Post → Comments** | Post တစ်ခုမှာ Comment အများကြီးရှိနိုင် | `post_comments.post_id` → `posts.id` |
| **Post → Shares** | Post တစ်ခုကို User အများကြီးက Share လုပ်နိုင် | `post_shares.post_id` → `posts.id` |
| **Post ↔ Tags** | Post တစ်ခုမှာ Tag အများကြီး, Tag တစ်ခုက Post အများကြီးမှာပါနိုင် | `post_tags` (ကြားခံ Table) |
| **Comment → Reply** | Comment တစ်ခုကို ပြန် Reply လုပ်နိုင် | `post_comments.parent_id` → `post_comments.id` |

---

## 4. Model Files တွေက ဘာလုပ်လဲ?

Model တစ်ခုချင်းစီက Database ကိုသွားပြီး **SQL Query** တွေပို့တဲ့ အလုပ်ကိုလုပ်ပါတယ်။

| Model File | တာဝန် |
|-----------|------|
| `models/userModel.js` | User အကောင့်အသစ်ဆောက်, Login လုပ်, Profile ပြင်ဆင် |
| `models/postModel.js` | Post အသစ်ရေး, ပြင်ဆင်, ဖျက်, ရှာဖွေ |
| `models/tagModel.js` | Tag အသစ်ဆောက်, Post နဲ့ချိတ်ဆက် |
| `models/socialModel.js` | Like, Comment, Share လုပ်ဆောင်ချက်တွေ |

### ဥပမာ Code လေးတွေကြည့်ရအောင်:

```javascript
// userModel.js — User အကောင့်သစ်ဆောက်မယ်
async createUser(username, email, hashedPassword) {
    const [result] = await db.query(
        "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
        [username, email, hashedPassword]
    );
    return result.insertId;  // အသစ်ရတဲ့ ID ကိုပြန်ပို့
}

// postModel.js — Post တွေကိုရှာမယ်
async getAllPosts() {
    const [rows] = await db.query(
        `SELECT p.*, u.username, u.profile_photo 
         FROM posts p 
         JOIN users u ON p.user_id = u.id 
         WHERE p.visibility = 'public' 
         ORDER BY p.created_at DESC`
    );
    return rows;  // Post တွေကို Array အနေနဲ့ပြန်ပို့
}
```

**ဒီမှာ `?` (Placeholder) တွေသုံးထားတာက SQL Injection ကိုကာကွယ်ဖို့ပါ** — User ဆီကလာတဲ့ Data ကို တိုက်ရိုက် SQL ထဲမထည့်ဘဲ လုံခြုံအောင်ထည့်တဲ့နည်းပါ။

---

## 5. အဓိက Database Concepts အကျဉ်းချုပ်

| Concept | ရှင်းပြချက် |
|--------|-------|
| **Database** | ဒေတာတွေကို စနစ်တကျသိမ်းတဲ့နေရာ |
| **MySQL** | ဒီ Project မှာသုံးထားတဲ့ Database အမျိုးအစား (Table တွေနဲ့စုစည်း) |
| **Connection Pool** | Database ဆီသွားတဲ့လမ်းကြောင်းတွေကို အဆင်သင့်ထားပေး |
| **Table** | Excel Sheet လိုပဲ Column နဲ့ Row တွေပါတဲ့ ဒေတာစုစည်းမှုပုံစံ |
| **Column** | ဒေါင်လိုက်အနေအထား — ဒေတာအမျိုးအစားတစ်ခု (ဥပမာ - username) |
| **Row** | အလျားလိုက်အနေအထား — ဒေတာတစ်စုအပြည့်အစုံ (ဥပမာ - User တစ်ယောက်) |
| **Primary Key (id)** | Row တစ်ခုချင်းစီကို သီးသန့်ခွဲခြားသိနိုင်တဲ့ ID |
| **Foreign Key (user_id)** | တခြား Table ကို ပြန်ညွှန်းတဲ့ Key (Relationship ဆက်ဖို့) |
| **JOIN** | Table နှစ်ခုကို Relationship အတိုင်းဆက်ပြီး ဒေတာတွေကိုတွဲယူတာ |
| **One-to-Many** | User(၁) → Post(အများ) — `user_id` ကိုသုံးပြီးဆက် |
| **Many-to-Many** | Post ↔ Tag — ကြားခံ Table (`post_tags`) လိုအပ် |
| **UNIQUE Constraint** | တူညီတဲ့ဒေတာကို ထပ်မထည့်နိုင်အောင်တားမြစ် |
| **Self-referencing** | Table တစ်ခုတည်းထဲမှာ ကိုယ့် ID ကိုယ်ပြန်ညွှန်း (Comment → Reply) |
| **SQL Injection** | User Input ကို တိုက်ရိုက် SQL ထဲမထည့်ဘဲ `?` placeholder သုံးပြီး လုံခြုံအောင်လုပ် |

---

## အခြေခံအားဖြင့် Database ဆိုတာ

သင့် App ရဲ့ **"အမှတ်တရဗဟို" (Memory Center)** ပါပဲ။ User တွေရဲ့အချက်အလက်၊ သူတို့ရေးတဲ့ Post တွေ၊ Like တွေ၊ Comment တွေအားလုံးကို ဒီနေရာမှာပဲသိမ်းပြီး လိုတဲ့အချိန်ပြန်ထုတ်သုံးပါတယ်။

ဤပုံစံအတိုင်း CRUD (Create, Read, Update, Delete) လုပ်ဆောင်ချက်အားလုံးကို Model Files တွေကနေ SQL Query တွေသုံးပြီး Database ကို ဆက်သွယ်အလုပ်လုပ်ပါတယ်။

---

> **Created for:** CRUD Blog Simple Project  
> **Language:** Myanmar (Burmese) & English  
> **Database:** MySQL via mysql2
