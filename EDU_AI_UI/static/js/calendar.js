$(document).ready(function () {
    // Initialize theme based on saved preference or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    $('html').attr('data-theme', savedTheme);
    $('.theme-toggle input').prop('checked', savedTheme === 'dark');

    // Navigation fade effect
    $('a.nav-link').click(function (e) {
        e.preventDefault();
        const url = $(this).attr('href');
        $('table').fadeOut(300, function () {
            window.location.href = url;
        });
    });

    // Click handler for each calendar day
    $('.calendar td').click(function () {
        const $eventsList = $(this).find('.events-list');
        const $eventItems = $eventsList.find('.event-item');
        const day = $(this).find('.day-number').text();

        if ($eventItems.length > 0) {
            const events = $eventItems.map(function () {
                return $(this).text();
            }).get();
            showDialog(events, day);
        }
    });

    // Theme toggle handler
    $('.theme-toggle input').change(function () {
        const isDark = $(this).is(':checked');
        const theme = isDark ? 'dark' : 'light';
        
        $('html').attr('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Update logo and nav icons based on theme
        updateIcons(theme);
    });

    // Function to update icons based on theme
    function updateIcons(theme) {
        $('.nav-icon').each(function () {
            const $img = $(this);
            const lightSrc = $img.data('light-src');
            const darkSrc = $img.data('dark-src');
            $img.attr('src', theme === 'dark' ? darkSrc : lightSrc);
        });
    }

    // Initial icon update
    updateIcons(savedTheme);

    // Function to show dialog box
    function showDialog(events, day) {
        const $dialogOverlay = $('<div class="dialog-overlay"></div>');
        const $dialogBox = $(`
            <div class="dialog-box">
                <span class="close-btn">×</span>
                <h3>Events for Day ${day}</h3>
                <ul>${events.map(event => `<li>${event}</li>`).join('')}</ul>
            </div>
        `);

        $dialogOverlay.append($dialogBox);
        $('body').append($dialogOverlay);
        $dialogOverlay.fadeIn(200);

        // Close dialog
        $dialogBox.find('.close-btn').click(function () {
            $dialogOverlay.fadeOut(200, function () {
                $dialogOverlay.remove();
            });
        });

        // Close on overlay click
        $dialogOverlay.click(function (e) {
            if (e.target === this) {
                $dialogOverlay.fadeOut(200, function () {
                    $dialogOverlay.remove();
                });
            }
        });
    }
});