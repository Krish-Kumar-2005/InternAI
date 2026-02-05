from PyPDF2 import PdfReader
import docx
import io

def parse_resume(file):
    try:
        # Read file content into memory
        content = file.file.read()
        
        if file.filename.endswith(".pdf"):
            reader = PdfReader(io.BytesIO(content))
            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""
            return text

        elif file.filename.endswith(".docx"):
            doc = docx.Document(io.BytesIO(content))
            return " ".join([para.text for para in doc.paragraphs])

        else:
            raise ValueError("Unsupported file format. Please upload PDF or DOCX.")
    finally:
        # Always close the file pointer
        file.file.close()