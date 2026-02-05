import requests
from bs4 import BeautifulSoup
import json
import re

def fetch_job_content(url: str):
    """
    Fetches job content. Tries 3 strategies:
    1. JSON-LD (Hidden SEO data - Best for LinkedIn/Indeed)
    2. Meta Tags (OpenGraph)
    3. Raw Text (Fallback)
    """
    try:
        # Use a "Real Browser" User-Agent to avoid immediate blocking
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.google.com/"
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200:
            return None

        soup = BeautifulSoup(response.text, "html.parser")

        # 🚀 STRATEGY 1: Check for JSON-LD (Hidden Structured Data)
        # This bypasses "Login Walls" because it's meant for Google's bots.
        json_ld_tags = soup.find_all("script", type="application/ld+json")
        
        for tag in json_ld_tags:
            try:
                data = json.loads(tag.string)
                # Sometimes it's a list of objects
                if isinstance(data, list):
                    data = data[0]
                
                # Check if it is actually a JobPosting
                if data.get("@type") == "JobPosting":
                    print("✅ Found JSON-LD Job Data!")
                    
                    # Clean HTML tags from description if present
                    raw_desc = data.get('description', '')
                    clean_desc = BeautifulSoup(raw_desc, "html.parser").get_text(separator="\n")
                    
                    # Return a pre-formatted string for your AI to read easily
                    return f"""
                    Title: {data.get('title')}
                    Company: {data.get('hiringOrganization', {}).get('name')}
                    Location: {data.get('jobLocation', {}).get('address', {}).get('addressLocality')}
                    Description: {clean_desc}
                    """
            except:
                continue

        # 🚀 STRATEGY 2: Fallback to Body Text (if JSON fails)
        # Remove junk elements that might be "Cookie Banners"
        for script in soup(["script", "style", "nav", "footer", "iframe", "header", "button"]):
            script.decompose()
        
        # Remove elements with "cookie" or "consent" in their class/id
        for div in soup.find_all("div"):
            if div.get("class") and any("cookie" in str(c).lower() for c in div.get("class")):
                div.decompose()

        text = soup.get_text(separator="\n")
        
        # Clean up whitespace
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        clean_text = '\n'.join(chunk for chunk in chunks if chunk)
        
        return clean_text[:4000] # Limit length
        
    except Exception as e:
        print(f"Import Error: {e}")
        return None