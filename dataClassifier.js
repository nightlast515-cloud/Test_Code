const PII_DEFINITIONS = {
    Email: {
        regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
        confidence: 'high'
    },
    Phone: {
        regex: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
        confidence: 'medium'
    },
    IpAddress: {
        regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/,
        confidence: 'high'
    },
    CreditCard: {
        // This regex is a basic pattern and should be supplemented with a Luhn check for higher accuracy
        regex: /\b(?:\d[ -]*?){13,16}\b/,
        confidence: 'medium'
    },
    // Add more definitions as needed
};

function classifyData(key, value) {
    const classifications = [];

    if (key.toLowerCase().includes('password')) {
        classifications.push({ type: 'Password', confidence: 'high', heuristic: 'key_name' });
    }

    const valueStr = String(value);

    for (const type in PII_DEFINITIONS) {
        if (PII_DEFINITIONS[type].regex.test(valueStr)) {
            classifications.push({
                type,
                confidence: PII_DEFINITIONS[type].confidence,
                heuristic: `regex: ${PII_DEFINITIONS[type].regex}`
            });
        }
    }

    if (classifications.length === 0) {
        classifications.push({ type: 'Other', confidence: 'low', heuristic: 'none' });
    }

    return classifications;
}

module.exports = { classifyData };