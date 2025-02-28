document.addEventListener('DOMContentLoaded', function() {
  const sidebar = document.querySelector('.sidebar');
  const themeToggle = document.querySelector('.switch input');
  
  // Check for saved theme preference
  const savedTheme = localStorage.getItem('theme') || 'light';
  sidebar.setAttribute('data-theme', savedTheme);
  themeToggle.checked = savedTheme === 'dark';

  themeToggle.addEventListener('change', function() {
      const newTheme = this.checked ? 'dark' : 'light';
      sidebar.setAttribute('data-theme', newTheme);
      
      // Save theme preference
      localStorage.setItem('theme', newTheme);
  });
});

