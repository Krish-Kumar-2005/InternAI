from fastapi import APIRouter, UploadFile, File
import fitz  # PyMuPDF
import tempfile
import os

router = APIRouter()

@router.post("/layout")
async def extract_pdf_layout(file: UploadFile = File(...)):
    """
    Extracts exact PDF text layout with coordinates.
    Used for REAL PDF editing (Adobe-style).
    """

    # Save uploaded PDF temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(await file.read())
        pdf_path = tmp.name

    doc = fitz.open(pdf_path)
    pages = []

    for page_index, page in enumerate(doc):
        blocks = []
        text_dict = page.get_text("dict")

        for block in text_dict["blocks"]:
            if block["type"] == 0:  # text block
                for line in block["lines"]:
                    for span in line["spans"]:
                        blocks.append({
                            "page": page_index,
                            "x": span["bbox"][0],
                            "y": span["bbox"][1],
                            "text": span["text"],
                            "font": span["font"],
                            "size": span["size"],
                            "color": span["color"]
                        })

        pages.append(blocks)

    doc.close()
    os.remove(pdf_path)

    return {
        "status": "success",
        "pages": pages
    }
