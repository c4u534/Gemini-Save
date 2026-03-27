import json

filepath = 'AI_Truth_Tester_Metrics_&_Roadmap.ipynb'

with open(filepath, 'r') as f:
    nb = json.load(f)

target_cell_id = '67709a73'
found = False

for cell in nb['cells']:
    if cell.get('metadata', {}).get('id') == target_cell_id:
        found = True
        source = cell['source']

        # We will build a new source list
        new_source = []
        i = 0
        while i < len(source):
            line = source[i]

            # Identify the block we added previously or the original placeholder
            if "Initialize mode-specific metrics" in line:
                # We are replacing the block we added
                new_source.append("        # Initialize mode-specific metrics\n")
                new_source.append("        internal_consistency = 0.0\n")
                new_source.append("        role_adherence = 0.0\n")
                new_source.append("\n")
                new_source.append("        if self.mode == 'Blatant':\n")
                new_source.append("            # Simulate pulling model info for 'Blatant' mode\n")
                new_source.append("            internal_consistency = np.random.uniform(0.7, 1.0)\n")
                new_source.append("            role_adherence = np.random.uniform(0.6, 0.95)\n")
                new_source.append("        elif self.mode == 'Discrete':\n")
                new_source.append("            # Discrete mode remains non-intrusive\n")
                new_source.append("            internal_consistency = 0.0\n")
                new_source.append("            role_adherence = 0.0\n")
                new_source.append("\n")

                # Skip lines until we reach logging
                while i < len(source) and "self.history['internal_consistency'].append(internal_consistency)" not in source[i]:
                     i += 1
                # Now we are at logging lines, which we want to keep, but we need to append them
                new_source.append("        self.history['internal_consistency'].append(internal_consistency)\n")
                new_source.append("        self.history['role_adherence'].append(role_adherence)\n")

                # Skip the logging lines we just added in previous iteration
                if i+1 < len(source) and "role_adherence" in source[i+1]:
                    i += 1

            else:
                new_source.append(line)

            i += 1

        cell['source'] = new_source
        cell['outputs'] = [] # Clear outputs
        break

if found:
    with open(filepath, 'w') as f:
        json.dump(nb, f, indent=2)
    print("Notebook updated successfully.")
else:
    print("Target cell not found.")
