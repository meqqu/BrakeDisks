const fs = require('fs');
const path = require('path');

const files = [
  'index.html',
  'about.html',
  'articles.html',
  'product.html',
  'checkout.html',
  'account.html',
  'reset-password.html',
  'admin.html',
  'users.html',
  'settings.html'
];

const siteUrl = 'https://brakediscs.com';

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  const isPublic = !['admin.html', 'users.html', 'settings.html', 'account.html'].includes(file);
  
  let pageTitle = "Brake Discs Store";
  let pageDesc = "Motorcycle brake discs online store. Brand filtering, quick search, modern design.";
  
  if (file === 'about.html') {
    pageTitle = "About Us | Brake Discs Store";
    pageDesc = "Learn more about Brake Discs Store, our mission, and our high-quality motorcycle brake discs.";
  } else if (file === 'articles.html') {
    pageTitle = "Articles & Reviews | Brake Discs Store";
    pageDesc = "Read our latest articles, reviews, and technical guides about motorcycle brake discs.";
  } else if (file === 'product.html') {
    pageTitle = "Product Details | Brake Discs Store";
    pageDesc = "View detailed information, specifications, and compatibility for our brake discs.";
  } else if (file === 'checkout.html') {
    pageTitle = "Checkout | Brake Discs Store";
    pageDesc = "Securely complete your purchase at Brake Discs Store.";
  } else if (file === 'reset-password.html') {
    pageTitle = "Reset Password | Brake Discs Store";
  }
  
  // Ensure <title>
  if (!content.includes('<title>')) {
    content = content.replace('</head>', `  <title>${pageTitle}</title>\n</head>`);
  }
  
  // Ensure meta description
  if (!content.includes('<meta name="description"')) {
    content = content.replace('</head>', `  <meta name="description" content="${pageDesc}" />\n</head>`);
  }
  
  // Canonical and OG for public pages
  if (isPublic) {
    const pageUrl = file === 'index.html' ? siteUrl + '/' : siteUrl + '/' + file;
    
    if (!content.includes('<link rel="canonical"')) {
      content = content.replace('</head>', `  <link rel="canonical" href="${pageUrl}" />\n</head>`);
    }
    
    if (!content.includes('<meta property="og:title"')) {
      const ogTags = `
  <meta property="og:title" content="${pageTitle}" />
  <meta property="og:description" content="${pageDesc}" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="MotoBrake Discs" />
`;
      content = content.replace('</head>', ogTags + '</head>');
    }
  } else {
    // For non-public pages, add noindex
    if (!content.includes('<meta name="robots" content="noindex')) {
       content = content.replace('</head>', `  <meta name="robots" content="noindex, nofollow" />\n</head>`);
    }
  }

  // Common SEO: favicon
  if (!content.includes('<link rel="icon"')) {
    content = content.replace('</head>', `  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🏍️</text></svg>">\n</head>`);
  }

  fs.writeFileSync(filePath, content, 'utf-8');
});

console.log('SEO tags injected.');
