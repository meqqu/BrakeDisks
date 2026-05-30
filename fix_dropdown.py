import os
import re

standard_dropdown = """        <div id="userDropdown" class="user-dropdown" style="display:none; position: absolute; top:100%; right:0; background: linear-gradient(135deg, #181d33, #0c0e1a); min-width: 220px; border-radius: var(--radius); padding: 0.5rem; box-shadow: 0 10px 40px rgba(0,0,0,0.6); z-index: 2101; border: 1px solid rgba(255,255,255,0.08); flex-direction: column; gap: 0.2rem;">
          <div id="userInfo" class="dropdown-header" style="display:none; padding: 0.6rem; font-weight: bold; border-bottom: 1px solid rgba(255, 255, 255, 0.08); margin-bottom: 0.2rem; color: var(--color-primary-start);">Hello, Guest</div>
          <button id="openLoginBtn" class="dropdown-item" style="display:none; padding: 0.6rem 0.8rem; text-decoration: none; border-radius: var(--radius); cursor: pointer; background: none; border: none; text-align: left; font-size: 0.95rem;">Sign In / Register</button>
          <a href="/account.html" class="dropdown-item" id="accountNav" style="display:none; padding: 0.6rem 0.8rem; text-decoration: none; border-radius: var(--radius); cursor: pointer; background: none; border: none; text-align: left; font-size: 0.95rem;">👤 Profile</a>
          <a href="/admin.html" class="dropdown-item admin-link" id="adminNav" style="display:none; color:var(--color-primary-start); padding: 0.6rem 0.8rem; text-decoration: none; border-radius: var(--radius); cursor: pointer; background: none; border: none; text-align: left; font-size: 0.95rem;">🏭 Warehouse</a>
          <a href="/articles.html" class="dropdown-item" id="navArticles" style="display:none; color:#ff007f; padding: 0.6rem 0.8rem; text-decoration: none; border-radius: var(--radius); cursor: pointer; background: none; border: none; text-align: left; font-size: 0.95rem;">📝 Articles</a>
          <a href="/users.html" class="dropdown-item" id="navUsers" style="display:none; color:#00b0ff; padding: 0.6rem 0.8rem; text-decoration: none; border-radius: var(--radius); cursor: pointer; background: none; border: none; text-align: left; font-size: 0.95rem;">👤 Users</a>
          <a href="/settings.html" class="dropdown-item" id="navSettings" style="display:none; color:#00e676; padding: 0.6rem 0.8rem; text-decoration: none; border-radius: var(--radius); cursor: pointer; background: none; border: none; text-align: left; font-size: 0.95rem;">⚙️ Site Settings</a>
          <button id="logoutBtn" class="dropdown-item" style="display:none; text-align:left; width: 100%; color: var(--color-text); padding: 0.6rem 0.8rem; border-radius: var(--radius); cursor: pointer; background: none; border: none; font-size: 0.95rem;">Logout</button>
        </div>"""

for file in os.listdir("."):
    if file.endswith(".html"):
        with open(file, "r") as f:
            content = f.read()
        
        # Find the <div id="userDropdown"...> and replace it until its closing </div>
        # Use regex to find the block
        pattern = r'<div id="userDropdown"[^>]*>.*?</div>\s*</div>\s*</nav>'
        
        # Wait, matching until </div> is tricky with nested divs.
        # But we know what's in the file.
        # We can just replace from <div id="userDropdown" to the next </div>\s*</div>\s*</nav>
        # Let's do a simpler regex: <div id="userDropdown".*?logoutBtn.*?</button>\s*</div>
        
        pattern = r'<div id="userDropdown"[^>]*>.*?logoutBtn.*?</button>\s*</div>'
        
        new_content = re.sub(pattern, standard_dropdown, content, flags=re.DOTALL)
        
        if new_content != content:
            with open(file, "w") as f:
                f.write(new_content)
            print(f"Updated {file}")
