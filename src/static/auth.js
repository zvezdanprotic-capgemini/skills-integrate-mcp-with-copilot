
// Auth state
let authToken = localStorage.getItem('authToken');
let currentUser = null;

// DOM elements
const loginButton = document.getElementById('login-button');
const registerButton = document.getElementById('register-button');
const logoutButton = document.getElementById('logout-button');
const userInfoSpan = document.getElementById('user-info');
const loginModal = document.getElementById('login-modal');
const registerModal = document.getElementById('register-modal');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginMessage = document.getElementById('login-message');
const registerMessage = document.getElementById('register-message');

// Close modals when clicking on the close button or outside the modal
document.querySelectorAll('.close').forEach(closeBtn => {
  closeBtn.addEventListener('click', () => {
    loginModal.style.display = 'none';
    registerModal.style.display = 'none';
  });
});

window.addEventListener('click', (event) => {
  if (event.target === loginModal) {
    loginModal.style.display = 'none';
  }
  if (event.target === registerModal) {
    registerModal.style.display = 'none';
  }
});

// Show login modal
loginButton.addEventListener('click', () => {
  loginModal.style.display = 'block';
});

// Show register modal
registerButton.addEventListener('click', () => {
  registerModal.style.display = 'block';
});

// Handle logout
logoutButton.addEventListener('click', () => {
  logout();
});

// Check authentication on page load
document.addEventListener('DOMContentLoaded', checkAuth);

// Login form submission
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  try {
    const formData = new FormData();
    formData.append('username', email); // OAuth2 expects 'username' field
    formData.append('password', password);
    
    const response = await fetch('/token', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (response.ok) {
      // Save token and reload user info
      localStorage.setItem('authToken', result.access_token);
      authToken = result.access_token;
      await loadUserInfo();
      loginModal.style.display = 'none';
      loginForm.reset();
      showMessage(loginMessage, 'Login successful!', 'success');
    } else {
      showMessage(loginMessage, result.detail || 'Login failed', 'error');
    }
  } catch (error) {
    showMessage(loginMessage, 'Login failed. Please try again.', 'error');
    console.error('Error during login:', error);
  }
});

// Register form submission
registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const fullName = document.getElementById('register-name').value;
  
  try {
    const params = new URLSearchParams();
    params.append('email', email);
    params.append('password', password);
    if (fullName) params.append('full_name', fullName);
    
    const response = await fetch(`/users/register?${params.toString()}`, {
      method: 'POST'
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showMessage(registerMessage, 'Registration successful! You can now login.', 'success');
      
      // Auto-login after successful registration
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);
      
      const loginResponse = await fetch('/token', {
        method: 'POST',
        body: formData
      });
      
      if (loginResponse.ok) {
        const loginResult = await loginResponse.json();
        localStorage.setItem('authToken', loginResult.access_token);
        authToken = loginResult.access_token;
        await loadUserInfo();
        registerModal.style.display = 'none';
        registerForm.reset();
      }
    } else {
      showMessage(registerMessage, result.detail || 'Registration failed', 'error');
    }
  } catch (error) {
    showMessage(registerMessage, 'Registration failed. Please try again.', 'error');
    console.error('Error during registration:', error);
  }
});

// Helper functions
async function checkAuth() {
  if (authToken) {
    try {
      await loadUserInfo();
    } catch (error) {
      logout();
    }
  } else {
    updateUIForLoggedOut();
  }
}

async function loadUserInfo() {
  try {
    const response = await fetch('/users/me', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.ok) {
      currentUser = await response.json();
      updateUIForLoggedIn();
    } else {
      throw new Error('Failed to load user info');
    }
  } catch (error) {
    console.error('Error loading user info:', error);
    logout();
  }
}

function updateUIForLoggedIn() {
  loginButton.classList.add('hidden');
  registerButton.classList.add('hidden');
  logoutButton.classList.remove('hidden');
  userInfoSpan.textContent = `Logged in as: ${currentUser.full_name || currentUser.email} (${currentUser.role})`;
}

function updateUIForLoggedOut() {
  loginButton.classList.remove('hidden');
  registerButton.classList.remove('hidden');
  logoutButton.classList.add('hidden');
  userInfoSpan.textContent = 'Not logged in';
  currentUser = null;
}

function logout() {
  localStorage.removeItem('authToken');
  authToken = null;
  updateUIForLoggedOut();
}

function showMessage(element, message, type) {
  element.textContent = message;
  element.className = type;
  element.classList.remove('hidden');
  
  setTimeout(() => {
    element.classList.add('hidden');
  }, 5000);
}

// Export functions for use in app.js
window.auth = {
  isLoggedIn: () => !!authToken,
  getToken: () => authToken,
  getCurrentUser: () => currentUser
};
