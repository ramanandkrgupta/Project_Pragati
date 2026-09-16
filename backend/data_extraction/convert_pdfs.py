import os
import pymupdf4llm

def main():
    base_dir = "/Users/ramanand/Desktop/SIH103"
    input_dirs = ["2025-26", "2026-27"]
    output_base_dir = os.path.join(base_dir, "markdown_output")

    # Create base output directory if it doesn't exist
    os.makedirs(output_base_dir, exist_ok=True)

    for input_dir in input_dirs:
        full_input_dir = os.path.join(base_dir, input_dir)
        full_output_dir = os.path.join(output_base_dir, input_dir)

        if not os.path.exists(full_input_dir):
            print(f"Skipping {full_input_dir} as it does not exist.")
            continue

        os.makedirs(full_output_dir, exist_ok=True)

        for filename in os.listdir(full_input_dir):
            if filename.lower().endswith(".pdf"):
                input_pdf_path = os.path.join(full_input_dir, filename)
                
                # Output filename replaces .pdf with .md
                output_filename = filename[:-4] + ".md"
                output_md_path = os.path.join(full_output_dir, output_filename)

                print(f"Converting: {input_pdf_path} -> {output_md_path}")
                try:
                    # Convert PDF to Markdown
                    # Not specifying write_images=True since images are not needed
                    md_text = pymupdf4llm.to_markdown(input_pdf_path)
                    
                    with open(output_md_path, "w", encoding="utf-8") as f:
                        f.write(md_text)
                    print(f"Successfully converted {filename}")
                except Exception as e:
                    print(f"Error converting {filename}: {e}")

if __name__ == "__main__":
    main()
