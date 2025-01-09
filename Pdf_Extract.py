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
        # Open the PDF file
        with open(pdf_path, 'rb') as pdf_file:
            reader = PyPDF2.PdfReader(pdf_file)
            extracted_text = ""

            # Extract text from each page
            for page_num, page in enumerate(reader.pages, start=1):
                text = page.extract_text()
                if text:
                    extracted_text += f"--- Page {page_num} ---\n{text}\n\n"
                else:
                    extracted_text += f"--- Page {page_num} ---\n[No extractable text]\n\n"

        # Write the extracted text to the output file
        with open(output_text_file, 'w', encoding='utf-8') as text_file:
            text_file.write(extracted_text)

        print(f"Text successfully extracted and saved to '{output_text_file}'.")
    except FileNotFoundError:
        print(f"Error: The file '{pdf_path}' was not found.")
        return False
    except PyPDF2.errors.PdfReadError:
        print(f"Error: Unable to read the PDF file '{pdf_path}'. It might be corrupted.")
        return False
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return False
    return True


if name == "main":
    print("Welcome to the PDF Text Extractor!")
    while True:
        # Get PDF path from the user
        pdf_path = input("Please enter the full path to the PDF file: ").strip()

        # Validate PDF path
        if not pdf_path:
            print("Error: No path entered. Please try again.")
            continue
        if not os.path.isfile(pdf_path):
            print(f"Error: File not found at path '{pdf_path}'. Please try again.")
            continue

        # Get output file name from the user
        output_text_file = input("Enter the name of the output text file (e.g., output.txt): ").strip()
        if not output_text_file:
            print("Error: No output file name entered. Please try again.")
            continue

        # Run the text extraction function
        success = extract_text_from_pdf(pdf_path, output_text_file)
        if success:
            break
        else:
            print("An unexpected error occurred. Let's try again.")