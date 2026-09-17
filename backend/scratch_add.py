import re

new_code = """
import re

def clean_and_split_states(state_str):
    if not state_str:
        return []
    s = state_str.replace('(-) (-)', '').replace('(-)', '').strip()
    # Remove any standalone bracketed number like (10141) or (N06000163)
    s = re.sub(r'\([A-Z0-9]+\)', '', s)
    s = s.replace('Multi-States', '')
    s = s.replace('(', '').replace(')', '')
    s = s.strip()
    if not s or s.lower() == 'pan india' or s.lower() == 'offshore':
        return []
    
    # Split by comma
    states = [x.strip() for x in s.split(',')]
    return [x for x in states if x]

@app.get("/api/v1/analytics/state-wise")
def get_state_wise_analytics():
    with engine.connect() as conn:
        res = conn.execute(text('''
            SELECT state, approved_cost, revised_cost, expenditure, physical_progress
            FROM projects
        '''))
        
        state_map = {}
        for row in res:
            states = clean_and_split_states(row[0])
            for st in states:
                if st not in state_map:
                    state_map[st] = {
                        "name": st,
                        "projectCount": 0,
                        "originalCost": 0.0,
                        "revisedCost": 0.0,
                        "expenditure": 0.0,
                        "completedDuringMonth": 0,
                        "newlyAdded": 0
                    }
                state_map[st]["projectCount"] += 1
                state_map[st]["originalCost"] += float(row[1] or 0)
                state_map[st]["revisedCost"] += float(row[2] or 0)
                state_map[st]["expenditure"] += float(row[3] or 0)
                if row[4] and float(row[4]) >= 100:
                    state_map[st]["completedDuringMonth"] += 1
                    
        return {"data": list(state_map.values())}

@app.get("/api/v1/analytics/agency-wise")
def get_agency_wise_analytics():
    with engine.connect() as conn:
        res = conn.execute(text('''
            SELECT implementing_agency, COUNT(*) as projectCount, 
                   SUM(approved_cost) as originalCost, SUM(revised_cost) as revisedCost, 
                   SUM(expenditure) as expenditure,
                   SUM(CASE WHEN physical_progress >= 100 THEN 1 ELSE 0 END) as completedDuringMonth
            FROM projects
            WHERE implementing_agency IS NOT NULL AND implementing_agency != ''
            GROUP BY implementing_agency
            ORDER BY projectCount DESC
        '''))
        
        data = []
        for row in res:
            data.append({
                "name": row[0],
                "projectCount": row[1],
                "originalCost": float(row[2] or 0),
                "revisedCost": float(row[3] or 0),
                "expenditure": float(row[4] or 0),
                "completedDuringMonth": row[5],
                "newlyAdded": 0
            })
        return {"data": data}

@app.get("/api/v1/analytics/sector-wise")
def get_sector_wise_analytics():
    with engine.connect() as conn:
        res = conn.execute(text('''
            SELECT sector, COUNT(*) as projectCount, 
                   SUM(approved_cost) as originalCost, SUM(revised_cost) as revisedCost, 
                   SUM(expenditure) as expenditure,
                   SUM(CASE WHEN physical_progress >= 100 THEN 1 ELSE 0 END) as completedDuringMonth
            FROM projects
            WHERE sector IS NOT NULL AND sector != ''
            GROUP BY sector
            ORDER BY projectCount DESC
        '''))
        
        data = []
        for row in res:
            data.append({
                "name": row[0],
                "projectCount": row[1],
                "originalCost": float(row[2] or 0),
                "revisedCost": float(row[3] or 0),
                "expenditure": float(row[4] or 0),
                "completedDuringMonth": row[5],
                "newlyAdded": 0
            })
        return {"data": data}
"""

with open("api/main.py", "a") as f:
    f.write(new_code)
