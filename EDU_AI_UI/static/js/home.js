// News Fetching (unchanged)
async function fetchNews() {
  try {
    const response = await fetch('/api/news');
    const newsData = await response.json();
    const newsSlider = document.getElementById('news-slider');

    newsSlider.innerHTML = '';
    newsData.forEach(news => {
      const slide = document.createElement('div');
      slide.className = 'swiper-slide';
      slide.innerHTML = `
        <div class="news-card">
          <img src="${news.image_link}" alt="${news.title}" class="news-image">
          <button class="like-button" onclick="toggleLike(event)">
            <img src="static/images/unlike.svg" alt="Heart" class="heart-icon">
          </button>
          <div class="news-content">
            <div class="news-date">${new Date(news.date_of_published).toLocaleDateString()}</div>
            <h3 class="news-title">${news.title}</h3>
            <p class="news-author">${news.summary}</p>
          </div>
        </div>
      `;
      newsSlider.appendChild(slide);
    });

    const swiper = new Swiper('.swiper-container', {
      loop: true,
      simulateTouch: true,
      spaceBetween: 30,
      slidesPerView: 1,
      breakpoints: {
        768: { slidesPerView: 2 },
        1024: { slidesPerView: 3 },
      },
    });
  } catch (error) {
    console.error('Error fetching news:', error);
  }
}

function toggleLike(event) {
  const button = event.currentTarget;
  const heartImage = button.querySelector('img');
  heartImage.src = heartImage.src.includes("unlike.svg") ? "static/images/like.svg" : "static/images/unlike.svg";
}

// Validation Functions
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validateName(name) {
  const re = /^[A-Za-z\s]{2,}$/;
  return re.test(name);
}

function validatePhone(phone) {
  const re = /^\d{10}$/; // Assuming 10-digit phone number
  return re.test(phone);
}

function validateDate(dob) {
  const date = new Date(dob);
  const now = new Date();
  return date < now && !isNaN(date.getTime());
}

// Form Validation Logic
document.addEventListener('DOMContentLoaded', function () {
  const themeToggle = document.querySelector('.theme-toggle input');
  const currentTheme = localStorage.getItem('theme') || 'light';
  const navIcons = document.querySelectorAll('.nav-icon');
  const dots = document.querySelectorAll('.dot');
  const slides = document.querySelectorAll('.slide');
  let currentSlide = 0;

  function updateIcons(theme) {
    navIcons.forEach(icon => {
      if (theme === 'dark') {
        icon.src = icon.getAttribute('data-dark-src') || icon.src;
      } else {
        icon.src = icon.getAttribute('data-light-src') || icon.src;
      }
    });
  }

  document.documentElement.setAttribute('data-theme', currentTheme);
  updateIcons(currentTheme);
  if (themeToggle && currentTheme === 'dark') {
    themeToggle.checked = true;
  }

  if (themeToggle) {
    themeToggle.addEventListener('change', function() {
      const newTheme = this.checked ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      updateIcons(newTheme);
    });
  }

  // Form Validation
  function clearErrors(formId) {
    const errors = document.querySelectorAll(`#${formId} .error-message`);
    errors.forEach(error => error.textContent = '');
  }

  function validateForm(formId) {
    clearErrors(formId);
    const form = document.getElementById(formId);
    let isValid = true;

    if (formId === 'loginForm') {
      const email = form.querySelector('input[name="email"]').value;
      const password = form.querySelector('input[name="password"]').value;

      if (!validateEmail(email)) {
        document.getElementById('login-email-error').textContent = 'Please enter a valid email address.';
        isValid = false;
      }
      if (!password) {
        document.getElementById('login-password-error').textContent = 'Password is required.';
        isValid = false;
      }
    }

    if (formId === 'signupForm') {
      const firstName = form.querySelector('input[name="first_name"]').value;
      const lastName = form.querySelector('input[name="last_name"]').value;
      const email = form.querySelector('input[name="email"]').value;
      const phone = form.querySelector('input[name="phone"]').value;
      const password = form.querySelector('input[name="password"]').value;
      const confirmPassword = form.querySelector('input[name="confirm_password"]').value;
      const dob = form.querySelector('input[name="dob"]').value;
      const profession = form.querySelector('select[name="profession"]').value;

      if (!validateName(firstName)) {
        document.getElementById('signup-first-name-error').textContent = 'First name must be at least 2 letters.';
        isValid = false;
      }
      if (!validateName(lastName)) {
        document.getElementById('signup-last-name-error').textContent = 'Last name must be at least 2 letters.';
        isValid = false;
      }
      if (!validateEmail(email)) {
        document.getElementById('signup-email-error').textContent = 'Please enter a valid email address.';
        isValid = false;
      }
      if (!validatePhone(phone)) {
        document.getElementById('signup-phone-error').textContent = 'Phone must be a 10-digit number.';
        isValid = false;
      }
      if (!password) {
        document.getElementById('signup-password-error').textContent = 'Password is required.';
        isValid = false;
      }
      if (password !== confirmPassword) {
        document.getElementById('signup-confirm-password-error').textContent = 'Passwords do not match.';
        isValid = false;
      } else if (!confirmPassword) {
        document.getElementById('signup-confirm-password-error').textContent = 'Confirm password is required.';
        isValid = false;
      }
      if (!validateDate(dob)) {
        document.getElementById('signup-dob-error').textContent = 'Please enter a valid past date.';
        isValid = false;
      }
      if (!profession) {
        document.getElementById('signup-profession-error').textContent = 'Please select a profession.';
        isValid = false;
      }
    }

    if (formId === 'missingInfoForm') {
      const country = form.querySelector('input[name="country"]').value;
      const state = form.querySelector('input[name="state"]').value;
      const city = form.querySelector('input[name="city"]').value;
      const phone = form.querySelector('input[name="phone_number"]').value;
      const dob = form.querySelector('input[name="dob"]').value;
      const profession = form.querySelector('select[name="profession"]').value;

      if (!validateName(country)) {
        document.getElementById('missing-country-error').textContent = 'Country must be at least 2 letters.';
        isValid = false;
      }
      if (!validateName(state)) {
        document.getElementById('missing-state-error').textContent = 'State must be at least 2 letters.';
        isValid = false;
      }
      if (!validateName(city)) {
        document.getElementById('missing-city-error').textContent = 'City must be at least 2 letters.';
        isValid = false;
      }
      if (!validatePhone(phone)) {
        document.getElementById('missing-phone-error').textContent = 'Phone must be a 10-digit number.';
        isValid = false;
      }
      if (!validateDate(dob)) {
        document.getElementById('missing-dob-error').textContent = 'Please enter a valid past date.';
        isValid = false;
      }
      if (!profession) {
        document.getElementById('missing-profession-error').textContent = 'Please select a profession.';
        isValid = false;
      }
    }

    return isValid;
  }

  // Attach validation to form submissions
  ['loginForm', 'signupForm', 'missingInfoForm'].forEach(formId => {
    const form = document.getElementById(formId);
    if (form) {
      form.addEventListener('submit', function(event) {
        if (!validateForm(formId)) {
          event.preventDefault();
        }
      });
    }
  });

  // Rest of your existing code (slider, modals, etc.)
  const loginBtn = document.getElementById("login-btn");
  const loginModal = document.getElementById("loginModal");
  const closeLoginModal = document.getElementById("closeLoginModal");
  const signupModal = document.getElementById("signupModal");
  const closeSignupModal = document.getElementById("closeSignupModal");
  const openSignupModalLink = document.getElementById("openSignupModalLink");
  const openLoginModalLink = document.getElementById("openLoginModalLink");

  if (loginBtn && loginModal) {
    loginBtn.addEventListener("click", (event) => {
      event.preventDefault();
      loginModal.style.display = "flex";
    });
  }

  if (closeLoginModal && loginModal) {
    closeLoginModal.addEventListener("click", () => {
      loginModal.style.display = "none";
    });
  }

  if (openSignupModalLink && signupModal) {
    openSignupModalLink.addEventListener("click", (event) => {
      event.preventDefault();
      loginModal.style.display = "none";
      signupModal.style.display = "flex";
    });
  }

  if (closeSignupModal && signupModal) {
    closeSignupModal.addEventListener("click", () => {
      signupModal.style.display = "none";
    });
  }

  if (openLoginModalLink && loginModal) {
    openLoginModalLink.addEventListener("click", (event) => {
      event.preventDefault();
      signupModal.style.display = "none";
      loginModal.style.display = "flex";
    });
  }

  if (loginModal && signupModal) {
    window.addEventListener("click", (event) => {
      if (event.target === loginModal) loginModal.style.display = "none";
      if (event.target === signupModal) signupModal.style.display = "none";
    });
  }

  const missingInfoModal = document.getElementById("missingInfoModal");
  const closeMissingInfoModal = document.getElementById("closeMissingInfoModal");

  if (closeMissingInfoModal && missingInfoModal) {
    closeMissingInfoModal.addEventListener("click", () => {
      missingInfoModal.style.display = "none";
      fetch('/clear_show_modal', { method: 'POST' });
    });
  }

  if (missingInfoModal) {
    window.addEventListener("click", (event) => {
      if (event.target === missingInfoModal) {
        missingInfoModal.style.display = "none";
        fetch('/clear_show_modal', { method: 'POST' });
      }
    });
  }

  function checkShowModal() {
    fetch('/check_show_modal')
      .then(response => response.json())
      .then(data => {
        if (data.show_update_profile && missingInfoModal) {
          missingInfoModal.style.display = "flex";
        }
      });
  }
  checkShowModal();

  function updateSlider() {
    dots.forEach(dot => dot.classList.remove('active'));
    slides.forEach(slide => slide.classList.remove('active'));
    dots[currentSlide].classList.add('active');
    slides[currentSlide].classList.add('active');
  }

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      currentSlide = index;
      updateSlider();
    });
  });

  setInterval(() => {
    currentSlide = (currentSlide + 1) % dots.length;
    updateSlider();
  }, 5000);
  updateSlider();
});

async function fetchLocation() {
  let url = "https://ipinfo.io/124.253.250.142?token=f2ba83e357b614";
  let response = await fetch(url);
  let data = await response.json();
  const city = data.city || "Unknown City";
  document.getElementById("user-location").textContent = `${city}`;
}

fetchLocation();
function openGeneralKnowledgePage() {
  window.location.href = "/general_knowledge";
}
window.onload = fetchNews;