import json
from collections import deque

notebook_path = 'Sovereign_Gateway_Colab_Implementation.ipynb'
cell_id_to_patch = 'yM2821MeRd8r'

with open(notebook_path, 'r', encoding='utf-8') as f:
    notebook = json.load(f)

# The new source code for the on_clop function
new_source_code = [
    "# --- BLOCK 4: SOVEREIGN FRONTEND OVERLAY ---\n",
    "from collections import deque\n",
    "\n",
    "input_box = widgets.Textarea(\n",
    "    placeholder='Input 184GB Helicoil Data or Long Development Prompts...',\n",
    "    layout={'height': '400px', 'width': '100%'}\n",
    ")\n",
    "\n",
    "btn_execute = widgets.Button(description=\"INITIATE CLOP\", button_style='info')\n",
    "ui_out = widgets.Output()\n",
    "\n",
    "def on_clop(b):\n",
    "    with ui_out:\n",
    "        clear_output()\n",
    "        raw_text = input_box.value\n",
    "        shards = shard_handler.decipher_and_shard(raw_text)\n",
    "\n",
    "        # Initialize processing queue\n",
    "        # Each item is a tuple: (shard_content, shard_index, attempt_count)\n",
    "        task_queue = deque([(s, i, 1) for i, s in enumerate(shards)])\n",
    "        deferred_queue = deque() # For tasks that fail > 3 times\n",
    "        \n",
    "        total_shards = len(shards)\n",
    "        \n",
    "        print(f\"[ORCHESTRATOR]: Processing {total_shards} shards with Intelligent Error Handling...\")\n",
    "\n",
    "        # --- Phase 1: Process Main Queue ---\n",
    "        while task_queue:\n",
    "            current_shard, index, attempts = task_queue.popleft()\n",
    "            \n",
    "            # Simulate Adjudication per shard\n",
    "            # Simulating an error condition for demonstration purposes\n",
    "            # If the shard contains 'ERROR_TEST', we simulate a failure\n",
    "            try:\n",
    "                if 'ERROR_TEST' in current_shard and attempts <= 3:\n",
    "                    raise ValueError(\"Simulated Persistence Error\")\n",
    "                \n",
    "                # Normal Logic Check\n",
    "                is_valid = omat.adjudicate(1.0) \n",
    "                print(f\"Executing Sequence {index+1}/{total_shards} (Attempt {attempts})... [PARITY: {is_valid}]\")\n",
    "                time.sleep(0.3)\n",
    "                \n",
    "            except Exception as e:\n",
    "                print(f\"[ERROR]: Shard {index+1} failed on attempt {attempts}: {e}\")\n",
    "                if attempts < 3:\n",
    "                    # Retry immediately if attempts < 3\n",
    "                    print(f\"[RETRY]: Re-queueing Shard {index+1} for immediate retry.\")\n",
    "                    task_queue.appendleft((current_shard, index, attempts + 1))\n",
    "                else:\n",
    "                    # Defer if persistent error (attempts >= 3)\n",
    "                    print(f\"[DEFER]: Shard {index+1} persisted > 3 attempts. Moving to Deferred Queue.\")\n",
    "                    deferred_queue.append((current_shard, index, attempts + 1))\n",
    "\n",
    "        # --- Phase 2: Process Deferred Queue (Priority Shift) ---\n",
    "        if deferred_queue:\n",
    "            print(\"\\n[PRIORITY SHIFT]: Main tasks complete. Analyzing Deferred Queue for persistent issues...\")\n",
    "            while deferred_queue:\n",
    "                current_shard, index, attempts = deferred_queue.popleft()\n",
    "                print(f\"[ANALYSIS]: Processing Deferred Shard {index+1} (Cumulative Attempt {attempts})...\")\n",
    "                # Simulate a final forced adjudication or deep analysis here\n",
    "                is_valid = omat.adjudicate(0.5) # Assessing with lower confidence/higher scrutiny\n",
    "                print(f\"[FINAL RESULT]: Shard {index+1} Adjudicated with scrutiny. [PARITY: {is_valid}]\")\n",
    "                time.sleep(0.3)\n",
    "            \n",
    "            print(\"[ANALYSIS COMPLETE]: All persistent issues addressed.\")\n",
    "\n",
    "        print(\"\\n[SUCCESS]: All conditions to Null satisfied. Creation Invariant.\")\n",
    "        plot_vortic_stability()\n",
    "\n",
    "btn_execute.on_click(on_clop)\n",
    "display(input_box, btn_execute, ui_out)\n"
]

# Find and update the cell
for cell in notebook['cells']:
    if cell.get('metadata', {}).get('id') == cell_id_to_patch:
        cell['source'] = new_source_code
        print(f"Successfully patched cell {cell_id_to_patch}")
        break
else:
    print(f"Error: Cell ID {cell_id_to_patch} not found.")

# Write the updated notebook back to disk
with open(notebook_path, 'w', encoding='utf-8') as f:
    json.dump(notebook, f, indent=2, ensure_ascii=False)

print("Notebook saved.")
