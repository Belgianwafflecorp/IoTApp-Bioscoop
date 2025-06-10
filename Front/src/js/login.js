import { API_URL } from "../apiConfig";

$(document).ready(function () {
  // Configuration constants - centralized for easy maintenance and environment changes
  const API_BASE_URL = 'http://localhost:3000/api';
  const HOMEPAGE_URL = '../index.html';
  const REDIRECT_DELAY = 100; // Small delay to ensure token storage completes before redirect
  
  // Text constants for UI labels - makes internationalization easier later
  const UI_TEXT = {
    LOGIN: 'Login',
    REGISTER: 'Register',
    TOGGLE_TO_REGISTER: 'Need an account? Register',
    TOGGLE_TO_LOGIN: 'Already have an account? Login',
    REGISTRATION_SUCCESS: 'Account created! You can now login.',
    LOGIN_ERROR_FALLBACK: 'Login failed',
    REGISTER_ERROR_FALLBACK: 'Registration failed'
  };

  // Cache DOM elements for better performance and cleaner code
  const $form = $('#login-form');
  const $toggleBtn = $('#toggle-btn');
  const $registerFields = $('#register-fields');
  const $title = $('#form-title');
  const $errorMsg = $('#error-msg');
  const $successMsg = $('#success-msg');
  const $loginUsernameOrEmail = $('#login-usernameOrEmail');
  const $submitBtn = $('.submit-btn');
  
  // Track current form state - determines which fields are visible and which API endpoint to use
  let isRegisterMode = false;

  // Configure form mode toggle - switches between login and registration interfaces
  // Handles UI updates, field visibility, and message clearing for smooth user experience
  $toggleBtn.on('click', function () {
    isRegisterMode = !isRegisterMode;

    // Show/hide form fields based on current mode
    $registerFields.toggle(isRegisterMode);
    $loginUsernameOrEmail.toggle(!isRegisterMode);

    // Update UI text to reflect current mode
    $title.text(isRegisterMode ? UI_TEXT.REGISTER : UI_TEXT.LOGIN);
    $submitBtn.text(isRegisterMode ? UI_TEXT.REGISTER : UI_TEXT.LOGIN);
    $toggleBtn.text(isRegisterMode ? UI_TEXT.TOGGLE_TO_LOGIN : UI_TEXT.TOGGLE_TO_REGISTER);

    // Clear any existing messages when switching modes to avoid confusion
    $errorMsg.text('');
    $successMsg.text('');
  });

  // Enable homepage navigation through logo/circle click for intuitive UX
  // Provides visual feedback with cursor change to indicate clickability
  $('.circle').css('cursor', 'pointer').on('click', function () {
    window.location.href = HOMEPAGE_URL;
  });

  // Main form submission handler - processes both login and registration requests
  // Prevents default form submission to handle via AJAX for better user experience
  $form.on('submit', function (e) {
    e.preventDefault();
    
    // Clear previous messages to show fresh feedback for current submission
    $errorMsg.text('');
    $successMsg.text('');

    // Extract password field value (common to both login and registration)
    const password = $form.find('[name="password"]').val();

    if (!isRegisterMode) {
      // Handle login flow - authenticate user and store session token
      const usernameOrEmail = $form.find('[name="usernameOrEmail"]').val();

      $.ajax({
        url: `${API_URL}/login`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ usernameOrEmail, password }),
        success: function (data) {
          // Store JWT token for authenticated requests and redirect to main app
          localStorage.setItem('token', data.token);
          // Small delay ensures token storage completes before navigation
          setTimeout(() => {
            window.location.href = HOMEPAGE_URL;
          }, REDIRECT_DELAY);
        },
        error: function (xhr) {
          // Display server error message or fallback for better user feedback
          const err = xhr.responseJSON?.error || UI_TEXT.LOGIN_ERROR_FALLBACK;
          $errorMsg.text(err);
        },
      });
    } else {
      // Handle registration flow - create new user account and switch to login mode
      const username = $form.find('[name="username"]').val();
      const email = $form.find('[name="email"]').val();

      $.ajax({
        url: `${API_URL}/register`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ username, email, password }),
        success: function () {
          // Show success message and reset form for clean state
          $successMsg.text(UI_TEXT.REGISTRATION_SUCCESS);
          $form[0].reset();
          // Automatically switch to login mode so user can immediately sign in
          $toggleBtn.click();
        },
        error: function (xhr) {
          // Display registration-specific error message with fallback
          const err = xhr.responseJSON?.error || UI_TEXT.REGISTER_ERROR_FALLBACK;
          $errorMsg.text(err);
        },
      });
    }
  });
});