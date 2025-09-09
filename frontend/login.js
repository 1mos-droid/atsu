document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (res.ok) {
      // ✅ Use sessionStorage (clears automatically when tab/browser closes)
      sessionStorage.setItem("user", JSON.stringify(data.user));

      // Redirect to dashboard
      window.location.href = "index.html";
    } else {
      document.getElementById("error").textContent = data.error;
    }
  } catch (err) {
    document.getElementById("error").textContent = "Server error.";
  }
});