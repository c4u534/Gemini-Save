import json

notebook_path = 'Sovereign_Gateway_Colab_Implementation.ipynb'
cell_id_to_check = 'yM2821MeRd8r'

with open(notebook_path, 'r', encoding='utf-8') as f:
    notebook = json.load(f)

for cell in notebook['cells']:
    if cell.get('metadata', {}).get('id') == cell_id_to_check:
        source_code = ''.join(cell['source'])

        required_elements = [
            "from collections import deque",
            "task_queue = deque([(s, i, 1) for i, s in enumerate(shards)])",
            "deferred_queue = deque()",
            "if 'ERROR_TEST' in current_shard and attempts <= 3:",
            "if attempts < 3:",
            "task_queue.appendleft((current_shard, index, attempts + 1))",
            "deferred_queue.append((current_shard, index, attempts + 1))",
            "if deferred_queue:",
            "print(\"\n[PRIORITY SHIFT]: Main tasks complete. Analyzing Deferred Queue for persistent issues...\")"
        ]

        missing_elements = [elem for elem in required_elements if elem not in source_code]

        if not missing_elements:
            print(f"VERIFICATION SUCCESS: Cell {cell_id_to_check} contains all required logic elements.")
        else:
            print(f"VERIFICATION FAILED: Missing elements in Cell {cell_id_to_check}:")
            for elem in missing_elements:
                print(f" - {elem}")
        break
else:
    print(f"VERIFICATION FAILED: Cell ID {cell_id_to_check} not found.")
