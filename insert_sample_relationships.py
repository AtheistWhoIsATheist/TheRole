#!/usr/bin/env python3
"""
Script to insert sample relationship data for testing the Knowledge Graph and Cross-Axiom Relationships
"""
import os
import requests
import json
from supabase import create_client, Client

def main():
    # Initialize Supabase client
    supabase_url = os.environ.get('SUPABASE_URL')
    supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not supabase_key:
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
        return
    
    supabase: Client = create_client(supabase_url, supabase_key)
    
    try:
        # Get existing RPEs and Axioms
        print("Fetching existing RPEs and Axioms...")
        rpes_result = supabase.table('rpes').select('id,entity_id,name').execute()
        axioms_result = supabase.table('axioms').select('id,axiom_number,title').execute()
        
        rpes = rpes_result.data
        axioms = axioms_result.data
        
        print(f"Found {len(rpes)} RPEs and {len(axioms)} Axioms")
        
        if len(rpes) == 0 or len(axioms) == 0:
            print("Need at least 1 RPE and 1 Axiom to create relationships")
            return
        
        # Create sample relationships
        relationships = []
        
        # Create RPE-to-RPE relationships
        if len(rpes) >= 2:
            relationships.append({
                'source_entity_id': rpes[0]['id'],
                'target_entity_id': rpes[1]['id'],
                'relationship_type': 'transcendent_emergence',
                'relationship_strength': 7.5,
                'description': 'RPE shows transcendent emergence patterns from first entity'
            })
            
            if len(rpes) >= 3:
                relationships.append({
                    'source_entity_id': rpes[1]['id'],
                    'target_entity_id': rpes[2]['id'],
                    'relationship_type': 'void_resonance',
                    'relationship_strength': 6.0,
                    'description': 'Second entity resonates with void patterns of third'
                })
        
        # Create RPE-to-Axiom relationships
        if len(axioms) >= 1:
            relationships.append({
                'source_entity_id': rpes[0]['id'],
                'target_entity_id': axioms[0]['id'],
                'relationship_type': 'foundational_basis',
                'relationship_strength': 9.0,
                'description': f'RPE {rpes[0]["name"]} is fundamentally based on {axioms[0]["title"]}'
            })
        
        # Create axiom-to-RPE relationships
        if len(axioms) >= 1 and len(rpes) >= 2:
            relationships.append({
                'source_entity_id': axioms[0]['id'],
                'target_entity_id': rpes[1]['id'],
                'relationship_type': 'axiomatic_manifestation',
                'relationship_strength': 8.5,
                'description': f'Axiom {axioms[0]["title"]} manifests in RPE {rpes[1]["name"]}'
            })
        
        # Insert relationships
        print(f"Inserting {len(relationships)} sample relationships...")
        for rel in relationships:
            result = supabase.table('knowledge_graph').insert(rel).execute()
            print(f"Created relationship: {rel['relationship_type']}")
        
        print("Sample relationships created successfully!")
        
        # Also create some axiom-RPE associations for the Cross-Axiom Relationships
        if len(axioms) >= 1 and len(rpes) >= 1:
            # Associate the first axiom with the first RPE
            print("Associating Axiom with RPE for Cross-Axiom Relationships...")
            supabase.table('axioms').update({
                'rpe_id': rpes[0]['id']
            }).eq('id', axioms[0]['id']).execute()
            print("Axiom-RPE association created!")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()