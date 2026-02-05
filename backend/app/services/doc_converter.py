import mammoth
import io
import os
import tempfile
from pdf2docx import Converter
from docx import Document
from bs4 import BeautifulSoup
import pypandoc

# Global storage for "Source of Truth" files (In production, use Redis/S3)
TEMP_FILE_STORE = {}

def ensure_pandoc_installed():
    try:
        pypandoc.get_pandoc_version()
    except OSError:
        from pypandoc.pandoc_download import download_pandoc
        download_pandoc()

def get_temp_storage_path(filename):
    return os.path.join(tempfile.gettempdir(), f"source_{filename}")

# ---------------------------------------------------------
# 1. NEW PIPELINE (Source of Truth -> Patching)
# ---------------------------------------------------------

def convert_pdf_to_docx_stream(pdf_bytes, original_filename):
    """
    Converts PDF to DOCX using pdf2docx to create the 'Source of Truth'.
    Saves the DOCX to a temp file for later patching.
    """
    try:
        # 1. Save PDF to temp
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
            temp_pdf.write(pdf_bytes)
            temp_pdf_path = temp_pdf.name

        # 2. Define output DOCX path (Persistent Temp)
        temp_docx_path = get_temp_storage_path(original_filename)

        # 3. Convert Layout (PDF -> Source DOCX)
        cv = Converter(temp_pdf_path)
        cv.convert(temp_docx_path, start=0, end=None)
        cv.close()

        # 4. Cleanup PDF input only
        if os.path.exists(temp_pdf_path):
            os.remove(temp_pdf_path)

        # 5. Read bytes to return for immediate processing if needed
        with open(temp_docx_path, "rb") as f:
            docx_bytes = f.read()

        return io.BytesIO(docx_bytes), temp_docx_path

    except Exception as e:
        print(f"❌ PDF to DOCX Error: {e}")
        raise e

def convert_docx_to_html(docx_file_object, original_filename):
    """
    Uses Mammoth to extract raw HTML for Tiptap.
    Crucially: Saves the input DOCX as the 'Source of Truth' for later patching.
    """
    try:
        # 1. Save the Source DOCX (if it came from upload, not conversion)
        temp_docx_path = get_temp_storage_path(original_filename)
        
        # Write the fresh upload to our temp store
        with open(temp_docx_path, "wb") as f:
            f.write(docx_file_object.getvalue())

        # 2. Convert to HTML for Editor
        style_map = """
        p[style-name='Heading 1'] => h1:fresh
        p[style-name='Heading 2'] => h2:fresh
        p[style-name='Heading 3'] => h3:fresh
        p[style-name='List Paragraph'] => ul > li:fresh
        """
        result = mammoth.convert_to_html(docx_file_object, style_map=style_map)
        html = result.value
        
        return f'<div class="resume-layout-wrapper">{html}</div>'

    except Exception as e:
        print(f"❌ DOCX to HTML Error: {e}")
        return f"<p>Error converting document: {e}</p>"

def patch_docx_with_html(original_filename, html_content):
    """
    🔥 THE GOLD STANDARD EXPORT
    Loads the ORIGINAL DOCX (Source of Truth) and replaces text runs 
    with the edited content. Preserves 100% of layout.
    """
    try:
        source_path = get_temp_storage_path(original_filename)
        
        if not os.path.exists(source_path):
            print(f"❌ Source file not found: {source_path}")
            return None

        # 1. Parse Tiptap HTML
        soup = BeautifulSoup(html_content, "html.parser")
        edited_texts = [text for text in soup.stripped_strings]

        # 2. Load Original DOCX
        doc = Document(source_path)

        # 3. Patch Document
        text_index = 0
        
        def get_all_paragraphs(document):
            yield from document.paragraphs
            for table in document.tables:
                for row in table.rows:
                    for cell in row.cells:
                        yield from cell.paragraphs

        for p in get_all_paragraphs(doc):
            if p.text.strip():
                if text_index < len(edited_texts):
                    if p.runs:
                        p.runs[0].text = edited_texts[text_index]
                        for run in p.runs[1:]:
                            run.text = ""
                    else:
                        p.add_run(edited_texts[text_index])
                    text_index += 1

        output_stream = io.BytesIO()
        doc.save(output_stream)
        output_stream.seek(0)
        return output_stream

    except Exception as e:
        print(f"❌ Patching Error: {e}")
        return None

# ---------------------------------------------------------
# 2. LEGACY UTILITY (Required by Recruiter.py)
# ---------------------------------------------------------

def convert_html_to_docx(html_content):
    """
    Standard HTML -> DOCX conversion using Pandoc.
    Used by recruiter.py and fallback mechanisms.
    """
    try:
        ensure_pandoc_installed()

        with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as temp_output:
            output_filename = temp_output.name
        
        extra_args = ['--standalone']
        if os.path.exists('reference.docx'):
            extra_args.append('--reference-doc=reference.docx')

        pypandoc.convert_text(
            html_content, 
            'docx', 
            format='html', 
            outputfile=output_filename,
            extra_args=extra_args
        )
        
        with open(output_filename, "rb") as f:
            docx_bytes = f.read()
            
        if os.path.exists(output_filename):
            os.remove(output_filename)
            
        return io.BytesIO(docx_bytes)

    except Exception as e:
        print(f"❌ Export Error: {e}")
        return None