document.addEventListener('DOMContentLoaded', function () {
    const generalDetailsBtn = document.getElementById('general-details-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const generalDetailsContent = document.getElementById('general-details-content');
    const settingsContent = document.getElementById('settings-content');
    const themeToggle = document.querySelector('.switch input');
    const htmlElement = document.documentElement;

    // Theme toggle functionality
    function setTheme(theme) {
        htmlElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        updateIcons(theme); // Update sidebar icons
    }

    // Update sidebar icons based on theme
    function updateIcons(theme) {
        const navIcons = document.querySelectorAll('.nav-icon');
        navIcons.forEach(icon => {
            const lightSrc = icon.getAttribute('data-light-src');
            const darkSrc = icon.getAttribute('data-dark-src');
            if (lightSrc && darkSrc) { // Check if attributes exist
                icon.src = theme === 'dark' ? darkSrc : lightSrc;
            }
        });
    }

    // Load saved theme and update icons
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    if (themeToggle) {
        themeToggle.checked = savedTheme === 'dark';
        themeToggle.addEventListener('change', () => {
            const newTheme = themeToggle.checked ? 'dark' : 'light';
            setTheme(newTheme);
        });
    }

    // Tab switching
    generalDetailsBtn.addEventListener('click', function () {
        generalDetailsBtn.classList.add('active');
        settingsBtn.classList.remove('active');
        generalDetailsContent.classList.add('active');
        settingsContent.classList.remove('active');
    });

    settingsBtn.addEventListener('click', function () {
        settingsBtn.classList.add('active');
        generalDetailsBtn.classList.remove('active');
        settingsContent.classList.add('active');
        generalDetailsContent.classList.remove('active');
    });
});

// Function to handle the image preview
function previewImage(event) {
    const fileInput = event.target;
    const file = fileInput.files[0];

    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function () {
            const profileImg = document.getElementById('profile-img');
            profileImg.src = reader.result;
        };
        reader.readAsDataURL(file);
    } else {
        alert('Please select a valid image file.');
    }
}