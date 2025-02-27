document.addEventListener('DOMContentLoaded', function () {
    const themeToggle = document.querySelector('.switch input');
    const htmlElement = document.documentElement;
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
  
    // Theme toggle functionality
    function setTheme(theme) {
      htmlElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
      updateIcons(theme);
    }
  
    function updateIcons(theme) {
      const navIcons = document.querySelectorAll('.nav-icon');
      navIcons.forEach(icon => {
        const lightSrc = icon.getAttribute('data-light-src');
        const darkSrc = icon.getAttribute('data-dark-src');
        icon.src = theme === 'dark' ? darkSrc : lightSrc;
      });
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
  
    // Hamburger toggle
    if (hamburger && sidebar) {
      hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('open');
        sidebar.classList.toggle('active');
      });
    }
  
    fetchCategories();
    fetchNews();
  });
  
  let allCategories = [];
  
  async function fetchCategories() {
    try {
      const response = await fetch('/static/categories.json');
      const categoriesData = await response.json();
  
      for (const category in categoriesData) {
        if (categoriesData.hasOwnProperty(category)) {
          allCategories.push({ name: category, type: 'category' });
          categoriesData[category].forEach(subcategory => {
            allCategories.push({ name: subcategory, type: 'subcategory', parent: category });
          });
        }
      }
  
      const categorySearch = document.getElementById('category-search');
      categorySearch.addEventListener('input', filterSuggestions);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }
  
  function filterSuggestions() {
    const inputValue = this.value.toLowerCase();
    const categorySuggestions = document.getElementById('category-suggestions');
    categorySuggestions.innerHTML = '';
  
    const filteredCategories = allCategories.filter(item =>
      item.name.toLowerCase().includes(inputValue)
    );
  
    const top5Suggestions = filteredCategories.slice(0, 5);
    top5Suggestions.forEach(item => {
      const option = document.createElement('option');
      option.value = item.type === 'subcategory' ? `${item.parent} - ${item.name}` : item.name;
      categorySuggestions.appendChild(option);
    });
  }
  
  async function fetchNews() {
    try {
      document.getElementById('loading-container').style.display = 'block';
  
      const response = await fetch('/api/news');
      const newsData = await response.json();
      const contentContainer = document.querySelector('.content-container');
      contentContainer.innerHTML = '';
  
      newsData.forEach(news => {
        const date = new Date(news.date_of_published);
        const formattedDate = date.toLocaleDateString('en-GB', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });
  
        const contentItem = document.createElement('div');
        contentItem.className = 'content-item';
        contentItem.innerHTML = `
          <div class="content-text">
            <h2>${news.title}</h2>
            <h4>${formattedDate}</h4>
            <p>${news.summary}</p>
            <button class="read-more" data-id="${news.id}">Read More</button>
          </div>
          <div class="content-image">
            <img src="${news.image_link}" alt="${news.title}" />
          </div>
        `;
        contentContainer.appendChild(contentItem);
      });
  
      const readMoreButtons = document.querySelectorAll('.read-more');
      readMoreButtons.forEach(button => {
        button.addEventListener('click', function () {
          const newsId = button.getAttribute('data-id');
          window.location.href = `/details?id=${newsId}`;
        });
      });
  
      document.getElementById('loading-container').style.display = 'none';
    } catch (error) {
      console.error('Error fetching news:', error);
      document.getElementById('loading-container').style.display = 'none';
    }
  }