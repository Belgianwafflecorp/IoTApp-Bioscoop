const form = document.getElementById('login-form');
const toggleBtn = document.getElementById('toggle-btn');
const registerFields = document.getElementById('register-fields');
const title = document.getElementById('form-title');
const errorMsg = document.getElementById('error-msg');
const successMsg = document.getElementById('success-msg');
const submitBtn = document.getElementById('submit-btn');
const loginUsernameOrEmail = document.getElementById('login-usernameOrEmail');

let isRegisterMode = false;

toggleBtn.addEventListener('click', () => {
  isRegisterMode = !isRegisterMode;

  if (isRegisterMode) {
    registerFields.style.display = 'block';
    title.textContent = 'Register';
    loginUsernameOrEmail.style.display = 'none'; // hide login-only field
    submitBtn.textContent = 'Register';
    toggleBtn.textContent = 'Already have an account? Login';
  } else {
    registerFields.style.display = 'none';
    title.textContent = 'Login';
    loginUsernameOrEmail.style.display = 'block'; // show login-only field
    submitBtn.textContent = 'Login';
    toggleBtn.textContent = 'Need an account? Register';
  }

  errorMsg.textContent = '';
  successMsg.textContent = '';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.textContent = '';
  successMsg.textContent = '';

  const usernameOrEmail = e.target.usernameOrEmail.value;
  const password = e.target.password.value;

  if (!isRegisterMode) {
    // === LOGIN MODE ===
    try {
      const res = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        errorMsg.textContent = data.error || 'Login failed';
        return;
      }

      localStorage.setItem('token', data.token);
      window.location.href = 'index.html';
    } catch (err) {
      errorMsg.textContent = 'Server error. Try again later.';
      console.error(err);
    }

  } else {
    // === REGISTER MODE ===
    const username = e.target.username.value;
    const email = e.target.email.value;

    try {
      const res = await fetch('http://localhost:3000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        errorMsg.textContent = data.error || 'Registration failed';
        return;
      }

      successMsg.textContent = 'Account created! You can now login.';
      form.reset();
      toggleBtn.click(); // Go back to login mode
    } catch (err) {
      errorMsg.textContent = 'Server error. Try again later.';
      console.error(err);
    }
  }
});

function logout() {
  localStorage.removeItem('token');  // Clear the JWT
  window.location.href = '/login.html'; // Or wherever your login page is
}