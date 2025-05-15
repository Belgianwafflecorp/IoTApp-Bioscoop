document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const usernameOrEmail = e.target.usernameOrEmail.value;
  const password = e.target.password.value;

  try {
    const res = await fetch('http://localhost:3000/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      document.getElementById('error-msg').textContent = data.error || 'Login failed';
      return;
    }

    // Save token in localStorage and redirect
    localStorage.setItem('token', data.token);
    window.location.href = 'index.html';
  } catch (error) {
    document.getElementById('error-msg').textContent = 'Server error. Try again later.';
    console.error('Login error:', error);
  }
});
