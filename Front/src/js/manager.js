// Check for manager role
export async function updateNavbarForRole() {
  const token = localStorage.getItem('token');
  if (!token) {
    console.log('No token found');
    return;
  }

  try {
    const res = await fetch('http://localhost:3000/api/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      console.log('Failed to fetch user info');
      return;
    }

    const user = await res.json();
    console.log('User info:', user); // <--- Add this line
    if (user.role === 'manager') {
      // Show the manager tab
      const navLinks = document.querySelector('.nav-links');
      if (navLinks && !document.getElementById('manager-tab')) {
        const managerTab = document.createElement('a');
        managerTab.href = '/pages/manager.html';
        managerTab.textContent = 'Manager';
        managerTab.id = 'manager-tab';
        managerTab.className = 'manager-tab'; // class for styling
        navLinks.appendChild(managerTab);
      }
    }
  } catch (err) {
    console.error('Failed to fetch user info', err);
  }
}


// Redirect non-managers away from manager.html
document.addEventListener('DOMContentLoaded', async () => {
  if (window.location.pathname.endsWith('manager.html')) {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '../index.html';
      return;
    }
    try {
      const res = await fetch('http://localhost:3000/api/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        window.location.href = '../index.html';
        return;
      }
      const data = await res.json();
      if (data.role !== 'manager') {
        window.location.href = '../index.html';
      }
    } catch {
      window.location.href = '../index.html';
    }
  }
});