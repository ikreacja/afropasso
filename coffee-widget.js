/*
 * AfroPasso floating support widget: collapsible "Postaw kawę" card.
 * Collapsed/expanded state is remembered per-browser via localStorage so a
 * visitor who minimizes it doesn't have to do so again on their next visit.
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'afropasso-coffee-collapsed';
    var widget = document.getElementById('coffee-widget');
    if (!widget) return;

    var collapseButton = widget.querySelector('.coffee-widget-collapse');
    var toggleButton = widget.querySelector('.coffee-widget-toggle');

    var collapsed = false;
    try {
        collapsed = window.localStorage.getItem(STORAGE_KEY) === 'true';
    } catch (e) {
        collapsed = false;
    }
    widget.classList.toggle('is-collapsed', collapsed);

    function setCollapsed(value) {
        widget.classList.toggle('is-collapsed', value);
        try {
            window.localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
        } catch (e) {
            /* localStorage unavailable (private mode, etc.) — state just won't persist */
        }
    }

    if (collapseButton) {
        collapseButton.addEventListener('click', function () {
            setCollapsed(true);
        });
    }

    if (toggleButton) {
        toggleButton.addEventListener('click', function () {
            setCollapsed(false);
        });
    }
})();
