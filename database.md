# Database — Search Function

ဒီမှာတော့ **Search Function** က Database နဲ့ ဘယ်လိုအလုပ်လုပ်လဲဆိုတာကို ရှင်းပြထားပါတယ်။

---

## 1. Data Flow (ဒေတာစီးဆင်းပုံ)

```
User က "AI" လို့ရိုက်ရှာ 
    ↓
Search Form (GET /posts/search?q=AI)
    ↓
postRoute.js → postController.search()
    ↓
postModel.search("AI")  ← SQL Query ပို့တယ်
    ↓
MySQL Database (LIKE %AI%) 
    ↓
ရလဒ်တွေပြန်ပို့ → Controller → View (postlist.ejs)
```

---

## 2. သုံးထားတဲ့ Table — `posts`

Search က **posts** Table တစ်ခုတည်းကိုပဲ မေးခွန်းထုတ်ပါတယ်။

| Column | Type | Search နဲ့ဆိုင်ပုံ |
|--------|------|-------------------|
| `id` | INT | Result တွေကို စီစဉ်ဖို့ (`ORDER BY id DESC`) |
| `title` | VARCHAR(255) | **ဒီ Column ထဲမှာ ရှာတယ်** — `title LIKE %AI%` |
| `content` | TEXT | **ဒီ Column ထဲမှာလည်း ရှာတယ်** — `content LIKE %AI%` |
| `visibility` | ENUM('public','private') | Public post တွေကိုပဲ ရှာတယ် (ကိုယ်ပိုင် private ပါပြတယ်) |
| `user_id` | INT | ဘယ် User ရဲ့ Post လဲဆိုတာ စစ်ဖို့ |
| `created_at` | DATETIME | (သွယ်ဝိုက်ပြီး စီစဉ်ဖို့) |

JOIN လုပ်ထားတဲ့ Table — **users** (author နာမည်နဲ့ ဓာတ်ပုံပြဖို့):
```sql
LEFT JOIN USERS ON POSTS.user_id = USERS.id
```

---

## 3. SQL Query အသေးစိတ်

### 3.1 တကယ်အလုပ်လုပ်နေတဲ့ Query

```
ဥပမာ — User က "AI" လို့ရှာတယ်ဆိုပါစို့။
ဒါဆို MySQL ဆီကို ဒီ Query သွားတယ်။
```

**Logged-in User အတွက်:**
```sql
SELECT POSTS.*, username AS author, USERS.profile_photo AS author_photo,
       CASE
         WHEN POSTS.title LIKE '%AI%' THEN 3
         WHEN POSTS.content LIKE '%AI%' THEN 1
         ELSE 0
       END AS relevance
FROM POSTS
LEFT JOIN USERS ON POSTS.user_id = USERS.id
WHERE (POSTS.title LIKE '%AI%' OR POSTS.content LIKE '%AI%')
  AND (POSTS.visibility = 'public' OR POSTS.user_id = 1)
ORDER BY relevance DESC, POSTS.id DESC
LIMIT 6 OFFSET 0;
```

**Guest (အကောင့်မဝင်ရသေး) အတွက် — ခြားနားချက်:**
```sql
-- visibility စစ်တဲ့နေရာမှာ public ပဲပြ
AND POSTS.visibility = 'public'
```

### 3.2 Query ရဲ့အစိတ်အပိုင်းတွေ

| အပိုင်း | ရှင်းပြချက် |
|--------|-----------|
| `SELECT ...` | Post data အားလုံး + author နာမည်, ဓာတ်ပုံ |
| `CASE ... END AS relevance` | ရလဒ်တွေကို အဆင့်သတ်မှတ်တယ် |
| `LIKE '%AI%'` | **ဒါက အဓိကရှာတဲ့နည်း** — "AI" ပါတဲ့ title/content ကိုရှာ |
| `WHERE ... OR ...` | Title ထဲမှာပါဖြစ်ဖြစ်, Content ထဲမှာပါဖြစ်ဖြစ် တစ်ခုခုမှာပါရင် ပြ |
| `ORDER BY relevance DESC, POSTS.id DESC` | Title မှာကိုက်တဲ့ဟာ အရင်ပေါ်, ပြီးရင် အသစ်တွေအရင် |
| `LIMIT 6 OFFSET 0` | တစ်မျက်နှာကို ၆ ခုစီ, ဘယ် Page ပေါ်မူတည်ပြီး OFFSET တိုး |

### 3.3 `?` (Placeholder) တွေ — အစဉ်လိုက်

Controller က `searchQuery` ကို Model ကိုပို့တယ်။ Model က `%query%` ပုံစံပြောင်းပြီး MySQL ကိုပို့တယ်။

ဒီမှာ `?` တွေရဲ့ အစဉ်လိုက် (Logged-in):

```
params = ["%AI%", "%AI%", "%AI%", "%AI%", currentUserId, limit, offset]
            ↑         ↑         ↑         ↑
            title     content   title     content
            LIKE      LIKE      LIKE      LIKE
            (CASE)    (CASE)    (WHERE)   (WHERE)
```

ဒီလိုနေရာတွေမှာ `?` သုံးတာက **SQL Injection** ကိုကာကွယ်ဖို့ပါ — User Input ကို တိုက်ရိုက် SQL ထဲမထည့်ဘဲ MySQL driver က လုံခြုံအောင်ထည့်ပေးတယ်။

---

## 4. LIKE — Partial Matching (အဓိကအချက်)

### 4.1 LIKE ဆိုတာဘာလဲ?

`LIKE` က MySQL မှာ **စာသားတစ်စိတ်တစ်ပိုင်းရှာတဲ့ Operator** ပါ။

```sql
WHERE title LIKE '%AI%'
```

- `%` = ဘာစာသားမဆိုဖြစ်နိုင်တယ် (အလွတ်လည်းပါတယ်)
- `%AI%` = "AI" ရှေ့နောက်မှာ ဘာစာသားမဆိုပါလို့ရတယ်

### 4.2 ဘာတွေကိုက်လဲ (Matches)?

| title | `LIKE '%AI%'` | ဘာလို့? |
|-------|:---:|---------|
| "About AI" | ✅ | "AI" ပါလို့ |
| "Understanding AI" | ✅ | "AI" ပါလို့ |
| "AI for Beginners" | ✅ | "AI" ပါလို့ |
| "Python Basics" | ❌ | "AI" မပါလို့ |
| "MAIN" | ✅ | "AI" ဆိုတဲ့စာလုံး (MA**I**N မှာပါ) |
| "RAIN" | ✅ | "AI" ဆိုတဲ့စာလုံး (R**AI**N မှာပါ) |

### 4.3 သတိထားစရာ

`LIKE '%AI%'` က **စာလုံးတွဲ (substring)** ကိုပဲရှာတာမို့ "RAIN" (R**AI**N) လည်းပါတယ်။
ဒါပေမယ့် သာမာန် Blog Search အတွက်တော့ ဒါက အဆင်ပြေပါတယ် — ပိုပြီးတိတိကျကျဖြစ်ချင်ရင် `REGEXP` သုံးလို့ရတယ်။

### 4.4 ရှေ့က FULLTEXT နဲ့ ဘာကွာလဲ?

| | FULLTEXT (အရင်) | LIKE (အခု) |
|---|---|---|
| ရှာနည်း | Word-based (စကားလုံးအလိုက်) | Pattern-based (စာသားတွဲအလိုက်) |
| "AI" ရှာရင် "About AI" တွေ့လား | ❌ (min word length 3) | ✅ |
| "RAIN" → "AI" လို့မြင်လား | ❌ | ✅ (ဒါကြောင့် သတိထား) |
| မြန်နှုန်း | အလွန်မြန် (Index သုံးလို့) | နှေး (full table scan) |
| Index လိုလား | FULLTEXT Index လို | No index needed |

---

## 5. Relevance (အဆင့်သတ်မှတ်ခြင်း)

ရှာတွေ့တဲ့ Post တွေကို အဆင့်သတ်မှတ်ပြီးစီစဉ်တယ်။

```sql
CASE
  WHEN POSTS.title LIKE '%AI%' THEN 3
  WHEN POSTS.content LIKE '%AI%' THEN 1
  ELSE 0
END AS relevance
```

| ကိုက်တဲ့နေရာ | Score | ဘာလို့ |
|------------|:-----:|--------|
| Title မှာကိုက် | **3** | Title က ပိုအရေးကြီးတယ် — ခေါင်းစဉ်နဲ့ဆိုင်တာများတယ် |
| Content မှာကိုက် | **1** | Content ထဲမှာပါတာက သိပ်မဆိုင်လို့ |
| ဘာမှမကိုက် | 0 | (ရလဒ်ထဲမပါဘူး) |

ပြီးရင် `ORDER BY relevance DESC, POSTS.id DESC` — 
1. Title မှာကိုက်တဲ့ဟာ အရင်ပေါ်
2. ပြီးရင် Content မှာကိုက်တဲ့ဟာ
3. Score တူရင် အသစ်တွေအရင်

---

## 6. Controller & Model Code

### Controller (`controllers/postController.js`)
```
GET /posts/search?q=AI&page=1
    ↓
searchQuery = "AI"
    ↓
Post.searchCount("AI")  →  စုစုပေါင်းဘယ်နှစ်ခုရှိလဲ (pagination အတွက်)
Post.search("AI", 6, 0, userId)  →  ဒီ Page အတွက် 6 ခုယူ
    ↓
ပြန်လာတဲ့ Post တွေကို Tag, Social data တွေတွဲပေး
    ↓
postlist.ejs ကို render
```

### Model (`models/postModel.js`)
```javascript
static async search(query, limit, offset, currentUserId) {
    const searchTerm = `%${query}%`;  // "AI" → "%AI%"

    // Logged-in user အတွက် SQL
    sql = `SELECT POSTS.*, username AS author, ...,
              CASE WHEN POSTS.title LIKE ? THEN 3
                   WHEN POSTS.content LIKE ? THEN 1
                   ELSE 0 END AS relevance
           FROM POSTS
           LEFT JOIN USERS ON POSTS.user_id = USERS.id
           WHERE (POSTS.title LIKE ? OR POSTS.content LIKE ?)
             AND (POSTS.visibility = 'public' OR POSTS.user_id = ?)
           ORDER BY relevance DESC, POSTS.id DESC
           LIMIT ? OFFSET ?`;

    params = ["%AI%", "%AI%", "%AI%", "%AI%", userId, 6, 0];
    const [rows] = await db.query(sql, params);
    return rows;
}
```

---

## 7. Summary (အကျဉ်းချုပ်)

Search Function ရဲ့ Database ပိုင်းကို မှတ်မိအောင် ဒီလိုမှတ်ပါ။

```
"Search Query" → LIKE %query% → title, content ထဲရှာ
                                    ↓
                    Title မှာကိုက်ရင် Score 3
                    Content မှာကိုက်ရင် Score 1
                                    ↓
                    Score အရ → id အရ → Result ပြ
```

> **LIKE %query%** က စာလုံးတစ်စိတ်တစ်ပိုင်းနဲ့ရှာတဲ့နည်းပါ။ "AI" ရိုက်ရှာရင် "About AI", "Understanding AI", "AI Basics" အကုန်တွေ့မယ်။ Title မှာပါတဲ့ Post တွေက အပေါ်ဆုံးရောက်မယ်။
