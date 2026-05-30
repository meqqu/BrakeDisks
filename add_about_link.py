import os
import re

for file in ["index.html", "product.html", "checkout.html", "account.html"]:
    if os.path.exists(file):
        with open(file, "r") as f:
            content = f.read()
            
        # Add to top nav
        if file == "index.html":
            # index.html has id="homeLink"
            new_content = re.sub(
                r'<a href="#" class="nav-link" id="homeLink">Home</a>',
                '<a href="#" class="nav-link" id="homeLink">Home</a>\n      <a href="/about.html" class="nav-link">About Us</a>',
                content
            )
        elif file in ["product.html", "checkout.html"]:
            # these have <a href="/index.html" class="nav-link">Home</a>
            new_content = re.sub(
                r'<a href="/index.html" class="nav-link">Home</a>',
                '<a href="/index.html" class="nav-link">Home</a>\n      <a href="/about.html" class="nav-link">About Us</a>',
                content
            )
        elif file == "account.html":
            # account.html has <a href="/index.html" class="nav-link">← Return to Shop</a>
            new_content = re.sub(
                r'<a href="/index.html" class="nav-link">← Return to Shop</a>',
                '<a href="/index.html" class="nav-link">← Return to Shop</a>\n      <a href="/about.html" class="nav-link">About Us</a>',
                content
            )
        
        # Add to footer
        if file == "index.html":
            new_content = re.sub(
                r'<li><a href="#" id="footHome">Home</a></li>',
                '<li><a href="#" id="footHome">Home</a></li>\n          <li><a href="/about.html">About Us</a></li>',
                new_content
            )
            
        if new_content != content:
            with open(file, "w") as f:
                f.write(new_content)
            print(f"Updated {file}")
