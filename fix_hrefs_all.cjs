const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace anything that looks like href="..." id="navArticles"
  content = content.replace(/href="[^"]*"\s+(class="[^"]*"\s+)?id="navArticles"/g, 'href="/articles.html" $1id="navArticles"');
  content = content.replace(/id="navArticles"\s+href="[^"]*"/g, 'id="navArticles" href="/articles.html"');

  content = content.replace(/href="[^"]*"\s+(class="[^"]*"\s+)?id="navUsers"/g, 'href="/users.html" $1id="navUsers"');
  content = content.replace(/id="navUsers"\s+href="[^"]*"/g, 'id="navUsers" href="/users.html"');

  content = content.replace(/href="[^"]*"\s+(class="[^"]*"\s+)?id="navSettings"/g, 'href="/settings.html" $1id="navSettings"');
  content = content.replace(/id="navSettings"\s+href="[^"]*"/g, 'id="navSettings" href="/settings.html"');

  content = content.replace(/href="[^"]*"\s+(class="[^"]*"\s+)?id="navMyAccount"/g, 'href="/account.html?tab=mfgInfo" $1id="navMyAccount"');
  content = content.replace(/id="navMyAccount"\s+href="[^"]*"/g, 'id="navMyAccount" href="/account.html?tab=mfgInfo"');
  
  fs.writeFileSync(file, content);
}
console.log('Fixed all hrefs.');
