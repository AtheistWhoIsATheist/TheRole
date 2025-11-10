import json
import sys
import os

# Add the Supabase URL and key
SUPABASE_URL = "https://jmaxcgoooguzmcnnanfb.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptYXhjZ29vb2d1em1jbm5hbmZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU4MDU3NSwiZXhwIjoyMDc3MTU2NTc1fQ.YS1nhn8EyZ0cEtlcik1alAGdcSjR0L0TeOLW5ATB3lY"

import urllib.request
import urllib.parse

# Read training data
with open('user_input_files/Copy_2_314_trainset_openai.json', 'r') as f:
    lines = f.readlines()

batch_data = []
for idx, line in enumerate(lines, 1):
    try:
        data = json.loads(line.strip())
        messages = data.get('messages', [])
        
        user_content = ''
        assistant_content = ''
        
        for msg in messages:
            if msg['role'] == 'user':
                user_content = msg['content']
            elif msg['role'] == 'assistant':
                assistant_content = msg['content']
        
        # Parse IDP layers
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
        
        # Extract sacred remainder
        sacred_remainder = ''
        if 'Receive the remainder:' in assistant_content:
            sacred_remainder = assistant_content.split('Receive the remainder:')[1].split('⸸')[0].strip()
        
        # Determine domain
        domain = 'mysticism'
        if 'ethics' in user_content.lower() or 'moral' in user_content.lower():
            domain = 'ethics'
        elif 'meaning' in user_content.lower() or 'absurd' in user_content.lower():
            domain = 'existentialism'
        elif 'god' in user_content.lower() or 'divine' in user_content.lower():
            domain = 'theology'
        
        batch_data.append({
            'example_index': idx,
            'source_text': user_content,
            'idp_analysis': idp_layers,
            'sacred_remainder': sacred_remainder,
            'philosophical_domain': domain
        })
        
    except Exception as e:
        print(f"Error processing line {idx}: {e}", file=sys.stderr)
        continue

# Insert in batches of 100
batch_size = 100
for i in range(0, len(batch_data), batch_size):
    batch = batch_data[i:i+batch_size]
    
    # Prepare request
    url = f"{SUPABASE_URL}/rest/v1/training_corpus"
    headers = {
        'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    
    data = json.dumps(batch).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    
    try:
        with urllib.request.urlopen(req) as response:
            print(f"Inserted batch {i//batch_size + 1}/{(len(batch_data) + batch_size - 1)//batch_size}")
    except Exception as e:
        print(f"Error inserting batch: {e}")

print(f"Successfully loaded {len(batch_data)} training examples")
