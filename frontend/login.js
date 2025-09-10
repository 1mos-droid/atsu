document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorEl = document.getElementById("error");

  // Clear previous error
  if (errorEl) errorEl.textContent = "";

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (res.ok) {
      // ✅ Store user data in localStorage (persistent until logout)
      localStorage.setItem("user", JSON.stringify({ email }));

      // Redirect to dashboard
      window.location.href = "index.html";
    } else {
      errorEl.textContent = data.message || "Invalid credentials.";
    }
  } catch (err) {
    errorEl.textContent = "Server error. Please try again later.";
    console.error("Login error:", err);
  }
});