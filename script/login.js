const tabRegister = document.getElementById('tabRegister');
const goLogin = document.getElementById('goLogin');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginDivider = document.getElementById('loginDivider');
const footRegister = document.getElementById('footRegister');

// ---------- Switching between sign-in and register ----------

function showLogin() {
  loginForm.hidden = false;
  loginDivider.hidden = false;
  tabRegister.hidden = false;
  registerForm.hidden = true;
  footRegister.hidden = true;
}

function showRegister() {
  loginForm.hidden = true;
  loginDivider.hidden = true;
  tabRegister.hidden = true;
  registerForm.hidden = false;
  footRegister.hidden = false;
}

tabRegister.addEventListener('click', showRegister);
goLogin.addEventListener('click', (e) => { e.preventDefault(); showLogin(); });

// ---------- Registration ----------

function handleRegister(event) {
  event.preventDefault();

  const email = document.getElementById('registerEmail').value.trim();
  const username = document.getElementById('registerUsername').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('registerConfirmPassword').value;
  const error = document.getElementById('registerError');

  if (password !== confirmPassword) {
    error.textContent = "Passwords don't match.";
    return;
  }

  error.textContent = '';

  localStorage.setItem('userName', username);
  localStorage.setItem('userEmail', email);
  localStorage.setItem('userPassword', password);
  localStorage.setItem('isLoggedIn', 'true');

  downloadRegistrationNote(username, email);

  setTimeout(() => {
    window.location.href = 'index.html';
  }, 300);
}

// Saves the registration details as a downloadable .txt file (opens like Notepad).
function downloadRegistrationNote(username, email) {
  const contents =
    'Greenlist — New Account\n' +
    '------------------------\n' +
    'Username: ' + username + '\n' +
    'Email: ' + email + '\n' +
    'Registered: ' + new Date().toLocaleString() + '\n';

  const blob = new Blob([contents], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = username.replace(/\s+/g, '_') + '_account.txt';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

registerForm.addEventListener('submit', handleRegister);

// ---------- Sign-in ----------

function handleLogin(event) {
  event.preventDefault();

  const identifier = document.getElementById('loginIdentifier').value.trim();
  const password = document.getElementById('loginPassword').value;
  const error = document.getElementById('loginError');

  const savedEmail = localStorage.getItem('userEmail');
  const savedUsername = localStorage.getItem('userName');
  const savedPassword = localStorage.getItem('userPassword');

  const identifierMatches = identifier === savedEmail || identifier === savedUsername;

  if (identifierMatches && password === savedPassword) {
    // Restore the display name for accounts that were signed out by the earlier logout version.
    if (!savedUsername) {
      localStorage.setItem('userName', identifier === savedEmail ? identifier.split('@')[0] : identifier);
    }
    localStorage.setItem('isLoggedIn', 'true');
    window.location.href = 'index.html';
  } else if (!savedEmail) {
    error.textContent = 'No account yet — create one below.';
  } else {
    error.textContent = 'Incorrect email/username or password.';
  }
}

loginForm.addEventListener('submit', handleLogin);
