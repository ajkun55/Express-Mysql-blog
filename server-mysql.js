const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: "your_session_secret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true if using HTTPS
  })
);

// Serve static files from the public directory
app.use(express.static("public"));

// MySQL database setup
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "blog",
});

db.connect((err) => {
  if (err) {
    console.error(err.message);
    throw err;
  }
  console.log("Connected to the blog database.");
});

// Create users, posts, and comments tables if they don't exist
db.query(`
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
  )
`);

db.query(`
  CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    user_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

db.query(`
  CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// User Registration
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  db.query(
    "INSERT INTO users (username, password) VALUES (?, ?)",
    [username, hashedPassword],
    function (err, results) {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: "Internal server error" });
      }
      res.status(201).json({ id: results.insertId, username });
    }
  );
});

// User Login
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, results) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: "Internal server error" });
      }
      const user = results[0];
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Store user information in session
      req.session.userId = user.id;
      req.session.username = user.username;

      res.json({ userId: user.id, message: "Login successful" });
    }
  );
});

app.get("/check-session", (req, res) => {
  if (req.session.userId) {
    res.json({ loggedIn: true, username: req.session.username });
  } else {
    res.json({ loggedIn: false });
  }
});

// Logout
app.post("/logout", (req, res) => {
  if (req.session.userId) {
    req.session.destroy((err) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: "Internal server error" });
      }
      res.json({ message: "Logout successful" });
    });
  } else {
    res.status(401).json({ error: "Not logged in" });
  }
});

// Middleware to check if user is authenticated
function authenticate(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.sendStatus(401); // Unauthorized
  }
}

// Routes for posts (protected)
app.get("/posts", (req, res) => {
  db.query("SELECT * FROM posts", (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: "Internal server error" });
    }
    res.json(rows);
  });
});

app.get("/posts/:id", (req, res) => {
  db.query("SELECT * FROM posts WHERE id = ?", [req.params.id], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: "Internal server error" });
    }
    const row = rows[0];
    if (!row) {
      return res.status(404).json({ error: "Post not found" });
    }
    res.json(row);
  });
});

// Create a new post
app.post("/posts", authenticate, (req, res) => {
  const { title, content } = req.body;

  // Validate that title and content are not empty
  if (!title || !content) {
    return res
      .status(400)
      .json({ error: "Title and content cannot be empty." });
  }

  db.query(
    "INSERT INTO posts (title, content, user_id) VALUES (?, ?, ?)",
    [title, content, req.session.userId],
    function (err, results) {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: "Internal server error" });
      }
      res.status(201).json({ id: results.insertId, title, content });
    }
  );
});

// Update a post
app.put("/posts/:id", authenticate, (req, res) => {
  const { title, content } = req.body;
  const postId = req.params.id;

  db.query("SELECT * FROM posts WHERE id = ?", [postId], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: "Internal server error" });
    }
    const post = rows[0];
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    if (post.user_id !== req.session.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    db.query(
      "UPDATE posts SET title = ?, content = ? WHERE id = ?",
      [title, content, postId],
      (err) => {
        if (err) {
          console.error(err.message);
          return res.status(500).json({ error: "Internal server error" });
        }
        res.json({ id: postId, title, content });
      }
    );
  });
});

// Delete a post
app.delete("/posts/:id", authenticate, (req, res) => {
  const postId = req.params.id;

  db.query("SELECT * FROM posts WHERE id = ?", [postId], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: "Internal server error" });
    }
    const post = rows[0];
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    if (post.user_id !== req.session.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    db.query("DELETE FROM posts WHERE id = ?", [postId], (err) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: "Internal server error" });
      }
      res.sendStatus(204);
    });
  });
});

// Fetch comments for a specific post
app.get("/comments/:postId", (req, res) => {
  const postId = req.params.postId;
  db.query(
    "SELECT * FROM comments WHERE post_id = ? ORDER BY created_at DESC",
    [postId],
    (err, rows) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: "Internal server error" });
      }
      res.json(rows);
    }
  );
});

// Post a new comment
app.post("/comments", authenticate, (req, res) => {
  const { post_id, content } = req.body;

  db.query(
    "INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)",
    [post_id, req.session.userId, content],
    function (err, results) {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: "Internal server error" });
      }
      res.status(201).json({ id: results.insertId, content });
    }
  );
});

// Update a comment
app.put("/comments/:id", authenticate, (req, res) => {
  const { content } = req.body;
  const commentId = req.params.id;

  db.query("SELECT * FROM comments WHERE id = ?", [commentId], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: "Internal server error" });
    }
    const comment = rows[0];
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }
    if (comment.user_id !== req.session.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    db.query(
      "UPDATE comments SET content = ? WHERE id = ?",
      [content, commentId],
      (err) => {
        if (err) {
          console.error(err.message);
          return res.status(500).json({ error: "Internal server error" });
        }
        res.json({ id: commentId, content });
      }
    );
  });
});

// Delete a comment
app.delete("/comments/:id", authenticate, (req, res) => {
  const commentId = req.params.id;

  db.query("SELECT * FROM comments WHERE id = ?", [commentId], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: "Internal server error" });
    }
    const comment = rows[0];
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }
    if (comment.user_id !== req.session.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    db.query("DELETE FROM comments WHERE id = ?", [commentId], (err) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: "Internal server error" });
      }
      res.sendStatus(204);
    });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
