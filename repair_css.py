
import os

path = r'd:\Abaid\NoshVallet\style.css'

# Read as bytes to avoid encoding errors
with open(path, 'rb') as f:
    content = f.read()

# Try to find common UTF-16 BOM or NULL bytes that indicate corruption
# Or just decode as UTF-8, ignoring errors, then re-encode
# Actually, let's just decode as UTF-8 and ignore any garbage at the very end
try:
    # First part is UTF-8
    text = content.decode('utf-8', errors='ignore')
    
    # Write back as clean UTF-8
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    print("REPAIRED_UTF8")
except Exception as e:
    print(f"ERROR: {e}")
