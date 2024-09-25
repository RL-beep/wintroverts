import pandas as pd
import json
import os

# Define the Excel file name
excel_file_name = 'Wintroverts Kickabouts Teams.xlsx'

# Get the current working directory
current_directory = os.getcwd()

# Construct the full path for the Excel file
excel_file_path = os.path.join(current_directory, excel_file_name)

# Read the Excel file
df = pd.read_excel(excel_file_path, sheet_name='2024', header=None)

# Necessary because of emojis (smh Ed!)
def clean_row(row):
    """Convert all values in the row to strings, handling NaN values."""
    return {key: (value if isinstance(value, str) else str(value) if pd.notnull(value) else 'NaN') for key, value in row.items()}

# Function to find the last TOTAL row
def find_last_total_row(df):
    """Return the index of the last row that contains 'TOTAL'."""
    for i in range(len(df) - 1, -1, -1):  # Start from the last row and go upwards
        if 'TOTAL' in clean_row(df.iloc[i]).values():
            return i  # Return the index of the last 'TOTAL' row
    return -1  # Return -1 if no 'TOTAL' found

# Function to process all fixtures in the DataFrame and track pairings
def process_all_fixtures(df, last_total_index):
    all_fixtures = []
    player_pairings = {}
    opposing_pairings = {}

    start_row = 3
    
    while start_row < last_total_index:
        team_one_players = []
        team_two_players = []

        for i in range(start_row, last_total_index + 1):
            row = df.iloc[i]  # Get the row data
            clean_row_data = clean_row(row.iloc[1:])  # Exclude the first column

            if 'TOTAL' in clean_row_data.values():
                break

            if any(value != 'NaN' for value in clean_row_data.values()):  # Skip empty rows
                if clean_row_data[1] != 'NaN':
                    player_one = clean_row_data[1]
                    team_one_players.append(player_one)
                if clean_row_data[6] != 'NaN':
                    player_two = clean_row_data[6]
                    team_two_players.append(player_two)

        # After collecting all players for both teams, update pairings
        update_team_pairings(player_pairings, team_one_players)
        update_team_pairings(player_pairings, team_two_players)

        # Update opposing pairings
        update_opposing_pairings(opposing_pairings, team_one_players, team_two_players)
        update_opposing_pairings(opposing_pairings, team_two_players, team_one_players)

        # Store the results for the current fixture
        all_fixtures.append({
            'Fixture Start Row': start_row,
            'Team 1 Players': team_one_players,
            'Team 2 Players': team_two_players
        })

        # Move to the next fixture (next row after the 'TOTAL' row)
        start_row = i + 3

    return all_fixtures, player_pairings, opposing_pairings  # Return the list of all fixtures, player pairings, and opposing pairings

def update_team_pairings(player_pairings, team_players):
    """Update the player pairings dictionary with counts of how many times players were together in the same team."""
    for player in team_players:
        if player not in player_pairings:
            player_pairings[player] = {}
        
        for teammate in team_players:
            if teammate != player:  # Don't count a player with themselves
                # Create the pairing key in a consistent order
                key_pair = tuple(sorted([player, teammate]))  # Use a tuple to keep pairs
                pairing_key = f"{key_pair[0]}+{key_pair[1]}"
                
                if pairing_key not in player_pairings[player]:
                    player_pairings[player][pairing_key] = 1  # Set to 1 since we're adding this pairing
                else:
                    player_pairings[player][pairing_key] += 1  # Increment the existing count

def update_opposing_pairings(opposing_pairings, team_one_players, team_two_players):
    """Update the opposing pairings dictionary."""
    for player in team_one_players:
        if player not in opposing_pairings:
            opposing_pairings[player] = {}
        
        for opponent in team_two_players:
            # Create the pairing key in a consistent order
            key_pair = tuple(sorted([player, opponent]))  # Use a tuple to keep pairs
            pairing_key = f"{key_pair[0]}+{key_pair[1]}"  # 'vs' indicates opposing players
            
            if pairing_key not in opposing_pairings[player]:
                opposing_pairings[player][pairing_key] = 1  # Initialize to 1 for the first encounter
            else:
                opposing_pairings[player][pairing_key] += 1  # Increment if already exists

# Find the last row with 'TOTAL'
last_total_index = find_last_total_row(df)

# Process all fixtures in the sheet up to the last 'TOTAL' row
fixtures, player_pairings, opposing_pairings = process_all_fixtures(df, last_total_index)

# Log fixture details
for fixture in fixtures:
    print(f"Fixture starting at row {fixture['Fixture Start Row']}:")
    print("Players in Team 1:", end=' ')
    print(fixture['Team 1 Players'])
    print("Players in Team 2:", end=' ')
    print(fixture['Team 2 Players'])
    print()

# Create a final dictionary for JSON output for teammate pairings
final_pairings = {}
for player, teammates in player_pairings.items():
    for pairing, count in teammates.items():
        if pairing not in final_pairings:
            final_pairings[pairing] = count

# Write the final player pairings to a JSON file in the same directory as the Excel file
teammate_json_path = os.path.join(current_directory, 'teammate_appearances_counts.json')
with open(teammate_json_path, 'w') as json_file:
    json.dump(final_pairings, json_file, indent=4)

print(f"Player pairings have been written to {teammate_json_path}.")

# Create a final dictionary for JSON output for opposing pairings
final_opposing_pairings = {}
for player, opponents in opposing_pairings.items():
    for pairing, count in opponents.items():
        if pairing not in final_opposing_pairings:
            final_opposing_pairings[pairing] = count

# Write the final opposing player pairings to a JSON file in the same directory as the Excel file
opponent_json_path = os.path.join(current_directory, 'opponent_appearances_counts.json')
with open(opponent_json_path, 'w') as json_file:
    json.dump(final_opposing_pairings, json_file, indent=4)

print(f"Opposing player pairings have been written to {opponent_json_path}.")
