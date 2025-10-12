const { chromium } = require('playwright');
const crypto = require('crypto-js');
const papaparse = require('papaparse');
const axios = require('axios');
const fs = require('fs');
const { classifyData } = require('./dataClassifier.js');
const { getThirdPartyInfo } = require('./thirdPartyMapper.js');
const { mapToRegulations } = require('./complianceMapper.js');

async function scan(url) {
    if (!url) {
        console.error('Please provide a URL to scan.');
        process.exit(1);
    }
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log(`Scanning ${url}...`);

    const requests = new Map();
    page.on('request', request => {
        requests.set(request.url(), request);
    });

    const capturedRequests = [];
    page.on('response', async response => {
        const request = requests.get(response.url());
        if (request && request.method() === 'POST') {
            capturedRequests.push({
                url: request.url(),
                method: request.method(),
                headers: request.headers(),
                postData: request.postData(),
                status: response.status(),
                frame: () => ({ page: () => page })
            });
        }
    });

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(5000); // Wait for 5 seconds for dynamic content
    } catch (error) {
        console.error(`Error navigating to ${url}:`, error);
        await browser.close();
        return;
    }

    const links = await page.$$eval('a', as => as.map(a => a.href));
    const uniqueLinks = [...new Set(links)].filter(link => link.startsWith('http'));

    const allCookies = [];
    const allRequests = [];

    async function processPage(page) {
        const pageUrl = page.url();
        const cookies = await context.cookies(pageUrl);
        allCookies.push(...cookies.map(c => ({ ...c, pageUrl })));

        for (const request of capturedRequests) {
            if (request.frame().page() === page) {
                allRequests.push(request);
            }
        }
    }

    await processPage(page);

    for (let i = 0; i < Math.min(uniqueLinks.length, 5); i++) {
        const newPage = await context.newPage();
        try {
            await newPage.goto(uniqueLinks[i], { waitUntil: 'domcontentloaded', timeout: 60000 });
            await newPage.waitForTimeout(5000);
            await processPage(newPage);
        } catch (error) {
            console.error(`Error navigating to ${uniqueLinks[i]}:`, error);
        } finally {
            await newPage.close();
        }
    }

    const processedCookies = [];
    for (const cookie of allCookies) {
        const isThirdParty = !cookie.domain.includes(new URL(url).hostname);
        const isPersistent = cookie.expires > 0 && (cookie.expires * 1000 - Date.now()) > 30 * 24 * 60 * 60 * 1000;
        const hashedValue = crypto.SHA256(cookie.value).toString();
        const classifications = classifyData(cookie.name, cookie.value);
        const regulations = mapToRegulations({ ...cookie, classifications, isThirdParty, isPersistent }, 'cookie');
        processedCookies.push({ ...cookie, isThirdParty, isPersistent, hashedValue, classifications, regulations });
    }

    const processedRequests = [];
    for (const request of allRequests) {
        let postData = request.postData;
        const classifiedFields = {};
        if (postData) {
            try {
                const parsedData = JSON.parse(postData);
                for (const key in parsedData) {
                    const classifications = classifyData(key, parsedData[key]);
                    classifiedFields[key] = {
                        classifications,
                        value: parsedData[key],
                    };
                    if (key.toLowerCase().includes('password')) {
                        parsedData[key] = `hashed_value: ${crypto.SHA256(parsedData[key]).toString()}`;
                    }
                }
                postData = JSON.stringify(parsedData);
            } catch (e) {
                // Not a JSON body, do nothing
            }
        }
        const requestUrl = new URL(request.url);
        const domain = requestUrl.hostname;
        const thirdPartyInfo = getThirdPartyInfo(domain);
        const regulations = mapToRegulations({ classifiedFields, thirdPartyInfo }, 'request');
        processedRequests.push({ ...request, postData, classifiedFields, thirdPartyInfo, regulations });
    }

    generateMainCsv(processedCookies, processedRequests, url);
    generateThirdPartyCsv(processedRequests);
    generateSummary(processedCookies, processedRequests);

    console.log('Scan complete. CSV and summary files generated.');

    await browser.close();
}

function generateMainCsv(cookies, requests, pageUrl) {
    const rows = [];
    const now = new Date().toISOString();

    for (const cookie of cookies) {
        rows.push({
            timestamp: now,
            row_type: 'cookie',
            page_url: pageUrl,
            cookie_name: cookie.name,
            cookie_domain: cookie.domain,
            cookie_flags: `secure: ${cookie.secure}, httpOnly: ${cookie.httpOnly}, sameSite: ${cookie.sameSite}`,
            cookie_hashed_value: cookie.hashedValue,
            request_url: '',
            request_destination_origin: '',
            http_status: '',
            content_type: '',
            request_method: '',
            request_fields: '',
            classified_data_types: cookie.classifications.map(c => c.type).join(', '),
            third_party_owner: '',
            third_party_country: '',
            cross_border: '',
            potential_regulations: cookie.regulations.map(r => r.name).join(', '),
            compliance_reasoning: cookie.regulations.map(r => r.reason).join('; '),
            remediation_suggestion: '',
        });
    }

    for (const request of requests) {
        const url = new URL(request.url);
        rows.push({
            timestamp: now,
            row_type: 'post_request',
            page_url: pageUrl,
            cookie_name: '',
            cookie_domain: '',
            cookie_flags: '',
            cookie_hashed_value: '',
            request_url: request.url,
            request_destination_origin: url.origin,
            http_status: request.status,
            content_type: request.headers['content-type'],
            request_method: request.method,
            request_fields: JSON.stringify(request.classifiedFields),
            classified_data_types: Object.values(request.classifiedFields).flatMap(f => f.classifications.map(c => c.type)).join(', '),
            third_party_owner: request.thirdPartyInfo ? request.thirdPartyInfo.owner : '',
            third_party_country: '', // Requires geo-ip lookup
            cross_border: '', // Requires geo-ip lookup
            potential_regulations: request.regulations.map(r => r.name).join(', '),
            compliance_reasoning: request.regulations.map(r => r.reason).join('; '),
            remediation_suggestion: '',
        });
    }

    const csv = papaparse.unparse(rows, { header: true });
    fs.writeFileSync('scan_results.csv', csv);
}

function generateThirdPartyCsv(requests) {
    const thirdPartyDomains = {};
    const now = new Date().toISOString();

    for (const request of requests) {
        if (request.thirdPartyInfo) {
            const domain = new URL(request.url).hostname;
            if (!thirdPartyDomains[domain]) {
                thirdPartyDomains[domain] = {
                    ...request.thirdPartyInfo,
                    first_seen: now,
                };
            }
        }
    }

    const rows = Object.entries(thirdPartyDomains).map(([domain, info]) => ({
        domain,
        owner: info.owner,
        category: info.category,
        first_seen: info.first_seen,
    }));

    const csv = papaparse.unparse(rows, { header: true });
    fs.writeFileSync('third_party_map.csv', csv);
}

function generateSummary(cookies, requests) {
    const findings = [];

    // High-risk: Cookies with sensitive data
    for (const cookie of cookies) {
        if (cookie.classifications.some(c => ['Email', 'Name', 'Phone', 'Financial', 'Health', 'SensitivePersonalData'].includes(c.type))) {
            findings.push({
                risk: 'High',
                description: `Cookie "${cookie.name}" contains sensitive data of type: ${cookie.classifications.map(c => c.type).join(', ')}.`,
                reference: `Cookie on page ${cookie.pageUrl}`,
            });
        }
    }

    // High-risk: POST requests with sensitive data to third parties
    for (const request of requests) {
        const dataTypes = Object.values(request.classifiedFields).flatMap(f => f.classifications.map(c => c.type));
        if (request.thirdPartyInfo && dataTypes.some(d => ['Email', 'Name', 'Phone', 'Financial', 'Health', 'SensitivePersonalData'].includes(d))) {
            findings.push({
                risk: 'High',
                description: `POST request to ${request.url} sends sensitive data (${dataTypes.join(', ')}) to a third party: ${request.thirdPartyInfo.owner}.`,
                reference: `Request from page ${request.frame().page().url()}`,
            });
        }
    }

    // Medium-risk: Persistent third-party cookies
    for (const cookie of cookies) {
        if (cookie.isThirdParty && cookie.isPersistent) {
            findings.push({
                risk: 'Medium',
                description: `Persistent third-party cookie "${cookie.name}" from domain ${cookie.domain}.`,
                reference: `Cookie on page ${cookie.pageUrl}`,
            });
        }
    }

    const summary = `
# Scan Summary

## Top 10 Highest-Risk Findings
${findings.sort((a, b) => (a.risk === 'High' ? -1 : 1)).slice(0, 10).map((f, i) => `${i + 1}. [${f.risk}] ${f.description} (Reference: ${f.reference})`).join('\n')}
`;

    fs.writeFileSync('scan_summary.md', summary);
}

const targetUrl = process.argv[2];
scan(targetUrl);