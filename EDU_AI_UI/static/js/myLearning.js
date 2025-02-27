document.addEventListener('DOMContentLoaded', function () {
  const htmlElement = document.documentElement;
  const themeToggle = document.querySelector('.switch input');
  const lottiePlayer = document.querySelector('.lottie-animation');

  // Theme toggle functionality
  function setTheme(theme) {
    htmlElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateIcons(theme);
    updateLottieAnimation(theme);
    console.log('Theme set to:', theme);
  }

  // Update sidebar icons
  function updateIcons(theme) {
    const navIcons = document.querySelectorAll('.nav-icon');
    navIcons.forEach(icon => {
      const lightSrc = icon.getAttribute('data-light-src');
      const darkSrc = icon.getAttribute('data-dark-src');
      if (lightSrc && darkSrc) {
        icon.src = theme === 'dark' ? darkSrc : lightSrc;
      }
    });
  }

  // Update Lottie animation (if applicable)
  function updateLottieAnimation(theme) {
    if (lottiePlayer) {
      const lightSrc = lottiePlayer.getAttribute('data-light-src');
      const darkSrc = lottiePlayer.getAttribute('data-dark-src');
      if (lightSrc && darkSrc) {
        lottiePlayer.load(theme === 'dark' ? darkSrc : lightSrc);
      }
    }
  }

  // Load saved theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  setTheme(savedTheme);
  if (themeToggle) {
    themeToggle.checked = savedTheme === 'dark';
    themeToggle.addEventListener('change', () => {
      const newTheme = themeToggle.checked ? 'dark' : 'light';
      setTheme(newTheme);
    });
  }
});