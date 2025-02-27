document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const newsId = urlParams.get('id');
    const themeToggle = document.querySelector('.switch input');
    const htmlElement = document.documentElement;
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');

    // Theme toggle functionality
    function setTheme(theme) {
        htmlElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        updateIcons(theme);
        console.log('Theme set to:', theme); // Debug
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

    if (newsId) {
        fetchArticle(newsId);
    }

    fetchCategories();
    initializeSearch();
    initializeSpeech();
});

function initializeSpeech() {
    const speakButton = document.getElementById('speak-button');
    const pauseButton = document.getElementById('pause-button');
    const resumeButton = document.getElementById('resume-button');
    const cancelButton = document.getElementById('cancel-button');

    if (speakButton) {
        speakButton.addEventListener('click', () => {
            const articleContent = document.getElementById('article-content').innerText;
            console.log('Speaking content:', articleContent);
            speakText(articleContent);
        });
    }

    if (pauseButton) {
        pauseButton.addEventListener('click', () => {
            window.speechSynthesis.pause();
            pauseButton.style.display = 'none';
            resumeButton.style.display = 'inline';
        });
    }

    if (resumeButton) {
        resumeButton.addEventListener('click', () => {
            window.speechSynthesis.resume();
            resumeButton.style.display = 'none';
            pauseButton.style.display = 'inline';
        });
    }

    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            window.speechSynthesis.cancel();
            cancelButton.style.display = 'none';
            pauseButton.style.display = 'none';
            resumeButton.style.display = 'none';
            speakButton.style.display = 'inline';
        });
    }
}

function speakText(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 1;
        utterance.pitch = 1;

        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            utterance.voice = voices[0];
            console.log('Using voice:', utterance.voice.name);
        }

        utterance.onstart = function() {
            document.getElementById('speak-button').style.display = 'none';
            document.getElementById('pause-button').style.display = 'inline';
            document.getElementById('cancel-button').style.display = 'inline';
        };

        utterance.onend = function() {
            document.getElementById('speak-button').style.display = 'inline';
            document.getElementById('pause-button').style.display = 'none';
            document.getElementById('resume-button').style.display = 'none';
            document.getElementById('cancel-button').style.display = 'none';
        };

        window.speechSynthesis.speak(utterance);
    } else {
        console.error('Text-to-speech not supported.');
    }
}

async function fetchArticle(newsId) {
    try {
        const response = await fetch(`/api/news/${newsId}`);
        const article = await response.json();
        console.log(article);

        if (article) {
            document.querySelector('#article-title').textContent = article.title || 'No title available';
            document.querySelector('#date-text').textContent = new Date(article.date_of_published).toLocaleDateString('en-GB') || 'No date available';
            document.querySelector('#article-content').innerHTML = article.content || 'No content available';
            document.querySelector('#breadcrumb-article-title').textContent = article.title || 'No title available';

            const articleImage = document.querySelector('#article-image');
            if (article.image_link) {
                articleImage.src = article.image_link;
            } else {
                articleImage.style.display = 'none';
            }

            document.getElementById('speak-button').style.display = 'inline';
        }

        document.getElementById('loading-container').style.display = 'none';
    } catch (error) {
        console.error('Error fetching article:', error);
    }
}

function initializeSearch() {
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase().trim();
            filterCategories(searchTerm);
        });
    }
}

async function fetchCategories() {
    try {
        const response = await fetch('/static/categories.json');
        const categoriesData = await response.json();
        const categoriesList = document.getElementById('categories-list');

        for (const category in categoriesData) {
            if (categoriesData.hasOwnProperty(category)) {
                const categoryElement = document.createElement('div');
                categoryElement.classList.add('category');

                const categoryTitle = document.createElement('h3');
                categoryTitle.textContent = category;
                categoryElement.appendChild(categoryTitle);

                const subcategoriesList = document.createElement('ul');
                subcategoriesList.classList.add('subcategory-list');

                categoriesData[category].forEach(subcategory => {
                    const subcategoryItem = document.createElement('li');
                    subcategoryItem.textContent = subcategory;
                    subcategoriesList.appendChild(subcategoryItem);
                });

                categoryElement.appendChild(subcategoriesList);

                categoryTitle.addEventListener('click', () => {
                    categoryTitle.classList.toggle('active');
                    subcategoriesList.classList.toggle('visible');
                });

                categoriesList.appendChild(categoryElement);
            }
        }
    } catch (error) {
        console.error('Error fetching categories:', error);
    }
}

function filterCategories(searchTerm) {
    const categories = document.querySelectorAll('.category');

    categories.forEach(category => {
        const categoryTitle = category.querySelector('h3').textContent.toLowerCase();
        const subcategories = Array.from(category.querySelectorAll('.subcategory-list li'))
            .map(li => li.textContent.toLowerCase());

        const matchesCategory = categoryTitle.includes(searchTerm);
        const matchesSubcategory = subcategories.some(sub => sub.includes(searchTerm));

        if (matchesCategory || matchesSubcategory) {
            category.classList.remove('hidden');
            category.classList.add('highlight');

            if (matchesSubcategory && searchTerm.length > 0) {
                category.querySelector('h3').classList.add('active');
                category.querySelector('.subcategory-list').classList.add('visible');
            }
        } else {
            category.classList.add('hidden');
            category.classList.remove('highlight');
        }

        const subcategoryItems = category.querySelectorAll('.subcategory-list li');
        subcategoryItems.forEach(subcategoryItem => {
            const subcategoryText = subcategoryItem.textContent.toLowerCase();
            if (subcategoryText.includes(searchTerm)) {
                subcategoryItem.classList.add('highlight');
            } else {
                subcategoryItem.classList.remove('highlight');
            }
        });

        if (searchTerm.length === 0) {
            category.classList.remove('highlight');
            subcategoryItems.forEach(subcategoryItem => {
                subcategoryItem.classList.remove('highlight');
            });
        }
    });
}