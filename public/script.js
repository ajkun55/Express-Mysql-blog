let token = "";

// Fetch and display all posts
async function fetchPosts() {
  const response = await fetch("http://localhost:3000/posts");
  const posts = await response.json();
  displayPosts(posts);
}

// Display posts in the container
function displayPosts(posts) {
  const postsContainer = document.getElementById("postsContainer");
  postsContainer.innerHTML = "";
  posts.forEach((post) => {
    const postDiv = document.createElement("div");
    postDiv.className = "post";
    postDiv.innerHTML = `
            <h3>${post.title}</h3>
            <p>${post.content}</p>
            <div id="comments-${post.id}">
                <h4>Comments</h4>
                <div id="comment-list-${post.id}"></div>
                <div class="comment-form">
                    <input type="text" id="comment-input-${post.id}" placeholder="Write a comment..." />
                    <button onclick="submitComment(${post.id})">Submit</button>
                </div>
            </div>
        `;
    postsContainer.appendChild(postDiv);
    fetchComments(post.id); // Fetch comments for this post
  });
}

// Fetch comments for a specific post
async function fetchComments(postId) {
  const response = await fetch(`http://localhost:3000/comments/${postId}`);
  const comments = await response.json();
  displayComments(postId, comments);
}

// Display comments for a specific post
function displayComments(postId, comments) {
  const commentList = document.getElementById(`comment-list-${postId}`);
  commentList.innerHTML = "";
  comments.forEach((comment) => {
    const commentDiv = document.createElement("div");
    commentDiv.className = "comment";
    commentDiv.textContent = comment.content;
    commentList.appendChild(commentDiv);
  });
}

// Submit a new comment
async function submitComment(postId) {
  const commentInput = document.getElementById(`comment-input-${postId}`);
  const content = commentInput.value;

  if (content) {
    const response = await fetch("http://localhost:3000/comments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ post_id: postId, content }),
    });

    if (response.ok) {
      const newComment = await response.json();
      displayComments(postId, [newComment]); // Display newly added comment
      commentInput.value = ""; // Clear input
    } else {
      alert("Failed to submit comment.");
    }
  }
}

// User Registration
async function registerUser() {
  const username = document.getElementById("registerUsername").value;
  const password = document.getElementById("registerPassword").value;

  const response = await fetch("http://localhost:3000/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (response.ok) {
    alert("User registered successfully!");
  } else {
    alert("Registration failed.");
  }
}

// User Login
async function loginUser() {
  const username = document.getElementById("loginUsername").value;
  const password = document.getElementById("loginPassword").value;

  const response = await fetch("http://localhost:3000/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (response.ok) {
    alert("Login successful!");
    document.getElementById("authSection").style.display = "none"; // Hide login/register
    fetchPosts(); // Refresh the posts after login
    document.getElementById("adminPanel").style.display = "block"; // Show admin panel
    fetchAdminPosts(); // Fetch posts for admin panel
  } else {
    alert("Login failed.");
  }
}

// Logout
async function logoutUser() {
  const response = await fetch("http://localhost:3000/logout", {
    method: "POST",
  });
  if (response.ok) {
    alert("Logout successful!");
    document.getElementById("adminPanel").style.display = "none"; // Hide admin panel
    document.getElementById("authSection").style.display = "block"; // show login/register
    fetchPosts(); // Refresh the post list
  } else {
    alert("Failed to log out.");
  }
}

async function checkSession() {
  const response = await fetch("http://localhost:3000/check-session");
  const data = await response.json();
  if (data.loggedIn) {
    document.getElementById("authSection").style.display = "none"; // Hide login/register
    document.getElementById("adminPanel").style.display = "block"; // Show admin panel
    fetchAdminPosts();
  } else {
    document.getElementById("authSection").style.display = "block"; // Show login/register
    document.getElementById("adminPanel").style.display = "none"; // Hide admin panel
  }
}

// Call checkSession on page load
checkSession();

// Fetch and display posts in the admin panel
async function fetchAdminPosts() {
  const response = await fetch("http://localhost:3000/posts");
  const posts = await response.json();
  displayAdminPosts(posts);
}

// Display posts in the admin panel
function displayAdminPosts(posts) {
  const adminPostsContainer = document.getElementById("adminPostsContainer");
  adminPostsContainer.innerHTML = "";
  posts.forEach((post) => {
    const postDiv = document.createElement("div");
    postDiv.className = "post";
    postDiv.innerHTML = `
            <h3>${post.title}</h3>
            <p>${post.content}</p>
            <button onclick="editPost(${post.id})">Edit</button>
            <button onclick="deletePost(${post.id})">Delete</button>
        `;
    adminPostsContainer.appendChild(postDiv);
  });
}

// Create a new post
async function createPost() {
  // Check if the user is logged in
  const sessionResponse = await fetch("http://localhost:3000/check-session");
  const sessionData = await sessionResponse.json();

  if (!sessionData.loggedIn) {
    alert("You must be logged in to create a post.");
    return; // Exit the function if not logged in
  }

  const title = document.getElementById("title").value.trim();
  const content = document.getElementById("content").value.trim();

  // Validate that title and content are not empty
  if (!title || !content) {
    alert("Title and content cannot be empty.");
    return; // Exit the function if validation fails
  }

  const response = await fetch("http://localhost:3000/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, content }),
  });

  if (response.ok) {
    fetchPosts(); // Refresh the post list
    document.getElementById("title").value = ""; // Clear the title input
    document.getElementById("content").value = ""; // Clear the content input
    fetchAdminPosts(); // Fetch posts for admin panel
  } else {
    const errorData = await response.json();
    alert(`Failed to create post: ${errorData.error}`);
  }
}

// Edit a post
async function editPost(id) {
  const title = prompt("Enter new title:");
  const content = prompt("Enter new content:");

  if (title && content) {
    const response = await fetch(`http://localhost:3000/posts/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, content }),
    });
    if (response.ok) {
      fetchAdminPosts(); // Refresh the admin post list
      fetchPosts(); // Refresh the post list
    } else {
      const errorData = await response.json();
      alert(`Failed to edit post: ${errorData.error}`);
    }
  }
}

// Delete a post
async function deletePost(id) {
  // Ask the user for confirmation
  const userConfirmed = confirm("Are you sure you want to delete this post?");

  // If the user did not confirm, exit the function
  if (!userConfirmed) {
    return; // Exit the function if the user cancels
  }

  // Proceed with the deletion if the user confirmed
  const response = await fetch(`http://localhost:3000/posts/${id}`, {
    method: "DELETE",
  });

  if (response.ok) {
    fetchAdminPosts(); // Refresh the admin post list
    fetchPosts(); // Refresh the post list
  } else {
    const errorData = await response.json();
    alert(`Failed to delete post: ${errorData.error}`);
  }
}

// Event listeners for login and registration
document
  .getElementById("registerButton")
  .addEventListener("click", registerUser);
document.getElementById("loginButton").addEventListener("click", loginUser);
document
  .getElementById("createPostButton")
  .addEventListener("click", createPost);
document.getElementById("logoutButton").addEventListener("click", logoutUser);

// Initial fetch of posts
fetchPosts();
