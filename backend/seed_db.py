import os
import sqlite3
import pandas as pd
from sqlalchemy import create_engine, text
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = str(BASE_DIR / "paimana.db")

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    target_engine = create_engine(DATABASE_URL)
    print(f"Target DB: PostgreSQL ({DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'Supabase'})")
else:
    target_engine = create_engine(f"sqlite:///{DB_PATH}")
    print("Target DB: Local SQLite (paimana.db)")

def seed():
    print("Reading CSV files...")
    projects_csv = BASE_DIR / "output" / "canonical_projects.csv"
    snapshots_csv = BASE_DIR / "output" / "canonical_snapshots.csv"
    
    if not projects_csv.exists() or not snapshots_csv.exists():
        print("Error: CSV files not found in output directory.")
        return
        
    df_proj = pd.read_csv(projects_csv)
    df_snaps = pd.read_csv(snapshots_csv)
    
    print(f"Loaded {len(df_proj)} projects and {len(df_snaps)} snapshots.")
    
    # Save to target database
    print("Writing 'projects' table...")
    df_proj.to_sql('projects', target_engine, if_exists='replace', index=False)
    
    print("Writing 'project_snapshots' table...")
    df_snaps.to_sql('project_snapshots', target_engine, if_exists='replace', index=False)
    
    # Also migrate early_warnings and users from local SQLite if they exist
    if os.path.exists(DB_PATH) and str(target_engine.url) != f"sqlite:///{DB_PATH}":
        print("Migrating additional tables from local SQLite...")
        source_engine = create_engine(f"sqlite:///{DB_PATH}")
        
        try:
            df_warnings = pd.read_sql_table('early_warnings', source_engine)
            df_warnings.to_sql('early_warnings', target_engine, if_exists='replace', index=False)
            print(f"Migrated {len(df_warnings)} early_warnings.")
        except ValueError:
            print("No early_warnings table found in local DB.")
            
        try:
            df_users = pd.read_sql_table('users', source_engine)
            df_users.to_sql('users', target_engine, if_exists='replace', index=False)
            print(f"Migrated {len(df_users)} users.")
        except ValueError:
            print("No users table found in local DB.")
            
    # If the target is SQLite but tables don't exist, create users table at least
    with target_engine.connect() as conn:
        print("Ensuring 'users' table exists...")
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            full_name TEXT,
            email TEXT UNIQUE,
            role TEXT,
            is_active BOOLEAN,
            created_at TEXT,
            updated_at TEXT,
            last_activity_at TEXT,
            is_protected BOOLEAN
        );
        """))
        conn.commit()
            
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed()
