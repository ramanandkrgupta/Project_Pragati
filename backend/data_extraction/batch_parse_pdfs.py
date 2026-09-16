import os
import glob
import re
import pandas as pd
import pymupdf

def clean_cost(val):
    return str(val).replace(',', '').strip('()')

def parse_pdf(pdf_path):
    print(f"Parsing {pdf_path}...")
    doc = pymupdf.open(pdf_path)
    lines = []
    for page in doc:
        # Use simple text extraction
        text = page.get_text("text")
        if text:
            lines.extend([l.strip() for l in text.split('\n') if l.strip()])
    
    filename = os.path.basename(pdf_path)
    # Extract month/year from filename e.g. FlashReport_August_2025.pdf
    m = re.search(r'(January|February|March|April|May|June|July|August|September|October|November|December)_?(\d{4})', filename, re.IGNORECASE)
    report_month = m.group(0) if m else filename
    
    projects = []
    ministry_data = []
    state_data = []
    
    current_section = "Unknown"
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Section detection
        if "Ministry-wise Ongoing Projects" in line:
            current_section = "Ministry"
        elif "State-wise" in line or "State-Wise" in line:
            current_section = "State"
        elif "Completed Projects During Month" in line or line == "Completed Projects":
            current_section = "Completed"
        elif "Newly Added Projects" in line:
            current_section = "Newly Added"
        elif "All Ongoing Projects" in line and current_section != "Completed" and current_section != "Newly Added":
            current_section = "Ongoing"
            
        # Parse Detailed Projects
        if current_section in ["Ongoing", "Completed", "Newly Added"]:
            # Project IDs are either (123456) for Ongoing/Newly Added, or 123456 for Completed
            is_proj = False
            project_code = ""
            
            m_ongoing = re.match(r'^\(\d{6}\)$', line)
            m_completed = re.match(r'^\d{6}$', line)
            
            if m_ongoing:
                is_proj = True
                project_code = line.strip('()')
            elif m_completed and current_section == "Completed":
                is_proj = True
                project_code = line.strip()
                
            if is_proj:
                # Agency is line before
                agency = lines[i-1].strip('()')
                
                # Project Name
                j = i - 2
                project_name_parts = []
                while j >= 0:
                    if re.match(r'^\d+$', lines[j]) and len(lines[j]) < 5:
                        break
                    if re.match(r'^\(\d{6}\)$', lines[j]) or (current_section == "Completed" and re.match(r'^\d{6}$', lines[j])):
                        break
                    if "Table" in lines[j] or "Projects" in lines[j] or "Total" in lines[j]:
                        break
                    project_name_parts.insert(0, lines[j])
                    j -= 1
                project_name = " ".join(project_name_parts).strip()
                
                try:
                    # Gather state dynamically
                    state_parts = []
                    k = i + 1
                    while k < len(lines):
                        if re.match(r'^(NA|-|\(-\)|\d{2}/\d{4}|\(\d{2}/\d{4}\))$', lines[k].strip()):
                            break
                        state_parts.append(lines[k])
                        k += 1
                    state = " ".join(state_parts).strip()
                    
                    # Gather dates (usually 4 items)
                    dates = []
                    while k < len(lines) and len(dates) < 4:
                        if not re.match(r'^(NA|-|\(-\)|\d{2}/\d{4}|\(\d{2}/\d{4}\))$', lines[k].strip()):
                            break
                        dates.append(lines[k].strip('()'))
                        k += 1
                        
                    planned_start_1 = dates[0] if len(dates) > 0 else ""
                    planned_start_2 = dates[1] if len(dates) > 1 else ""
                    planned_comp_1 = dates[2] if len(dates) > 2 else ""
                    planned_comp_2 = dates[3] if len(dates) > 3 else ""
                    
                    # Gather costs and progress
                    original_cost = lines[k] if k < len(lines) else "0"
                    k += 1
                    revised_cost = lines[k] if k < len(lines) else "0"
                    k += 1
                    expenditure = lines[k] if k < len(lines) else "0"
                    k += 1
                    
                    if current_section == "Completed":
                        physical_progress = "100"
                    else:
                        physical_progress = lines[k] if k < len(lines) else "0"
                        k += 1
                        
                    skip_lines = k - i
                    
                    planned_start = planned_start_2 if planned_start_2 and planned_start_2 != '-' else planned_start_1
                    planned_comp = planned_comp_1 if planned_comp_1 and planned_comp_1 != '-' else planned_comp_2
                    if planned_start == "NA": planned_start = ""
                    if planned_comp == "NA": planned_comp = ""
                    
                    orig_cost_val = clean_cost(original_cost)
                    revised_cost_val = clean_cost(revised_cost)
                    expenditure_val = clean_cost(expenditure)
                    
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
                        "sector": "",
                        "state": state,
                        "implementing_agency": agency,
                        "planned_start_date": planned_start,
                        "planned_completion_date": planned_comp,
                        "actual_start_date": "", 
                        "approved_cost": orig_cost_val,
                        "revised_cost": revised_cost_val,
                        "current_status": current_section,
                        "report_month": report_month,
                        "physical_progress": physical_progress,
                        "planned_progress": "",
                        "financial_progress": fin_prog,
                        "expenditure": expenditure_val
                    })
                except IndexError:
                    pass
                i += skip_lines
                continue

        # Parse Ministry-wise
        if current_section == "Ministry":
            # Looking for Project Count (integer), Original Cost (float), Revised (float), Expenditure (float)
            # A pattern of 4 numeric values in a row could indicate the end of a ministry block
            if i >= 3 and re.match(r'^\d+$', line) and re.match(r'^\d+\.?\d*$', lines[i+1].strip('()')) and re.match(r'^\d+\.?\d*$', lines[i+2].strip('()')) and re.match(r'^\d+\.?\d*$', lines[i+3]):
                project_count = line
                orig_cost = clean_cost(lines[i+1])
                rev_cost = clean_cost(lines[i+2])
                expend = clean_cost(lines[i+3])
                
                # The line before count is sector, before that is Ministry
                sector = lines[i-1]
                
                j = i - 2
                ministry_parts = []
                while j >= 0:
                    if re.match(r'^\d+$', lines[j]) or "Expenditure" in lines[j] or "Total" in lines[j]:
                        break
                    ministry_parts.insert(0, lines[j])
                    j -= 1
                ministry = " ".join(ministry_parts).strip()
                
                if ministry and sector and not "Total" in ministry:
                    ministry_data.append({
                        "report_month": report_month,
                        "ministry": ministry,
                        "sector": sector,
                        "project_count": project_count,
                        "original_cost": orig_cost,
                        "revised_cost": rev_cost,
                        "expenditure": expend
                    })
                i += 4
                continue

        # Parse State-wise
        if current_section == "State":
            # Looking for Count, Orig, Rev, Exp
            if i >= 3 and re.match(r'^\d+$', line) and re.match(r'^\d+\.?\d*$', lines[i+1].strip('()')) and re.match(r'^\d+\.?\d*$', lines[i+2].strip('()')) and re.match(r'^\d+\.?\d*$', lines[i+3]):
                project_count = line
                orig_cost = clean_cost(lines[i+1])
                rev_cost = clean_cost(lines[i+2])
                expend = clean_cost(lines[i+3])
                
                sector = lines[i-1]
                
                j = i - 2
                ministry_parts = []
                state_parts = []
                
                # Ministry is immediately before sector. Wait, Ministry can be multi-line
                # State is before Ministry.
                # Since we don't have clear delimiters, we assume the line immediately before sector is the Ministry.
                # If there are more lines, they might be the State.
                # A safer approach: we maintain the 'current_state' variable across loops.
                # But it's hard to track. Let's backtrack up to the previous expenditure or total or Sl.No.
                while j >= 0:
                    if re.match(r'^\d+\.?\d*$', lines[j]) and j < i-2: # Previous expenditure
                        break
                    if "Total" in lines[j] or "State-Wise" in lines[j] or "Expenditure" in lines[j]:
                        break
                    if re.match(r'^\d+$', lines[j]): # Sl.No
                        break
                    ministry_parts.insert(0, lines[j])
                    j -= 1
                    
                # From ministry_parts, the last line(s) usually form the ministry. The first line(s) form the state (if present)
                # This is tricky because ministry names can span multiple lines.
                # If there are multiple parts, and one of them is a known ministry (starts with Ministry or Department), we can split.
                ministry = ""
                state = ""
                for k, part in enumerate(ministry_parts):
                    if part.startswith("Ministry") or part.startswith("Department") or "Authority" in part or "Board" in part or "Railways" in part:
                        state = " ".join(ministry_parts[:k]).strip()
                        ministry = " ".join(ministry_parts[k:]).strip()
                        break
                
                if not ministry:
                    ministry = " ".join(ministry_parts).strip()
                
                # If state is empty, it means we inherit the previous state. We'll handle this in post-processing.
                if ministry and not "Total" in ministry:
                    state_data.append({
                        "report_month": report_month,
                        "raw_state": state, # We will forward-fill this later
                        "ministry": ministry,
                        "sector": sector,
                        "project_count": project_count,
                        "original_cost": orig_cost,
                        "revised_cost": rev_cost,
                        "expenditure": expend
                    })
                i += 4
                continue

        i += 1

    return projects, ministry_data, state_data

def post_process_state_data(state_data):
    # Forward fill the state
    current_state = "Unknown"
    processed = []
    for row in state_data:
        if row["raw_state"]:
            current_state = row["raw_state"]
        
        processed.append({
            "report_month": row["report_month"],
            "state": current_state,
            "ministry": row["ministry"],
            "sector": row["sector"],
            "project_count": row["project_count"],
            "original_cost": row["original_cost"],
            "revised_cost": row["revised_cost"],
            "expenditure": row["expenditure"]
        })
    return processed

def main():
    all_projects = []
    all_ministry = []
    all_state = []
    
    pdfs = glob.glob("2025-26/*.pdf") + glob.glob("2026-27/*.pdf")
    
    for pdf in pdfs:
        try:
            p, m, s = parse_pdf(pdf)
            all_projects.extend(p)
            all_ministry.extend(m)
            all_state.extend(post_process_state_data(s))
        except Exception as e:
            print(f"Error parsing {pdf}: {e}")
            
    df_projects = pd.DataFrame(all_projects)
    # Ensure columns match exactly
    target_cols = [
        "project_id","project_name","sector","state","implementing_agency","planned_start_date","planned_completion_date",
        "actual_start_date","approved_cost","revised_cost","current_status","report_month","physical_progress",
        "planned_progress","financial_progress","expenditure","monthly_expenditure","contractor_status",
        "milestones_completed","milestones_total","milestones_overdue"
    ]
    for col in target_cols:
        if col not in df_projects.columns:
            df_projects[col] = ""
    df_projects = df_projects[target_cols]
    
    # Filter out garbage
    df_projects = df_projects[df_projects['project_name'] != '']
    df_projects = df_projects[~df_projects['project_id'].isnull()]
    
    df_ministry = pd.DataFrame(all_ministry)
    df_state = pd.DataFrame(all_state)
    
    df_projects.to_csv("master_project_data.csv", index=False)
    df_ministry.to_csv("master_ministry_wise_data.csv", index=False)
    df_state.to_csv("master_state_wise_data.csv", index=False)
    
    print(f"Extraction complete!")
    print(f"Projects: {len(df_projects)}")
    print(f"Ministry entries: {len(df_ministry)}")
    print(f"State entries: {len(df_state)}")

if __name__ == "__main__":
    main()
