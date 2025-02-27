document.addEventListener("DOMContentLoaded", function () {
    const sendBtn = document.querySelector('.send-btn');
    const chatInput = document.getElementById('chat-input');
    const chatContent = document.getElementById('chat-content');
    const chatHistory = document.getElementById('chat-history');
    const welcomeText = document.getElementById('welcome-text');
    const themeToggle = document.querySelector('.switch input');
    const htmlElement = document.documentElement; // <html> element
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.querySelector('.sidebar');
    let isFirstMessage = true;

    // Theme toggle functionality
    function setTheme(theme) {
        htmlElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme); // Persist theme choice
        updateIcons(theme); // Update icons based on theme
    }

    function updateIcons(theme) {
        const navIcons = document.querySelectorAll('.nav-icon');
        navIcons.forEach(icon => {
            const lightSrc = icon.getAttribute('data-light-src');
            const darkSrc = icon.getAttribute('data-dark-src');
            icon.src = theme === 'dark' ? darkSrc : lightSrc;
        });
    }

    // Load saved theme or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    themeToggle.checked = savedTheme === 'dark';

    // Theme toggle event listener
    themeToggle.addEventListener('change', () => {
        const newTheme = themeToggle.checked ? 'dark' : 'light';
        setTheme(newTheme);
    });

    // Hamburger toggle
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('open');
        sidebar.classList.toggle('active');
    });

    function createTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        return typingDiv;
    }

    function handleFirstMessage() {
        if (isFirstMessage) {
            welcomeText.classList.add('hidden');
            chatContent.classList.remove('hidden');
            document.querySelector('.chat-container').classList.remove('initial');
            isFirstMessage = false;

            setTimeout(() => {
                chatContent.style.marginTop = '20px';
            }, 300);
        }
    }

    function sendMessage() {
        let message = chatInput.value.trim();
        if (message !== "") {
            handleFirstMessage();
            appendMessage("user", message);
            chatInput.value = "";

            sendBtn.classList.add('loading');
            const typingIndicator = createTypingIndicator();
            chatHistory.appendChild(typingIndicator);
            typingIndicator.scrollIntoView({ behavior: "smooth", block: "end" });

            sendMessageToAI(message, typingIndicator);
        }
    }

    function sendMessageToAI(message, typingIndicator) {
        setTimeout(() => {
            fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: message })
            })
                .then(response => response.json())
                .then(data => {
                    typingIndicator.remove();
                    sendBtn.classList.remove('loading');

                    let aiResponse = data.reply || "No response from AI.";
                    appendMessage("ai", aiResponse);
                })
                .catch(error => {
                    console.error('Error:', error);
                    typingIndicator.remove();
                    sendBtn.classList.remove('loading');
                    appendMessage("ai", "Sorry, there was an error processing your message.");
                });
        }, 500); // Simulate network delay
    }

    function appendMessage(sender, message) {
        const messageElem = document.createElement("div");
        messageElem.classList.add("message", sender);
        messageElem.textContent = message;
        chatHistory.appendChild(messageElem);
        messageElem.scrollIntoView({ behavior: "smooth", block: "end" });
    }

    sendBtn.addEventListener('click', sendMessage);

    chatInput.addEventListener('keydown', function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            sendMessage();
        }
    });

    // Highlight active nav link
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        if (currentPath === linkPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
});