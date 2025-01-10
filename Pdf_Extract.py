import PyPDF2
import os

def extract_text_from_pdf(pdf_path, output_text_file):
    """
    Extracts text from a PDF and writes it to an output text file.
    Args:
        pdf_path (str): The path to the PDF file.
        output_text_file (str): The path to save the extracted text.
    Returns:
        bool: True if successful, False otherwise.
    """
    try:
        with open(pdf_path, 'rb') as pdf_file:
            reader = PyPDF2.PdfReader(pdf_file)
            extracted_text = ""
            
            for page_num, page in enumerate(reader.pages, start=1):
                text = page.extract_text()
                if text:
                    extracted_text += f"--- Page {page_num} ---\n{text}\n\n"
                else:
                    extracted_text += f"--- Page {page_num} ---\n[No extractable text]\n\n"

        with open(output_text_file, 'w', encoding='utf-8') as text_file:
            text_file.write(extracted_text)

        return True
    except FileNotFoundError:
        print(f"Error: The file '{pdf_path}' was not found.")
        return False
    except PyPDF2.errors.PdfReadError:
        print(f"Error: Unable to read the PDF file '{pdf_path}'. It might be corrupted.")
        return False
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return False

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 3:
        print("Usage: python Extract_Pdf.py <input_pdf_path> <output_text_file>")
        sys.exit(1)

    pdf_path = sys.argv[1]
    output_text_file = sys.argv[2]

    if not os.path.isfile(pdf_path):
        print(f"Error: File not found at path '{pdf_path}'.")
        sys.exit(1)

    success = extract_text_from_pdf(pdf_path, output_text_file)
    if success:
        print(f"Text successfully saved to '{output_text_file}'.")
    else:
        sys.exit(1)
