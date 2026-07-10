'use strict';
const { validateEvent, slugifyEvent } = require('./add-event.js');

function mapSubmissionToEvent(sub) {
    const event = {
        id: slugifyEvent(sub.title || '', sub.city || '', sub.date_start || ''),
        title: sub.title,
        type: sub.type,
        styles: Array.isArray(sub.styles) ? sub.styles : [],
        city: sub.city,
        date_start: sub.date_start,
        url: sub.url,
        featured: false,
        organizer: sub.organizer || '',
        source: 'zgloszenie'
    };
    if (sub.date_end) event.date_end = sub.date_end;
    if (sub.time) event.time = sub.time;
    if (sub.venue) event.venue = sub.venue;
    if (sub.price) event.price = sub.price;
    return event;
}

function validateSubmission(sub, knownStyleSlugs) {
    // Reuse event-level checks (title/city/url required, type enum, date format, known style slugs).
    const errors = validateEvent(mapSubmissionToEvent(sub), knownStyleSlugs, []);
    if (!Array.isArray(sub.styles) || sub.styles.length === 0) {
        errors.push('Wybierz przynajmniej jeden styl tańca');
    }
    if (!sub.contactEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(sub.contactEmail)) {
        errors.push('Podaj poprawny e-mail kontaktowy');
    }
    return errors;
}

module.exports = { validateSubmission, mapSubmissionToEvent };
