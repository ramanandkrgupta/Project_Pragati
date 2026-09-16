import re
import pandas as pd

def parse_and_export():
    with open("raw_text.txt", "r", encoding="utf-8") as f:
        lines = [l.strip() for l in f.readlines()]
    
    projects = []
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Look for Project Code which is exactly (6 digits)
        if re.match(r'^\(\d{6}\)$', line):
            project_code = line.strip('()')
            
            # The line immediately before is the Agency
            agency = lines[i-1].strip('()')
            
            # The lines before Agency up to the previous progress number (or Sl.No) are the Project Name
            # Let's walk backwards from i-2
            j = i - 2
            project_name_parts = []
            while j >= 0:
                # Stop if it's a short numeric line (likely Sl.No of this project or Progress of previous)
                if re.match(r'^\d+$', lines[j]) and len(lines[j]) < 5:
                    break
                # Also stop if we hit another project code (just in case)
                if re.match(r'^\(\d{6}\)$', lines[j]):
                    break
                # Also stop if we hit table headers
                if "Table" in lines[j] or "Ongoing Projects" in lines[j]:
                    break
                project_name_parts.insert(0, lines[j])
                j -= 1
            
            project_name = " ".join(project_name_parts).strip()
            
            # Now get the 9 lines after the Project Code
            try:
                state = lines[i+1]
                planned_start_1 = lines[i+2]
                planned_start_2 = lines[i+3].strip('()')
                planned_comp_1 = lines[i+4]
                planned_comp_2 = lines[i+5].strip('()')
                original_cost = lines[i+6]
                revised_cost = lines[i+7].strip('()')
                expenditure = lines[i+8]
                physical_progress = lines[i+9]
                
                # We will pick the most sensible dates
                # planned_start_date is usually planned_start_2 if available, or 1
                planned_start = planned_start_2 if planned_start_2 and planned_start_2 != '-' else planned_start_1
                planned_comp = planned_comp_1 if planned_comp_1 and planned_comp_1 != '-' else planned_comp_2
                if planned_start == "NA": planned_start = ""
                if planned_comp == "NA": planned_comp = ""
                
                # Clean up costs (remove commas if any)
                orig_cost_val = original_cost.replace(',', '')
                revised_cost_val = revised_cost.replace(',', '')
                expenditure_val = expenditure.replace(',', '')
                
                # Derive financial progress if possible
                try:
                    fin_prog = round(float(expenditure_val) / float(revised_cost_val) * 100, 2)
                except:
                    try:
                        fin_prog = round(float(expenditure_val) / float(orig_cost_val) * 100, 2)
                    except:
                        fin_prog = ""
                        
                projects.append({
                    "project_id": project_code,
                    "project_name": project_name,
                    "sector": "", # To be filled if known, else blank
                    "state": state,
                    "implementing_agency": agency,
                    "planned_start_date": planned_start,
                    "planned_completion_date": planned_comp,
                    "actual_start_date": "", 
                    "approved_cost": orig_cost_val,
                    "revised_cost": revised_cost_val,
                    "current_status": "Ongoing",
                    "reporting_date": "2025-08-01",
                    "physical_progress": physical_progress,
                    "planned_progress": "",
                    "financial_progress": fin_prog,
                    "expenditure": expenditure_val,
                    "monthly_expenditure": "",
                    "contractor_status": "",
                    "milestones_completed": "",
                    "milestones_total": "",
                    "milestones_overdue": ""
                })
            except IndexError:
                pass # End of file reached prematurely
                
            # Skip the lines we just processed
            i += 10
        else:
            i += 1

    df = pd.DataFrame(projects)
    
    # Clean up any potential garbage rows (e.g. headers parsed as projects)
    df = df[df['project_name'] != '']
    df = df[~df['project_id'].isnull()]
    
    # Save to CSV
    output_file = "FlashReport_August_2025_extracted.csv"
    df.to_csv(output_file, index=False)
    print(f"Successfully extracted {len(df)} projects to {output_file}")

if __name__ == "__main__":
    parse_and_export()
