import pdfplumber
import pandas as pd
import re

pdf_path = "2025-26/FlashReport_August_2025.pdf"
output_md = "FlashReport_August_2025_clean.md"

def extract_tables_with_context():
    markdown_content = "# Extracted Data from FlashReport_August_2025.pdf\n\n"
    
    with pdfplumber.open(pdf_path) as pdf:
        table_count = 0
        
        for i, page in enumerate(pdf.pages):
            # Extract text to find context/headings
            page_text = page.extract_text() or ""
            lines = page_text.split('\n')
            
            tables = page.extract_tables()
            if not tables:
                continue
                
            for j, table in enumerate(tables):
                # Clean the table data
                cleaned_table = []
                for row in table:
                    cleaned_row = [str(cell).replace('\n', ' ').strip() if cell is not None else "" for cell in row]
                    if any(cleaned_row):
                        cleaned_table.append(cleaned_row)
                
                if not cleaned_table or len(cleaned_table) < 2:
                    continue # Skip empty or header-only tables
                
                # Check if this table actually looks like project data
                # Typically project data has columns like S.NO., PROJECT ID, PROJECT NAME
                header_row = " ".join(cleaned_table[0]).lower()
                is_data_table = "project name" in header_row or "cost" in header_row or "s.no" in header_row
                
                if not is_data_table:
                    continue
                
                table_count += 1
                
                # Try to find a reasonable heading from the page text
                # We'll just grab the first few lines of the page that might indicate the section
                section_heading = "Data Table"
                for line in lines:
                    if "ongoing" in line.lower() or "completed" in line.lower() or "newly" in line.lower():
                        section_heading = line.strip()
                        break
                
                markdown_content += f"## {section_heading} (Table {table_count}, Page {i+1})\n\n"
                
                try:
                    df = pd.DataFrame(cleaned_table[1:], columns=cleaned_table[0])
                    markdown_content += df.to_markdown(index=False) + "\n\n"
                except Exception as e:
                    df = pd.DataFrame(cleaned_table)
                    markdown_content += df.to_markdown(index=False, header=False) + "\n\n"

    with open(output_md, "w", encoding="utf-8") as f:
        f.write(markdown_content)
    
    print(f"Extracted {table_count} data tables to {output_md}")

if __name__ == "__main__":
    extract_tables_with_context()
