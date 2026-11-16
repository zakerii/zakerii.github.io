import re

with open('admin.html', 'r', encoding='utf-8') as f:
    html = f.read()

ids_used = re.findall(r'document\.getElementById\([\'"]([^\'"]+)[\'"]\)', html)
print(f'Total getElementById calls: {len(ids_used)}')

missing = []
for el_id in set(ids_used):
    pattern = rf'id=[\'"]{re.escape(el_id)}[\'"]'
    if not re.search(pattern, html):
        missing.append(el_id)

print(f'Missing element IDs: {missing}')
