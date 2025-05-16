// Check for manager role
document.addEventListener('DOMContentLoaded', async () => {
  const managerLink = document.getElementById('manager-link');
  console.log('managerLink:', managerLink);
  if (managerLink) {
    managerLink.style.display = 'none';
    const token = localStorage.getItem('token');
    console.log('token:', token);
    if (token) {
      try {
        const res = await fetch('http://localhost:3000/api/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('res.ok:', res.ok);
        if (res.ok) {
          const data = await res.json();
          console.log('user data:', data);
          if (data.role === 'manager') {
            managerLink.style.display = '';
            console.log('Manager link shown');
          }
        }
      } catch (err) {
        console.error('Error fetching user info:', err);
      }
    }
  }
});

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