import re
import requests

def extract_github_links(resume_text):
    """
    Finds GitHub repository URLs in the resume text.
    """
    if not resume_text:
        return []
    # Regex to find github.com/username/repo
    pattern = r"https?://github\.com/[\w-]+/[\w-]+"
    links = re.findall(pattern, resume_text)
    return list(set(links))  # Remove duplicates

def fetch_repo_content(github_url):
    """
    Fetches file names and code snippets from a public GitHub Repo.
    """
    try:
        # 1. Parse Owner/Repo from URL
        parts = github_url.rstrip("/").split("/")
        if len(parts) < 2: return None
        owner, repo = parts[-2], parts[-1]

        # 2. Call GitHub API (Get file list)
        api_url = f"https://api.github.com/repos/{owner}/{repo}/contents"
        # Note: For production, add headers={'Authorization': 'token YOUR_GITHUB_TOKEN'}
        response = requests.get(api_url, timeout=5)
        
        if response.status_code != 200:
            return f"Error accessing repo: {response.status_code} (Might be private)"

        files = response.json()
        if not isinstance(files, list):
            return "Repo empty or not accessible."

        code_summary = f"--- GITHUB REPO: {repo} ---\n"

        # 3. Filter for relevant code files (JS, TS, Python, etc.)
        relevant_files = [
            f for f in files 
            if isinstance(f, dict) and f.get('type') == 'file' and 
            f.get('name', '').endswith(('.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.go'))
        ]

        # 4. Fetch content of top 3 most relevant files to save AI context
        count = 0
        for file in relevant_files:
            if count >= 3: break
            
            # Prioritize logic files (controllers, auth, api, etc.)
            if any(k in file['name'].lower() for k in ['auth', 'login', 'server', 'app', 'index', 'user', 'controller', 'api']):
                try:
                    file_resp = requests.get(file['download_url'], timeout=3)
                    content = file_resp.text[:2000] # Limit chars per file
                    code_summary += f"\nFILE: {file['name']}\nCODE:\n{content}\n"
                    count += 1
                except:
                    continue

        if count == 0:
            return "Repo found, but no relevant source code files could be read."
            
        return code_summary

    except Exception as e:
        return f"GitHub Scan Failed: {str(e)}"