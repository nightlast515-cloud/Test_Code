const GDPR_PERSONAL_DATA_TYPES = ['Email', 'Name', 'Phone', 'IpAddress', 'DeviceId', 'Financial', 'Health', 'SensitivePersonalData', 'CookieId'];
const CCPA_PERSONAL_INFORMATION_TYPES = [...GDPR_PERSONAL_DATA_TYPES, 'PostalAddress', 'Behavioral'];

function mapToRegulations(data, type) {
    const regulations = [];

    if (type === 'cookie') {
        if (GDPR_PERSONAL_DATA_TYPES.some(pii => data.classifications.map(c => c.type).includes(pii))) {
            regulations.push({
                name: 'GDPR',
                reason: `Cookie contains personal data (${data.classifications.map(c => c.type).join(', ')}), as defined in GDPR Art. 4(1).`
            });
        }
        if (CCPA_PERSONAL_INFORMATION_TYPES.some(pii => data.classifications.map(c => c.type).includes(pii))) {
            regulations.push({
                name: 'CCPA/CPRA',
                reason: `Cookie contains personal information (${data.classifications.map(c => c.type).join(', ')}), as defined under CCPA/CPRA.`
            });
        }
        if (data.isPersistent) {
             regulations.push({
                name: 'PECR',
                reason: `Persistent cookie detected. PECR requires user consent for storing information on a user's device.`
            });
        }
    } else if (type === 'request') {
        const dataTypes = Object.values(data.classifiedFields).flatMap(f => f.classifications.map(c => c.type));
        if (GDPR_PERSONAL_DATA_TYPES.some(pii => dataTypes.includes(pii))) {
            let reason = `Request body contains personal data (${dataTypes.join(', ')}), as defined in GDPR Art. 4(1).`;
            if (data.thirdPartyInfo) {
                reason += ` Transfer to ${data.thirdPartyInfo.owner} may require a legal basis for cross-border data transfer.`
            }
            regulations.push({
                name: 'GDPR',
                reason
            });
        }
        if (CCPA_PERSONAL_INFORMATION_TYPES.some(pii => dataTypes.includes(pii))) {
             let reason = `Request body contains personal information (${dataTypes.join(', ')}), as defined under CCPA/CPRA.`;
             if (data.thirdPartyInfo && ['Advertising', 'Analytics'].includes(data.thirdPartyInfo.category)) {
                reason += ' This may be considered a "sale" or "sharing" of data.'
             }
            regulations.push({
                name: 'CCPA/CPRA',
                reason
            });
        }
    }

    return regulations;
}

module.exports = { mapToRegulations };