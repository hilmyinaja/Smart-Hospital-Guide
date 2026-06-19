import os
import re

def clean_text(comment):
    # Lowercase all-caps words
    words = comment.split()
    new_words = []
    for w in words:
        if w.isupper() and len(re.sub(r'[^A-Z]', '', w)) > 1:
            new_words.append(w.lower())
        else:
            new_words.append(w)
    
    text = " ".join(new_words)
    
    # Translate basic terms
    replacements = {
        'HACK:': 'solusi sementara:',
        'HACK MOBILE:': 'solusi mobile:',
        'NOTE:': 'catatan:',
        'TODO:': 'akan dikerjakan:',
        'FIXME:': 'perbaiki:',
        'SANGAT PENTING UNTUK PERFORMA MOBILE': 'penting untuk performa mobile',
        'Icon components': 'komponen ikon',
        'State': 'status',
        'Theme Toggle Switch': 'tombol ubah tema',
        'Fix for extra outline on map drag focus': 'perbaikan garis luar saat peta digeser',
        'VERTICAL FLOOR SCRUBBER (GLOBAL)': 'pengontrol lantai vertikal',
        'Hide scrollbar for Chrome, Safari and Opera': 'sembunyikan scrollbar',
        'Scrollbar for right panel': 'scrollbar panel kanan',
        'MODERN CARDS': 'kartu modern',
        'FORM ELEMENTS': 'elemen form',
        'BUTTONS': 'tombol',
        'TEMPLATES (DRAG & DROP)': 'template',
        'CHECKBOX CONTROLS': 'kontrol checkbox',
        'Modal Overlay': 'overlay modal',
        'Confirm Modal': 'modal konfirmasi',
        'RESPONSIVE': 'responsif',
        'CONFIRMATION ICON BADGES': 'ikon konfirmasi',
        'CUSTOM DROPDOWN DRAG AND DROP': 'dropdown khusus',
        'HEADER': 'header',
        'MAIN LAYOUT': 'layout utama',
        'LEFT PANEL': 'panel kiri',
        'Search': 'pencarian',
        'Destination output dynamic box': 'kotak tujuan dinamis',
        'Dropdown': 'dropdown',
        'MOBILE HANDOFF MODE': 'mode mobile handoff',
        'VERTICAL FLOOR SCRUBBER STYLES MOVED TO index.css': 'gaya pengontrol lantai vertikal pindah ke index.css',
        'MAP PANEL': 'panel peta',
        'MODAL STYLING': 'gaya modal',
        'Animations': 'animasi',
        'ROUTE PLANNER LAYOUT': 'layout rute',
        'Remove colored glowing focus outlines for the new route UI': 'hapus garis luar fokus',
        'QUICK ACTIONS SECTION': 'aksi cepat',
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
        text = text.replace(k.lower(), v)
        
    return text

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    ext = os.path.splitext(filepath)[1]
    
    if ext == '.py':
        lines = content.split('\n')
        new_lines = []
        for line in lines:
            if '#' in line and '://' not in line:
                parts = line.split('# ', 1)
                code = parts[0]
                comment = parts[1]
                cleaned = clean_text(comment).strip()
                # Remove unneeded dashes/stars
                cleaned = re.sub(r'^[-=*]+', '', cleaned).strip()
                cleaned = re.sub(r'[-=*]+$', '', cleaned).strip()
                
                if cleaned.lower() in ['pembatas', 'pemisah', 'bagian atas', '']:
                    if not code.strip():
                        continue
                    new_lines.append(code.rstrip())
                else:
                    new_lines.append(f"{code}# {cleaned}")
            else:
                new_lines.append(line)
        content = '\n'.join(new_lines)
        
    elif ext in ['.js', '.jsx']:
        # Replace block comments
        def repl_block(m):
            comment = m.group(1)
            cleaned = clean_text(comment).strip()
            cleaned = re.sub(r'^[-=*]+', '', cleaned).strip()
            cleaned = re.sub(r'[-=*]+$', '', cleaned).strip()
            if cleaned.lower() in ['', 'eslint-disable']: return m.group(0) # Keep eslint
            return f"/* {cleaned} */"
        content = re.sub(r'/\*(.*?)\*/', repl_block, content, flags=re.DOTALL)
        
        # Replace inline comments
        lines = content.split('\n')
        new_lines = []
        for line in lines:
            if '//' in line and '://' not in line:
                parts = line.split('//', 1)
                code = parts[0]
                comment = parts[1]
                cleaned = clean_text(comment).strip()
                cleaned = re.sub(r'^[-=*]+|[-=*]+$', '', cleaned).strip()
                if cleaned.lower() in ['pembatas', 'pemisah']:
                    if not code.strip(): continue
                    new_lines.append(code.rstrip())
                else:
                    new_lines.append(f"{code}// {cleaned}")
            else:
                new_lines.append(line)
        
        content = '\n'.join(new_lines)
        
        # Also clean jsx comments {/* ... */}
        def repl_jsx(m):
            comment = m.group(1)
            cleaned = clean_text(comment).strip()
            cleaned = re.sub(r'^[-=*]+|[-=*]+$', '', cleaned).strip()
            if cleaned.lower() in ['pembatas', 'pemisah', '']: return ""
            return f"{{/* {cleaned} */}}"
        content = re.sub(r'\{\s*/\*(.*?)\*/\s*\}', repl_jsx, content, flags=re.DOTALL)
        # Clean empty lines left by jsx comment removal
        content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)

    elif ext == '.css':
        def repl_css(m):
            comment = m.group(1)
            cleaned = clean_text(comment).strip()
            cleaned = re.sub(r'^[-=*]+|[-=*]+$', '', cleaned).strip()
            if not cleaned: return ""
            return f"/* {cleaned} */"
        content = re.sub(r'/\*(.*?)\*/', repl_css, content, flags=re.DOTALL)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for root, _, files in os.walk('.'):
    if 'node_modules' in root or 'venv' in root or '.git' in root:
        continue
    for f in files:
        if f.endswith(('.py', '.js', '.jsx', '.css')):
            if f in ['rolldown-runtime-S-ySWqyJ.js', 'map-W0RpRHAU.js', 'vendor-DVu9EGH8.js', 'index-IvP-zz6n.js', 'index-vvi02_Mr.css', 'firebase-D_FVcSU0.js']: continue
            process_file(os.path.join(root, f))
