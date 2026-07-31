# Simple Blog — A Full-Stack Node.js Blogging Platform

#### Video Demo:  https://youtu.be/tZcKvMN46js

#### Description:

**Simple Blog** is a full-featured web application built with Node.js, Express, MySQL, and EJS templating. It started as a CS50 final project with the goal of creating a real-world blogging platform — one that goes well beyond a simple CRUD app and incorporates the kind of features you'd expect from a modern social blogging site: user authentication, image uploads, post visibility controls, tags, reactions, nested comments, profile timelines, and more.

The project follows a classic **MVC (Model-View-Controller)** architecture, keeping business logic, data access, and presentation cleanly separated. Every design decision was made with maintainability and clarity in mind, not just functionality.

---

### Features at a Glance

*   **User Authentication** — Register, log in, and log out using JWT tokens stored in HTTP-only cookies.
*   **Post Management** — Create, read, update, and delete blog posts with optional cover images.
*   **Post Visibility** — Posts can be set to `public` or `private`. Private posts are only visible to their authors.
*   **Tagging System** — Tag posts with comma-separated keywords; browse posts by tag from a sidebar.
*   **Rich Text Editor** — Posts can include formatted content and inline images uploaded directly from the editor.
*   **Social Interactions** — Logged-in users can like/react to posts, leave comments, reply to comments in a thread, and share posts.
*   **Profile Pages** — Each user has a personal profile page showing their timeline (own posts + shared posts). Public profiles are visible to everyone.
*   **Search** — Full-text search across post titles and content, with visibility-aware results.
*   **Pagination** — Post listings are paginated with 6 posts per page.
*   **Content Sanitization** — All user-submitted post content is sanitized before storage to strip dangerous HTML tags and script injections.

---

### Project Structure

```text
simple_blog/
├── app.js                  # Application entry point
├── config/
│   └── database.js         # MySQL connection pool
├── controllers/
│   ├── postController.js   # Post-related request handlers
│   └── userController.js   # User-related request handlers
├── middleware/
│   └── auth.js             # JWT authentication middleware
├── models/
│   ├── postModel.js        # Post database operations
│   ├── userModel.js        # User database operations
│   ├── tagModel.js         # Tag database operations
│   └── socialModel.js      # Reactions, comments, and shares
├── routes/
│   ├── postRoute.js        # Express routes for posts
│   └── userRoute.js        # Express routes for users
├── utils/
│   └── jwt.js              # JWT token generation helper
├── views/
│   ├── home.ejs            # Landing/home page
│   ├── error.ejs           # Generic error page
│   ├── partials/
│   │   └── header.ejs      # Shared navigation header
│   ├── posts/
│   │   ├── postlist.ejs    # Post listing with search, tags, pagination
│   │   ├── show.ejs        # Single post detail page with comments
│   │   ├── create.ejs      # Post creation form with rich editor
│   │   └── edit.ejs        # Post editing form
│   └── users/
│       ├── register.ejs    # Registration form
│       ├── login.ejs       # Login form
│       ├── profile.ejs     # Authenticated user's own profile
│       ├── public-profile.ejs # Public profile view
│       └── edit.ejs        # Profile edit form
└── public/
    └── upload/             # Uploaded images (cover photos, avatars, editor images)
```

---

### File-by-File Breakdown

**`app.js` — Application Entry Point**
This is the heart of the application. It initializes Express, registers all middleware (CORS, Morgan request logging, JSON body parsing, static file serving), and sets up EJS as the view engine. One important design choice here is the **global authentication middleware** — before every request, the app reads the JWT from the user's cookie, verifies it, and populates `res.locals.currentUser` and `res.locals.isLoggedIn`. This means every EJS template has access to the current user without each route needing to manually pass it down. Routes are then mounted under `/posts` and `/users`, and a catch-all 404 handler is registered at the end.

**`config/database.js` — Database Connection**
A simple but critical file. It creates a MySQL connection **pool** (not a single connection) using the `mysql2` library, and exports a promise-based interface. Using a pool rather than a single connection is important because it allows multiple concurrent database queries without waiting for one to complete before starting another — essential for a web server handling many simultaneous requests.

**`models/postModel.js` — Post Data Layer**
This file defines the `Post` class with all the raw SQL queries for interacting with the `POSTS` table. Key methods include `findAll`, `findByid`, `createPost`, `updatePost`, `deletePost`, `search`, `findByTag`, and count methods for pagination. A notable design choice: **visibility-aware queries**. Almost every query has two variants — one that includes private posts (for the authenticated owner) and one that filters to public only (for everyone else). This is done by accepting an optional `currentUserId` parameter and conditionally building the SQL, which keeps the database layer clean and honest about who can see what. 

**`models/userModel.js` — User Data Layer**
The `User` class handles registration, login verification, retrieval, update, and deletion. Passwords are **always hashed using bcrypt** before being stored. The `updateUser` method handles four combinations of optional fields (password-only, photo-only, both, or neither), which felt necessary to avoid overwriting data the user did not intend to change.

**`models/tagModel.js` — Tag Data Layer**
Tags have their own dedicated table with a many-to-many relationship to posts via the `post_tags` junction table. The `Tag` class provides `findOrCreate`, `syncPostTags`, `attachToPosts` (efficiently loads tags for a batch of posts using an `IN` query), and `findAllWithCounts`. The `slugify` method converts a raw tag name like "Hello World!" into a URL-safe identifier like "hello-world".

**`models/socialModel.js` — Reactions, Comments, and Shares**
This manages three separate interaction tables: `post_reactions`, `post_comments`, and `post_shares`. The `attachToPosts` method is the centerpiece — it accepts an array of posts and enriches each one with reaction counts, comment counts, share counts, and a **nested comment tree** built in memory. `findProfileTimeline` builds a combined timeline of a user's own posts and posts they have shared, sorted by activity time.

**`controllers/postController.js` — Post Business Logic**
It handles all post-related HTTP logic: listing posts, searching, tag filtering, etc. A `sanitizeContent` function is applied to all user-submitted post content before saving to strip `<script>`, `<style>`, `<iframe>`, inline event handlers, and `javascript:` URLs as a deliberate defense against **stored XSS attacks**. It also centralizes `multer` configuration for image uploads.

**`controllers/userController.js` — User Business Logic**
Handles registration, login, logout, profile display, profile update, and public profile viewing. A notable design decision: **the login response supports both HTML browsers and API clients**. After verifying credentials, if the request accepts HTML it redirects; otherwise it returns JSON with the token.

**`middleware/auth.js` — Authentication Middleware**
Exports `verifyToken` and `verifyTokenAndAuthorization` (extends `verifyToken` by also ensuring the authenticated user's ID matches the `:id` route parameter, preventing users from modifying each other's accounts). 

**`utils/jwt.js` — Token Generation**
A thin utility that wraps `jsonwebtoken.sign` to produce tokens embedding the user's `id` and `email`, expiring in 1 hour.

**`routes/postRoute.js` and `routes/userRoute.js` — Route Definitions**
These files define the URL-to-controller mappings using Express Router. The post routes support both `POST /delete/:id` (for HTML form submissions) and `DELETE /delete/:id` (for REST API clients).

**`views/` — EJS Templates**
All HTML is rendered server-side using EJS. The `posts/postlist.ejs` template is the most feature-rich view, containing the post feed, sidebar tag cloud, search bar, and pagination controls. `posts/show.ejs` renders a full blog post with its comment section, nested replies, and reaction/share buttons.

---

### Design Decisions

*   **Why raw SQL instead of an ORM?** I deliberately avoided ORMs like Sequelize or Prisma to stay closer to the database and maintain full control over query performance. Every SQL statement in this project was written intentionally, and understanding the visibility logic (`WHERE visibility = 'public' OR user_id = ?`) would have been obscured behind ORM abstraction layers. Writing raw SQL also reinforced the database concepts covered in CS50.
*   **Why JWT in cookies instead of sessions?** JWT cookies give the benefit of stateless authentication (no server-side session store needed) while keeping the token out of JavaScript's reach via `httpOnly: true`. 
*   **Why MVC with separate model files?** Separating concerns into models, controllers, and views makes each piece independently readable and maintainable. When debugging a SQL issue, I go to the model. When debugging routing logic, I go to the controller. The views stay "dumb" and only render what they are given.
*   **Why schema migration guards in the models?** Rather than requiring a manual migration script to be run every time a column is added, each model method that depends on a column first checks whether it exists and adds it if not. This means the application can be deployed against an existing database without any manual steps.

---

### Getting Started

1. **Clone the repository** and install dependencies:
   ```bash
   npm install
   ```

2. **Configure environment variables** in a `.env` file:
   ```env
   PORT=3500
   HOST=localhost
   DB_HOST=localhost
   DB_USER=your_mysql_user
   DB_PASS=your_mysql_password
   DB_NAME=your_database_name
   JWT_SECRET=your_secret_key
   ```

3. **Create the base database tables** (the app auto-creates `tags`, `post_tags`, `post_reactions`, `post_comments`, and `post_shares` on first run, but you need to create `USERS` and `POSTS` manually):
   ```sql
   CREATE TABLE USERS (
       id INT AUTO_INCREMENT PRIMARY KEY,
       username VARCHAR(100) NOT NULL,
       email VARCHAR(150) NOT NULL UNIQUE,
       password VARCHAR(255) NOT NULL,
       profile_photo VARCHAR(255) NULL,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );

   CREATE TABLE POSTS (
       id INT AUTO_INCREMENT PRIMARY KEY,
       user_id INT NOT NULL,
       title VARCHAR(255) NOT NULL,
       content TEXT NOT NULL,
       photo VARCHAR(255) NULL,
       visibility VARCHAR(20) NOT NULL DEFAULT 'public',
       created_at DATETIME NOT NULL,
       FOREIGN KEY (user_id) REFERENCES USERS(id) ON DELETE CASCADE
   );
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. Visit `http://localhost:3500` in your browser.

---

### Technologies Used

| Technology | Role |
| :--- | :--- |
| **Node.js + Express 5** | Web server and routing |
| **MySQL2** | Database driver with promise support |
| **EJS** | Server-side HTML templating |
| **JSON Web Tokens (JWT)** | Stateless authentication |
| **bcrypt** | Password hashing |
| **Multer** | Multipart file upload handling |
| **Morgan** | HTTP request logging |
| **dotenv** | Environment variable management |
| **nodemon** | Development auto-restart |
