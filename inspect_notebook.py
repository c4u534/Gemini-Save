import json

notebook_path = 'Sovereign_Gateway_Colab_Implementation.ipynb'

with open(notebook_path, 'r', encoding='utf-8') as f:
    notebook = json.load(f)

for cell in notebook['cells']:
    if cell['cell_type'] == 'code':
        source_code = ''.join(cell['source'])
        if 'def on_clop' in source_code:
            print(f"Found cell ID: {cell['metadata'].get('id', 'N/A')}")
            print("--- Source Code ---")
            print(source_code)
            print("--- End Source Code ---")
            break
