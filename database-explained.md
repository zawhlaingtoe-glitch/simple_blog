# Database Explained — blog-simple Project
# ဒီ Blog Project ရဲ့ Database ကို ရှင်းပြခြင်း (Myanmar & English)

---

## 1. Database Type  /  Database အမျိုးအစား

| | Myanmar | English |
|---|---------|---------|
| **DBMS** | MySQL | MySQL |
| **Connection** | `mysql2` package (Node.js) | `mysql2` npm package with Promise-based pool |
| **Database Name** | `blog_db` | `blog_db` |
| **Host** | `localhost` | `localhost` |

### Connection Config (`config/database.js`)

```javascript
const mysql = require("mysql2");
const pool = mysql.createPool({
    host: process.env.DB_HOST,      // localhost
    user: process.env.DB_USER,      // root
    password: process.env.DB_PASS,  // password
    database: process.env.DB_NAME   // blog_db
});
module.exports = pool.promise();    // Promise-based (async/await support)
```

> **English:** Uses a connection pool so multiple queries can run efficiently without opening/closing connections each time.
>
> **Myanmar:** Connection Pool သုံးထားတာကြောင့် query တိုင်းအတွက် connection ဖွင့်/ပိတ်စရာ မလိုဘဲ ထိရောက်စွာအလုပ်လုပ်ပါတယ်။

---

## 2. All Tables Overview / ဇယားအားလုံး အကျဉ်းချုပ်

| Table Name | Myanmar ရှင်းပြချက် | English Description |
|------------|----------------------|---------------------|
| **USERS** | အသုံးပြုသူများ ထိန်းသိမ်းရန် | Stores user accounts |
| **POSTS** | Blog Post များ ထိန်းသိမ်းရန် | Stores blog posts |
| **tags** | Post များကို Category ခွဲခြားရန် | Tags/categories for posts |
| **post_tags** | Post နှင့် Tag ဆက်စပ်မှု (Many-to-Many) | Links posts to tags |
| **post_reactions** | Like/Reaction များ | Post likes/reactions |
| **post_comments** | Comment များ (Reply support ပါဝင်) | Post comments with replies |
| **post_shares** | Post မျှဝေမှုများ | Post shares |

---

## 3. Table Schemas အသေးစိတ် / Detailed Table Schemas

### 3.1 USERS Table

```sql
CREATE TABLE USERS (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    username       VARCHAR(255) NOT NULL,
    email          VARCHAR(255) NOT NULL UNIQUE,
    password       VARCHAR(255) NOT NULL,    -- bcrypt hashed
    profile_photo  VARCHAR(255) NULL          -- added later via ALTER TABLE
);
```

| Column | Myanmar | English |
|--------|---------|---------|
| `id` | User တစ်ယောက်ချင်းစီရဲ့ Unique ID | Unique identifier for each user |
| `username` | အသုံးပြုသူအမည် | Display name of the user |
| `email` | Email လိပ်စာ (Unique) | Email address (unique) |
| `password` | Hashed လုပ်ထားတဲ့ password | Encrypted password (bcrypt) |
| `profile_photo` | Profile ဓာတ်ပုံ (Optional) | Profile picture (optional) |

### 3.2 POSTS Table

```sql
CREATE TABLE POSTS (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,                  -- Foreign Key → USERS.id
    title       VARCHAR(255) NOT NULL,
    content     TEXT NOT NULL,
    photo       VARCHAR(255) NULL,             -- Post image URL
    visibility  VARCHAR(20) NOT NULL DEFAULT 'public',  -- 'public' or 'private'
    created_at  DATETIME NOT NULL
);
```

| Column | Myanmar | English |
|--------|---------|---------|
| `id` | Post ID ထူးခြားအမှတ် | Unique post identifier |
| `user_id` | Post ရေးတဲ့ User ID | Author's user ID |
| `title` | Post ခေါင်းစဉ် | Post title |
| `content` | Post အကြောင်းအရာ | Post body/content |
| `photo` | Post ပါဝင်တဲ့ ဓာတ်ပုံ | Photo attached to post |
| `visibility` | `public` (အားလုံးမြင်) or `private` (ကိုယ်ပိုင်) | `public` (everyone) or `private` (owner only) |
| `created_at` | ဖန်တီးချိန် | Creation timestamp |

### 3.3 tags Table

```sql
CREATE TABLE tags (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(50) NOT NULL,
    slug       VARCHAR(50) NOT NULL UNIQUE,   -- URL-friendly name
    created_at DATETIME NOT NULL
);
```

### 3.4 post_tags Table (Junction Table)

```sql
CREATE TABLE post_tags (
    id      INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,                     -- Foreign Key → POSTS.id
    tag_id  INT NOT NULL,                     -- Foreign Key → tags.id
    UNIQUE KEY unique_post_tag (post_id, tag_id)  -- Same tag can't repeat on same post
);
```

> **English:** This is a Many-to-Many junction table. One post can have many tags, and one tag can belong to many posts.
>
> **Myanmar:** ဒါက Many-to-Many Junction Table ပါ။ Post တစ်ခုမှာ Tag အများအပြားပါလို့ရပြီး Tag တစ်ခုကိုလည်း Post အများအပြားမှာ သုံးလို့ရပါတယ်။

### 3.5 post_reactions Table

```sql
CREATE TABLE post_reactions (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    post_id        INT NOT NULL,              -- Foreign Key → POSTS.id
    user_id        INT NOT NULL,              -- Foreign Key → USERS.id
    reaction_type  VARCHAR(30) NOT NULL DEFAULT 'like',
    created_at     DATETIME NOT NULL,
    UNIQUE KEY unique_post_user_reaction (post_id, user_id)  -- 1 user = 1 reaction per post
);
```

### 3.6 post_comments Table

```sql
CREATE TABLE post_comments (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    post_id    INT NOT NULL,                  -- Foreign Key → POSTS.id
    user_id    INT NOT NULL,                  -- Foreign Key → USERS.id
    content    TEXT NOT NULL,
    parent_id  INT NULL,                      -- NULL = top-level comment, otherwise = reply to comment ID
    created_at DATETIME NOT NULL
);
```

> **English:** The `parent_id` column enables nested replies. If `parent_id` is NULL, it's a top-level comment. If it has a value, it's a reply to another comment.
>
> **Myanmar:** `parent_id` ကြောင့် Reply (တုံ့ပြန်ချက်) များကို Thread ပုံစံနဲ့ ရေးလို့ရပါတယ်။ `parent_id` = NULL ဆိုရင် Comment အသစ်၊ တန်ဖိုးရှိရင် အခြား Comment ကို Reply လုပ်တာပါ။

### 3.7 post_shares Table

```sql
CREATE TABLE post_shares (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    post_id    INT NOT NULL,                  -- Foreign Key → POSTS.id
    user_id    INT NOT NULL,                  -- Foreign Key → USERS.id
    created_at DATETIME NOT NULL,
    UNIQUE KEY unique_post_user_share (post_id, user_id)  -- 1 user = 1 share per post
);
```

---

## 4. Table Relationships / ဇယားများ ဆက်စပ်ပုံ

```
┌──────────┐       ┌──────────┐       ┌──────────┐
│  USERS   │ 1──M │  POSTS   │ M──M │   tags   │
│          │       │          │       │          │
│ id (PK)  │──────▶│ id (PK)  │◀─────│ id (PK)  │
│ username │       │ user_id  │       │ name     │
│ email    │       │ title    │       │ slug     │
│ password │       │ content  │       └──────────┘
│ profile_ │       │ visibility│            │
│  photo   │       │ created_ │            │ M
└──────────┘       │  at      │            ▼
      │            └────┬─────┘     ┌──────────┐
      │                 │           │ post_tags│
      │ 1               │ 1         │ id (PK)  │
      ▼                 ▼           │ post_id  │
┌──────────────┐ ┌───────────────┐  │ tag_id   │
│post_reactions│ │post_comments  │  └──────────┘
│ id (PK)      │ │ id (PK)       │
│ post_id (FK) │ │ post_id (FK)  │
│ user_id (FK) │ │ user_id (FK)  │
│ reaction_type│ │ content       │
│ created_at   │ │ parent_id(FK) │──▶ self-reference (replies)
│              │ │ created_at    │
│ UNIQUE:      │ └───────────────┘
│ (post_id,    │
│  user_id)    │
└──────────────┘

┌──────────────┐
│ post_shares  │
│ id (PK)      │
│ post_id (FK) │
│ user_id (FK) │
│ created_at   │
│ UNIQUE:      │
│ (post_id,    │
│  user_id)    │
└──────────────┘
```

### Relationship Summary / ဆက်စပ်မှု အကျဉ်းချုပ်

| Relationship | Myanmar | English | Type |
|-------------|---------|---------|------|
| USERS → POSTS | User တစ်ယောက်က Post အများအပြားရေးလို့ရ | One user writes many posts | One-to-Many |
| POSTS → tags | Post တစ်ခုမှာ Tag အများပါ | Post has many tags | Many-to-Many (via post_tags) |
| POSTS → post_reactions | Post တစ်ခုကို Like အများပေး | Many users can like a post | One-to-Many |
| POSTS → post_comments | Post တစ်ခုမှာ Comment အများပါ | Post has many comments | One-to-Many |
| COMMENTS → COMMENTS | Comment တစ်ခုကို Reply ပြန်လို့ရ | Comment can have nested replies | Self-referencing |
| POSTS → post_shares | Post တစ်ခုကို Share အများပေး | Many users can share a post | One-to-Many |

---

## 5. CRUD Operations / CRUD လုပ်ဆောင်ချက်များ

**CRUD = Create, Read, Update, Delete** — Database နဲ့ အလုပ်လုပ်တဲ့ အခြေခံ လုပ်ဆောင်ချက် ၄ ခုပါ။

### 5.1 User CRUD

| Operation | Myanmar | English | Code (Model) |
|-----------|---------|---------|--------------|
| **C**reate | User အသစ်ဖန်တီးခြင်း | Create new user | `User.createUser(username, email, password)` |
| **R**ead | User ရှာဖွေခြင်း | Find user | `User.findById(id)`, `User.findByEmail(email)` |
| **U**pdate | User ပြင်ဆင်ခြင်း | Update user | `User.updateUser(id, username, email, password, photo)` |
| **D**elete | User ဖျက်ခြင်း | Delete user | `User.deleteUser(id)` |

```javascript
// Example: Create User
// ဥပမာ — User အသစ်ဖန်တီးခြင်း
const hashedPassword = await bcrypt.hash(password, 10);
await db.query("INSERT INTO USERS(username, email, password) VALUES(?,?,?)",
    [username, email, hashedPassword]);
```

### 5.2 Post CRUD

| Operation | Myanmar | English | Code (Model) |
|-----------|---------|---------|--------------|
| **C**reate | Post အသစ်ရေးခြင်း | Create new post | `Post.createPost(userId, title, content, photo, visibility)` |
| **R**ead | Post ဖတ်ရှုခြင်း | Read posts | `Post.findAll(limit, offset)`, `Post.findByid(id)` |
| **U**pdate | Post ပြင်ဆင်ခြင်း | Update post | `Post.updatePost(id, title, content, photo, visibility, userId)` |
| **D**elete | Post ဖျက်ခြင်း | Delete post | `Post.deletePost(id)` |

### 5.3 Social (Reactions, Comments, Shares)

| Operation | Myanmar | English | Code (Model) |
|-----------|---------|---------|--------------|
| Like Toggle | Like ပေး/ဖြုတ် | Toggle like on/off | `Social.toggleReaction(postId, userId)` |
| Comment | Comment ရေးခြင်း | Write comment | `Social.createComment(postId, userId, content, parentId)` |
| Comment Delete | Comment ဖျက်ခြင်း | Delete comment | `Social.deleteComment(commentId, requesterId)` |
| Share Toggle | Share ပေး/ဖြုတ် | Toggle share on/off | `Social.toggleShare(postId, userId)` |

---

## 6. SQL Queries အသုံးများ / Common SQL Queries Used

### 6.1 JOIN Queries

```sql
-- Post တစ်ခုရဲ့ Author နာမည်နဲ့ Profile Photo ယူခြင်း
-- Get post with author name and profile photo
SELECT POSTS.*, username AS author, USERS.profile_photo AS author_photo
FROM POSTS
LEFT JOIN USERS ON POSTS.user_id = USERS.id;
```

```sql
-- Tag အလိုက် Post ရှာခြင်း
-- Find posts by tag
SELECT DISTINCT POSTS.*, username AS author
FROM POSTS
JOIN post_tags ON POSTS.id = post_tags.post_id
JOIN tags ON tags.id = post_tags.tag_id
JOIN USERS ON POSTS.user_id = USERS.id
WHERE tags.slug = ? AND POSTS.visibility = 'public';
```

### 6.2 Aggregate Queries

```sql
-- Tag တစ်ခုချင်းစီရဲ့ Post အရေအတွက်
-- Count posts per tag
SELECT tags.*, COUNT(post_tags.post_id) AS post_count
FROM tags
LEFT JOIN post_tags ON tags.id = post_tags.tag_id
GROUP BY tags.id
HAVING post_count > 0
ORDER BY post_count DESC;
```

### 6.3 Search Query

```sql
-- LIKE သုံးပြီး Post ရှာခြင်း (Partial Matching)
-- Search posts using LIKE (partial matching)
SELECT POSTS.*, username AS author,
       CASE
         WHEN POSTS.title LIKE ? THEN 3     -- Title မှာတွေ့ရင် Score 3
         WHEN POSTS.content LIKE ? THEN 1   -- Content မှာတွေ့ရင် Score 1
         ELSE 0
       END AS relevance
FROM POSTS
LEFT JOIN USERS ON POSTS.user_id = USERS.id
WHERE (POSTS.title LIKE ? OR POSTS.content LIKE ?)
  AND POSTS.visibility = 'public'
ORDER BY relevance DESC, POSTS.id DESC;
```

---

## 7. Security Features / လုံခြုံရေး အင်္ဂါရပ်များ

| Feature | Myanmar | English | Implementation |
|---------|---------|---------|----------------|
| **Password Hashing** | Password ကို Hash လုပ်ပြီး သိမ်းခြင်း | Encrypts password before storing | `bcrypt.hash(password, 10)` |
| **Parameterized Queries** | `?` Placeholder သုံးပြီး SQL Injection ကာကွယ်ခြင်း | Prevents SQL injection attacks | `db.query("... WHERE id = ?", [id])` |
| **JWT Authentication** | Token-based Login စစ်ခြင်း | Token-based authentication | `jwt.verify(token, JWT_SECRET)` |
| **Visibility Control** | Public/Private Post ခွဲခြားခြင်း | Controls who can see posts | `visibility = 'public'` column |

---

## 8. Key Design Patterns / အသုံးဝင်သော Design Patterns

### 8.1 One-to-Many (တစ်ဆက်များ)
```
USERS ──1:N──▶ POSTS
User တစ်ယောက် → Post အများအပြား
```

### 8.2 Many-to-Many (အများဆက်များ)
```
POSTS ──M:M──▶ tags (via post_tags junction table)
Post တစ်ခု → Tag အများအပြား
Tag တစ်ခု → Post အများအပြား
```

### 8.3 Self-Referencing (ကိုယ်တိုင်ဆက်စပ်)
```
post_comments.parent_id ──▶ post_comments.id
Comment တစ်ခု → Reply များ
```

### 8.4 Soft Schema Migration
```javascript
// Column အသစ်ထည့်တဲ့အခါ ALTER TABLE သုံးပြီး ရှောင်လွှဲခြင်း
// Adds column only if it doesn't exist
static async ensureVisibilityColumn() {
    try {
        await db.query("ALTER TABLE POSTS ADD COLUMN visibility VARCHAR(20) DEFAULT 'public'");
    } catch (error) {
        if (error.code !== "ER_DUP_FIELDNAME") throw error;
        // Column ရှိပြီးသားဆိုရင် error ကို ignore လုပ်
        // If column already exists, ignore the error
    }
}
```

---

## 9. Summary / အကျဉ်းချုပ်

```
┌─────────────────────────────────────────────────────────┐
│                    BLOG DATABASE                        │
│                                                         │
│  MySQL Database: blog_db                                │
│  Connection: mysql2 (Promise-based Pool)                │
│                                                         │
│  Tables:                                                │
│  ├─ USERS         → User accounts                       │
│  ├─ POSTS         → Blog posts                          │
│  ├─ tags          → Post categories                     │
│  ├─ post_tags     → Post ↔ Tag links                    │
│  ├─ post_reactions → Likes                              │
│  ├─ post_comments → Comments (with replies)             │
│  └─ post_shares   → Shares                              │
│                                                         │
│  Key Features:                                          │
│  ✓ bcrypt password hashing                              │
│  ✓ SQL injection prevention (parameterized queries)     │
│  ✓ Public/Private post visibility                       │
│  ✓ Many-to-Many tags                                    │
│  ✓ Nested comment replies                               │
│  ✓ Like/Share toggling                                  │
└─────────────────────────────────────────────────────────┘
```

> **English:** This project uses MySQL with 7 tables following relational database design. It supports full CRUD operations with security best practices (password hashing, SQL injection prevention) and social features (reactions, comments with nested replies, shares).
>
> **Myanmar:** ဒီ Project မှာ MySQL Database ကို ဇယား ၇ ခုနဲ့ Relational Database Design နဲ့ အသုံးပြုထားပါတယ်။ Security ကောင်းကောင်းနဲ့ (Password Hashing, SQL Injection ကာကွယ်) CRUD Operation အပြည့်အစုံနဲ့ Social Feature များ (Like, Reply ပြန်လို့ရတဲ့ Comment, Share) ပါဝင်ပါတယ်။
