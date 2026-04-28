import re

def analyze_files():
    try:
        with open('datasets/files.sql', 'r', encoding='utf-8') as f:
            lines = f.readlines()
            print(f"Total lines: {len(lines)}")
            workspace_lines = [i for i, line in enumerate(lines) if "'workspace'" in line]
            system_lines = [i for i, line in enumerate(lines) if "'system'" in line]
            
            print(f"Workspace lines: {len(workspace_lines)}")
            if workspace_lines:
                print(f"First workspace line: {workspace_lines[0]}")
                print(f"Last workspace line: {workspace_lines[-1]}")
                
            print(f"System lines: {len(system_lines)}")
            if system_lines:
                print(f"First system line: {system_lines[0]}")
                print(f"Last system line: {system_lines[-1]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    analyze_files()
