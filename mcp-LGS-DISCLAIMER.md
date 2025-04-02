# Implementation Notes
**Legal Basis & Purpose Limitation:**
Always specify a valid legal basis for scraping under GDPR
Document the specific purpose for which data is collected
Ensure the purpose is legitimate and necessary

**Data Minimization:**
Only collect data elements necessary for your stated purpose
Anonymize or pseudonymize personal data whenever possible
Use the containsPersonalData flag to track which elements contain personal information

**Technical & Organizational Measures:**
Implement encryption for data storage and transfer
Set up access controls for scraped data
Document all processing in the processingLog for accountability

**Respect for Website Terms:**
Always check robots.txt before scraping
Review the website's terms of service
Document compliance with these policies in the complianceInfo section

**Retention Policy:**
### Implement automated deletion after the retention period expires
## **Only keep data as long as necessary for the stated purpose**

# **Example scraper output**
```
const scrapingResult = {
  "metadata": {
    "operationId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "timestamp": "2025-04-02T14:28:31.248Z",
    "sourceUrl": "https://example.com/blog",
    "sourceDomain": "example.com",
    "legalBasis": "legitimate_interest",
    "retentionPeriod": "30 days",
    "processingPurpose": "Market research on product pricing trends"
  },
  "complianceInfo": {
    "robotsTxtChecked": true,
    "robotsTxtAllows": true,
    "termsChecked": true,
    "termsAllowsScraping": true,
    "personalDataPresent": false,
    "dataMinimized": true,
    "copyrightNotice": "© 2025 Example Company",
    "dpoPreviouslyNotified": true
  },
  "scrapedData": {
    "contentType": "article",
    "elements": [
      {
        "elementType": "title",
        "data": "2025 Market Trends in Technology",
        "containsPersonalData": false,
        "dataCategory": "none"
      },
      {
        "elementType": "author",
        "data": "[REDACTED]",
        "containsPersonalData": true,
        "dataCategory": "pseudonymized",
        "processingJustification": "Author information replaced with [REDACTED] marker"
      },
      {
        "elementType": "price",
        "data": "€499",
        "containsPersonalData": false,
        "dataCategory": "none"
      }
    ],
    "structuredData": {
      "datePublished": "2025-03-30",
      "category": "Technology"
    }
  },
  "processingLog": [
    {
      "timestamp": "2025-04-02T14:28:30.100Z",
      "action": "robots_txt_check",
      "details": "Checked robots.txt for scraping permissions",
      "automatedDecision": true
    },
    {
      "timestamp": "2025-04-02T14:28:30.200Z",
      "action": "personal_data_detection",
      "details": "Identified author name as personal data",
      "automatedDecision": true
    },
    {
      "timestamp": "2025-04-02T14:28:30.300Z",
      "action": "data_minimization",
      "details": "Redacted author name",
      "automatedDecision": true
    }
  ],
  "riskAssessment": {
    "riskLevel": "low",
    "dataProtectionImpact": "Minimal impact as personal data is pseudonymized",
    "mitigationMeasures": [
      "Author names redacted",
      "No contact information collected",
      "No user comments scraped"
    ]
  }
}
```