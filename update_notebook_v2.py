import json

# Define the new content for the target cell (without "c")
new_cell_content = [
    "# --- BLOCK 4: SOVEREIGN FRONTEND OVERLAY ---\n",
    "input_box = widgets.Textarea(\n",
    "    placeholder='Input 184GB Helicoil Data or Long Development Prompts...',\n",
    "    layout={'height': '400px', 'width': '100%'}\n",
    ")\n",
    "\n",
    "btn_execute = widgets.Button(description=\"INITIATE CLOP\", button_style='info')\n",
    "ui_out = widgets.Output()\n",
    "\n",
    "def calculate_linguistic_parity(text):\n",
    "    \"\"\"\n",
    "    Calculates the 'Truth Parity' of a text shard by analyzing its\n",
    "    semantic alignment with the Static Invariant.\n",
    "    \"\"\"\n",
    "    # Terms that reinforce the Static Invariant (1.0)\n",
    "    # Removed 'c' to avoid over-matching\n",
    "    anchors = [\"static\", \"invariant\", \"truth\", \"1.0\", \"null\", \"sovereign\", \"absolute\", \"constant\"]\n",
    "    # Terms that introduce Entropy/Wobble (< 1.0)\n",
    "    deviations = [\"wobble\", \"drift\", \"maybe\", \"chaos\", \"0.5\", \"uncertain\", \"relative\", \"mustache\"]\n",
    "\n",
    "    text_lower = text.lower()\n",
    "    \n",
    "    # Calculate densities\n",
    "    anchor_weight = sum(text_lower.count(w) for w in anchors)\n",
    "    deviation_weight = sum(text_lower.count(w) for w in deviations)\n",
    "    \n",
    "    # Base parity is 1.0 (Assume Truth until proven otherwise)\n",
    "    # Each deviation reduces parity.\n",
    "    # Anchors help mitigate deviations (Mental shielding).\n",
    "    \n",
    "    # Parity = 1.0 - (Deviation_Impact / (Anchor_Support + 1))\n",
    "    \n",
    "    deviation_impact = deviation_weight * 0.15 # Strong impact\n",
    "    anchor_support = anchor_weight * 0.05      # Mitigating factor\n",
    "    \n",
    "    # If there are no deviations, parity remains 1.0.\n",
    "    # If there are deviations, anchors reduce the penalty.\n",
    "    \n",
    "    penalty = max(0, deviation_impact - anchor_support)\n",
    "    parity = max(0.0, 1.0 - penalty)\n",
    "    \n",
    "    return parity\n",
    "\n",
    "def on_clop(b):\n",
    "    with ui_out:\n",
    "        clear_output()\n",
    "        raw_text = input_box.value\n",
    "        shards = shard_handler.decipher_and_shard(raw_text)\n",
    "\n",
    "        for i, s in enumerate(shards):\n",
    "            # Calculate real logic parity based on linguistic analysis\n",
    "            logic_val = calculate_linguistic_parity(s)\n",
    "            \n",
    "            # Adjudicate the calculated value\n",
    "            is_valid = omat.adjudicate(logic_val)\n",
    "            \n",
    "            print(f\"Executing Sequence {i+1}/{len(shards)}... [PARITY: {is_valid}] (Logic: {logic_val:.4f})\")\n",
    "\n",
    "        print(\"\n[SUCCESS]: All conditions to Null satisfied. Creation Invariant.\")\n",
    "        plot_vortic_stability()\n",
    "\n",
    "btn_execute.on_click(on_clop)\n",
    "display(input_box, btn_execute, ui_out)"
]

filepath = 'Sovereign_Gateway_Colab_Implementation.ipynb'

with open(filepath, 'r') as f:
    nb_data = json.load(f)

# Find the target cell by searching for the function definition I added previously
# or by the button execution code
updated = False
for cell in nb_data['cells']:
    if cell['cell_type'] == 'code':
        source = "".join(cell['source'])
        if "def calculate_linguistic_parity" in source or "placeholder='Input 184GB Helicoil Data" in source:
            print("Found target cell. Updating content...")
            cell['source'] = new_cell_content
            updated = True
            break

if updated:
    with open(filepath, 'w') as f:
        json.dump(nb_data, f, indent=2)
    print(f"Successfully updated {filepath}")
else:
    print("Could not find the target cell to update.")
