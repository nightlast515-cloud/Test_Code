const psl = require('psl');

const KNOWN_TRACKERS = {
    'google.com': { owner: 'Google', category: 'Various' },
    'google-analytics.com': { owner: 'Google', category: 'Analytics' },
    'googletagmanager.com': { owner: 'Google', category: 'Analytics' },
    'doubleclick.net': { owner: 'Google', category: 'Advertising' },
    'facebook.net': { owner: 'Facebook', category: 'Advertising' },
    'fbcdn.net': { owner: 'Facebook', category: 'CDN' },
    'amazon-adsystem.com': { owner: 'Amazon', category: 'Advertising' },
    'casalemedia.com': { owner: 'Index Exchange', category: 'Advertising' },
    'rubiconproject.com': { owner: 'Magnite', category: 'Advertising' },
    'openx.net': { owner: 'OpenX', category: 'Advertising' },
    'media.net': { owner: 'Media.net', category: 'Advertising' },
    'yahoo.com': { owner: 'Yahoo', category: 'Various' },
    'quantserve.com': { owner: 'Quantcast', category: 'Analytics' },
    'adsrvr.org': { owner: 'The Trade Desk', category: 'Advertising' },
    'demdex.net': { owner: 'Adobe', category: 'Analytics' },
    'turn.com': { owner: 'Amobee', category: 'Advertising' },
    'creativecdn.com': { owner: 'Creative CDN', category: 'CDN' },
    '3lift.com': { owner: 'TripleLift', category: 'Advertising' },
    'doubleverify.com': { owner: 'DoubleVerify', category: 'Analytics' },
};

function getThirdPartyInfo(domain) {
    const parsedDomain = psl.parse(domain);
    if (parsedDomain && parsedDomain.domain) {
        if (KNOWN_TRACKERS[parsedDomain.domain]) {
            return KNOWN_TRACKERS[parsedDomain.domain];
        }
    }
    return null;
}

module.exports = { getThirdPartyInfo };