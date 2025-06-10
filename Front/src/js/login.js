import { API_URL } from "../apiConfig.js";

$(document).ready(function () {
  const $form = $('#login-form');
  const $toggleBtn = $('#toggle-btn');
  const $registerFields = $('#register-fields');
  const $title = $('#form-title');
  const $errorMsg = $('#error-msg');
  const $successMsg = $('#success-msg');
  const $loginUsernameOrEmail = $('#login-usernameOrEmail');
  const $submitBtn = $('.submit-btn');
  let isRegisterMode = false;

  // Toggle between login and register mode
  $toggleBtn.on('click', function () {
    isRegisterMode = !isRegisterMode;

    $registerFields.toggle(isRegisterMode);
    $loginUsernameOrEmail.toggle(!isRegisterMode);

    $title.text(isRegisterMode ? 'Register' : 'Login');
    $submitBtn.text(isRegisterMode ? 'Register' : 'Login');
    $toggleBtn.text(isRegisterMode ? 'Already have an account? Login' : 'Need an account? Register');

    $errorMsg.text('');
    $successMsg.text('');
  });

  // Clickable circle redirects to homepage
  $('.circle').css('cursor', 'pointer').on('click', function () {
    window.location.href = '../index.html';
  });

  // Form submit handler
  $form.on('submit', function (e) {
    e.preventDefault();
    $errorMsg.text('');
    $successMsg.text('');

    const password = $form.find('[name="password"]').val();

    if (!isRegisterMode) {
      const usernameOrEmail = $form.find('[name="usernameOrEmail"]').val();

      $.ajax({
        url: `${API_URL}/login`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ usernameOrEmail, password }),
        success: function (data) {
          localStorage.setItem('token', data.token);
          setTimeout(() => {
            window.location.href = '../index.html';
          }, 100);
        },
        error: function (xhr) {
          const err = xhr.responseJSON?.error || 'Login failed';
          $errorMsg.text(err);
        },
      });
    } else {
      const username = $form.find('[name="username"]').val();
      const email = $form.find('[name="email"]').val();

      $.ajax({
        url: `${API_URL}/register`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ username, email, password }),
        success: function () {
          $successMsg.text('Account created! You can now login.');
          $form[0].reset();
          $toggleBtn.click(); // switch back to login mode
        },
        error: function (xhr) {
          const err = xhr.responseJSON?.error || 'Registration failed';
          $errorMsg.text(err);
        },
      });
    }
  });
});
