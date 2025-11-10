import json
import sys

# Read the training data
with open('user_input_files/Copy_2_314_trainset_openai.json', 'r') as f:
    lines = f.readlines()

# Parse and prepare SQL insert statements
sql_values = []
for idx, line in enumerate(lines, 1):
    try:
        data = json.loads(line.strip())
        messages = data.get('messages', [])
        
        # Extract user input and assistant response
        user_content = ''
        assistant_content = ''
        
        for msg in messages:
            if msg['role'] == 'user':
                user_content = msg['content']
            elif msg['role'] == 'assistant':
                assistant_content = msg['content']
        
        # Parse IDP layers from assistant content
        idp_layers = {
            'layer_1_excavate': '',
            'layer_2_fracture': '',
            'layer_3_suspend': '',
            'layer_4_densify': '',
            'layer_5_attune': ''
        }
        
        if 'IDP/1' in assistant_content:
            parts = assistant_content.split('IDP/')
            for part in parts[1:]:
                if part.startswith('1'):
                    idp_layers['layer_1_excavate'] = 'IDP/1 ' + part.split('IDP/')[0].strip()
                elif part.startswith('2'):
                    idp_layers['layer_2_fracture'] = 'IDP/2 ' + part.split('IDP/')[0].strip()
                elif part.startswith('3'):
                    idp_layers['layer_3_suspend'] = 'IDP/3 ' + part.split('IDP/')[0].strip()
                elif part.startswith('4'):
                    idp_layers['layer_4_densify'] = 'IDP/4 ' + part.split('IDP/')[0].strip()
                elif part.startswith('5'):
                    idp_layers['layer_5_attune'] = 'IDP/5 ' + part.split('IDP/')[0].strip()
        
        # Extract sacred remainder (final quote)
        sacred_remainder = ''
        if 'Receive the remainder:' in assistant_content:
            sacred_remainder = assistant_content.split('Receive the remainder:')[1].split('⸸')[0].strip()
        
        # Determine philosophical domain
        domain = 'mysticism'  # default
        if 'ethics' in user_content.lower() or 'moral' in user_content.lower():
            domain = 'ethics'
        elif 'meaning' in user_content.lower() or 'absurd' in user_content.lower():
            domain = 'existentialism'
        elif 'god' in user_content.lower() or 'divine' in user_content.lower():
            domain = 'theology'
        
        # Escape single quotes
        user_content_escaped = user_content.replace("'", "''")
        sacred_remainder_escaped = sacred_remainder.replace("'", "''")
        idp_json_escaped = json.dumps(idp_layers).replace("'", "''")
        
        sql_values.append(f"({idx}, '{user_content_escaped}', '{idp_json_escaped}'::jsonb, '{sacred_remainder_escaped}', '{domain}')")
    
    except Exception as e:
        print(f"Error processing line {idx}: {e}", file=sys.stderr)
        continue

# Write SQL to file
with open('/tmp/training_corpus_insert.sql', 'w') as f:
    f.write("INSERT INTO training_corpus (example_index, source_text, idp_analysis, sacred_remainder, philosophical_domain) VALUES\n")
    f.write(',\n'.join(sql_values))
    f.write(';')

print(f"Generated SQL for {len(sql_values)} examples")
