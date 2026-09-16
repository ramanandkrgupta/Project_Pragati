import pdfplumber
import pandas as pd

pdf_path = "2025-26/FlashReport_August_2025.pdf"
output_md = "FlashReport_August_2025_tables_only.md"

def extract_tables_to_markdown():
    markdown_content = "# Tables Extracted from FlashReport_August_2025.pdf\n\n"
    
    with pdfplumber.open(pdf_path) as pdf:
        table_count = 0
        for i, page in enumerate(pdf.pages):
            tables = page.extract_tables()
            for j, table in enumerate(tables):
                # A table is a list of lists (rows of columns)
                # Filter out None values and clean text
                cleaned_table = []
                for row in table:
                    cleaned_row = [str(cell).replace('\n', ' ').strip() if cell is not None else "" for cell in row]
                    # Only add rows that have at least some data
                    if any(cleaned_row):
                        cleaned_table.append(cleaned_row)
                
                if not cleaned_table:
                    continue
                
                table_count += 1
                markdown_content += f"## Table {table_count} (Page {i+1})\n\n"
                
                # Convert to pandas DataFrame for easy markdown formatting
                try:
                    # Treat first row as header if it has data
                    df = pd.DataFrame(cleaned_table[1:], columns=cleaned_table[0])
                    markdown_content += df.to_markdown(index=False) + "\n\n"
                except Exception as e:
                    # Fallback if column mismatch
                    df = pd.DataFrame(cleaned_table)
                    markdown_content += df.to_markdown(index=False, header=False) + "\n\n"

    with open(output_md, "w", encoding="utf-8") as f:
        f.write(markdown_content)
    
    print(f"Extracted {table_count} tables to {output_md}")

if __name__ == "__main__":
    extract_tables_to_markdown()
