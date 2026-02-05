import os.path
import base64
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from bs4 import BeautifulSoup

# Define Scope (Read-only access to Gmail)
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

def get_gmail_service():
    """Authenticates the user and returns the Gmail API Service."""
    creds = None
    
    # 1. Load existing token if available
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    
    # 2. If no valid token, ask user to login
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES) # Ensure this file exists in backend/
            creds = flow.run_local_server(port=0)
        
        # Save the token for next time
        with open('token.json', 'w') as token:
            token.write(creds.to_json())

    return build('gmail', 'v1', credentials=creds)

def fetch_job_emails_google(limit=5):
    """
    Fetches emails using Official Gmail API.
    """
    service = get_gmail_service()
    job_emails = []

    try:
        # 1. Search for emails with 'Job' or 'Hiring' in subject
        # "q" parameter is the search query like in Gmail search bar
        results = service.users().messages().list(
            userId='me', 
            q='subject:(Job OR Hiring OR Opportunity) is:unread',
            maxResults=limit
        ).execute()
        
        messages = results.get('messages', [])

        if not messages:
            print("No new job emails found.")
            return []

        # 2. Loop through emails and get details
        for msg in messages:
            msg_data = service.users().messages().get(userId='me', id=msg['id']).execute()
            payload = msg_data['payload']
            headers = payload.get('headers', [])

            # Extract Subject
            subject = "No Subject"
            for h in headers:
                if h['name'] == 'Subject':
                    subject = h['value']
                    break

            # Extract Body (Decode Base64)
            body_data = ""
            if 'parts' in payload:
                for part in payload['parts']:
                    if part['mimeType'] == 'text/plain':
                        body_data = part['body'].get('data', '')
                        break
            else:
                body_data = payload['body'].get('data', '')

            if body_data:
                decoded_bytes = base64.urlsafe_b64decode(body_data)
                text_content = decoded_bytes.decode('utf-8')
                
                # Clean up text
                job_emails.append({
                    "subject": subject,
                    "body": text_content[:2000] # Limit for AI
                })
                
                # OPTIONAL: Mark as read so we don't fetch again
                # service.users().messages().modify(userId='me', id=msg['id'], body={'removeLabelIds': ['UNREAD']}).execute()

        return job_emails

    except Exception as e:
        print(f"❌ Gmail API Error: {e}")
        return []