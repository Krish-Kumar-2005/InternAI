import re
import pdfplumber
from io import BytesIO

def extract_text_from_pdf(file_content: bytes) -> str:
    text = ""
    try:
        with pdfplumber.open(BytesIO(file_content)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        print(f"⚠️ PDFPlumber failed: {e}")
        try:
            text = file_content.decode("utf-8", errors="ignore")
        except:
            return ""
    return text

def find_github_link(text: str) -> str:
    """
    Finds the best GitHub link, fixing severe PDF splitting issues.
    Example: 
    "github.com/Krish-kumar-
     2005" 
    becomes "github.com/Krish-kumar-2005"
    """
    if not text: return None

    # ---------------------------------------------------------
    # 🔥 STEP 1: AGGRESSIVE CLEANING (THE FIX)
    # ---------------------------------------------------------
    
    # 1. Merge hyphenated words split across lines
    # Matches: hyphen (-), optional spaces (\s*), newline (\n), optional spaces (\s*)
    # Replaces with: just hyphen (-)
    clean_text = re.sub(r'-\s*\n\s*', '-', text)

    # 2. Merge non-hyphenated URLs split across lines (rare but happens)
    # If a line ends with "github.com/" and next line starts with text
    clean_text = re.sub(r'(github\.com/)\s*\n\s*', r'\1', clean_text)

    # 3. Remove spaces inside the domain
    clean_text = re.sub(r'github\s*\.\s*com', 'github.com', clean_text, flags=re.IGNORECASE)

    # 4. Remove spaces after the slash
    clean_text = re.sub(r'github\.com/\s+', 'github.com/', clean_text, flags=re.IGNORECASE)

    # ---------------------------------------------------------
    # 🔥 STEP 2: STRICT REGEX
    # ---------------------------------------------------------
    
    # This regex looks for standard GitHub URLs
    pattern = r'(?:https?://)?(?:www\.)?github\.com/([a-zA-Z0-9\-_]+)(?:/([a-zA-Z0-9\-_]+))?'
    
    matches = re.findall(pattern, clean_text, re.IGNORECASE)
    
    best_link = None

    for match in matches:
        username = match[0]
        repo = match[1] if len(match) > 1 and match[1] else None

        # Filter trash matches
        if username.lower() in ['site', 'com', 'org', 'net', 'io', 'pages', 'master', 'main', 'blob']:
            continue
        
        # Prefer deep links (repo) over profile links
        if repo:
            # Clean up potential trailing punctuation from the repo name
            repo = re.sub(r'[.,;)]$', '', repo) 
            best_link = f"https://github.com/{username}/{repo}"
            break 
        
        if not best_link:
            best_link = f"https://github.com/{username}"

    return best_link