import gspread
from oauth2client.service_account import ServiceAccountCredentials
import pandas as pd
import json
import os
from google.cloud import storage  # Import Google Cloud Storage

# Step 1: Set up the credentials for Google Sheets API and Firebase Storage
scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]

# The path to your credentials JSON file (since it's in the same directory)
creds_path = os.path.join(os.path.dirname(__file__), 'wintroverts-90302-18f08372de48.json')

# Load the credentials from the JSON file for Google Sheets
creds = ServiceAccountCredentials.from_json_keyfile_name(creds_path, scope)

# Step 2: Authorize the client for Google Sheets
client = gspread.authorize(creds)

# Step 3: Open the Google Sheet by URL
sheet = client.open_by_url('https://docs.google.com/spreadsheets/d/1rX5runSBVi63uurXYF1-MeU6v5PJmW712cS31K4KEBw/edit?usp=sharing')

# Get the '2024' sheet by name
worksheet = sheet.worksheet('2024')

# Fetch all data from the worksheet as a list of lists (rows)
sheet_data = worksheet.get_all_values()

# Convert the sheet data to a pandas DataFrame (like reading an Excel sheet)
df = pd.DataFrame(sheet_data)

# The rest of your original script logic...

def clean_row(row):
    """Convert all values in the row to strings, handling NaN values."""
    return {key: (value if isinstance(value, str) else str(value) if pd.notnull(value) else 'NaN') for key, value in row.items()}

def find_last_total_row(df):
    """Return the index of the last row that contains 'TOTAL'."""
    for i in range(len(df) - 1, -1, -1):
        if 'TOTAL' in clean_row(df.iloc[i]).values():
            return i
    return -1

def process_all_fixtures(df, last_total_index):
    all_fixtures = []
    player_pairings = {}
    opposing_pairings = {}
    start_row = 3
    while start_row < last_total_index:
        team_one_players = []
        team_two_players = []
        for i in range(start_row, last_total_index + 1):
            row = df.iloc[i]
            clean_row_data = clean_row(row.iloc[1:])
            if 'TOTAL' in clean_row_data.values():
                break
            if any(value != 'NaN' for value in clean_row_data.values()):
                if clean_row_data[1] != 'NaN':
                    player_one = clean_row_data[1]
                    team_one_players.append(player_one)
                if clean_row_data[6] != 'NaN':
                    player_two = clean_row_data[6]
                    team_two_players.append(player_two)
        update_team_pairings(player_pairings, team_one_players)
        update_team_pairings(player_pairings, team_two_players)
        update_opposing_pairings(opposing_pairings, team_one_players, team_two_players)
        update_opposing_pairings(opposing_pairings, team_two_players, team_one_players)
        all_fixtures.append({
            'Fixture Start Row': start_row,
            'Team 1 Players': team_one_players,
            'Team 2 Players': team_two_players
        })
        start_row = i + 3
    return all_fixtures, player_pairings, opposing_pairings

def update_team_pairings(player_pairings, team_players):
    for player in team_players:
        if player not in player_pairings:
            player_pairings[player] = {}
        for teammate in team_players:
            if teammate != player:
                key_pair = tuple(sorted([player, teammate]))
                pairing_key = f"{key_pair[0]}+{key_pair[1]}"
                if pairing_key not in player_pairings[player]:
                    player_pairings[player][pairing_key] = 1
                else:
                    player_pairings[player][pairing_key] += 1

def update_opposing_pairings(opposing_pairings, team_one_players, team_two_players):
    for player in team_one_players:
        if player not in opposing_pairings:
            opposing_pairings[player] = {}
        for opponent in team_two_players:
            key_pair = tuple(sorted([player, opponent]))
            pairing_key = f"{key_pair[0]}+{key_pair[1]}"
            if pairing_key not in opposing_pairings[player]:
                opposing_pairings[player][pairing_key] = 1
            else:
                opposing_pairings[player][pairing_key] += 1

# Find the last row with 'TOTAL'
last_total_index = find_last_total_row(df)

# Process all fixtures in the sheet up to the last 'TOTAL' row
fixtures, player_pairings, opposing_pairings = process_all_fixtures(df, last_total_index)

# Log fixture details
for fixture in fixtures:
    print(f"Fixture starting at row {fixture['Fixture Start Row']}:")
    print("Players in Team 1:", fixture['Team 1 Players'])
    print("Players in Team 2:", fixture['Team 2 Players'])
    print()

# Create a final dictionary for JSON output for teammate pairings
final_pairings = {}
for player, teammates in player_pairings.items():
    for pairing, count in teammates.items():
        if pairing not in final_pairings:
            final_pairings[pairing] = count

# Create a final dictionary for JSON output for opposing pairings
final_opposing_pairings = {}
for player, opponents in opposing_pairings.items():
    for pairing, count in opponents.items():
        if pairing not in final_opposing_pairings:
            final_opposing_pairings[pairing] = count

# Function to upload a file to Firebase Storage
def upload_to_firebase_storage(local_file_path, bucket_name, destination_blob_name):
    """Upload the file to the bucket."""
    # Initialize the Google Cloud Storage client
    storage_client = storage.Client.from_service_account_json(creds_path)
    # Get the bucket
    bucket = storage_client.bucket(bucket_name)
    # Create a new blob (file) in the bucket
    blob = bucket.blob(destination_blob_name)
    # Upload the local file to Firebase Storage
    blob.upload_from_filename(local_file_path)
    print(f"File {local_file_path} uploaded to {destination_blob_name}.")

# Create JSON files locally and upload to Firebase
teammate_json_path = 'teammate_appearances_counts.json'
opponent_json_path = 'opponent_appearances_counts.json'

# Write JSON files locally
with open(teammate_json_path, 'w') as json_file:
    json.dump(final_pairings, json_file, indent=4)

with open(opponent_json_path, 'w') as json_file:
    json.dump(final_opposing_pairings, json_file, indent=4)

# Firebase bucket name
bucket_name = 'wintroverts-90302.appspot.com'

# Upload the files to Firebase Storage
upload_to_firebase_storage(teammate_json_path, bucket_name, 'teammate_appearances_counts.json')
upload_to_firebase_storage(opponent_json_path, bucket_name, 'opponent_appearances_counts.json')

print("JSON files have been uploaded to Firebase Storage.")
