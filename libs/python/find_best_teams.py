import pandas as pd
from itertools import chain, product, combinations
import math
import numpy as np
import time
import json


# Columns in the csv file must include 'Name', 'Defending', 'Attacking'
class Team_builder:

    def __init__(self, csv_location, teammate_appearances_location, opponent_appearances_location, teammate_matrix_location, opponent_matrix_location, matches_requested):

        # Temporary for debugging
        self.last_recorded_time = time.perf_counter()

        # Stores all the input data in a single dataframe
        dataframe = pd.read_csv(csv_location)
        dataframe.set_index('Name', inplace=True)

        # This will set the number of matches that will be returned by the program - It is capped at 5
        self.matches_to_be_returned = np.clip(matches_requested, 1, 5)

        # Stores all unique player names
        self.player_name_superset = set(dataframe.index.to_list())

        print(self.player_name_superset )

        # Create an 'Overall' column which is a sum of the Defending and Attacking scores
        dataframe['Overall'] = dataframe['Defending'] + dataframe['Attacking']

        # Stores a sorted list of all player scores
        self.player_overall_ratings = sorted(dataframe['Overall'].to_list(), reverse=True)

        # Stores all individual player ratings
        # Format = {player_name_1: {'Defending':int, 'Attacking':int}, player_name_2...}
        self.player_rating_dict = dataframe.to_dict('index')

        # Create a dictionary which is overall_score:[player Names with score]
        dataframe.reset_index(inplace=True)
        self.overall_score_to_player_dict = dataframe.groupby('Overall')['Name'].apply(list).to_dict()

        with open(teammate_matrix_location, 'r') as file:
            self.master_teammate_matrix_data = json.load(file)

        with open(opponent_matrix_location, 'r') as file:
            self.master_opponent_matrix_data = json.load(file)

        # Update the teammate/opponent matrices with any new players from the player_ratings.csv file
        # Find the player names which appear in the player_ratings.csv file but not the teammate matrix
        new_players = set(dataframe['Name']) - set(self.master_teammate_matrix_data['players'])

        # Add new players to the 'players' list
        self.master_teammate_matrix_data['players'].extend(new_players)
        self.master_opponent_matrix_data['players'].extend(new_players)

        # Get the updated number of players
        num_players = len(self.master_teammate_matrix_data['players'])

        # Update the matrix with zeros for new players
        for player_list in self.master_teammate_matrix_data['matrix']:
            player_list.extend([0] * len(new_players))

        for player_list in self.master_opponent_matrix_data['matrix']:
            player_list.extend([0] * len(new_players))

        # Add new rows to the matrix for new players
        for _ in new_players:
            self.master_teammate_matrix_data['matrix'].append([0] * num_players)

        # Add new rows to the matrix for new players
        for _ in new_players:
            self.master_opponent_matrix_data['matrix'].append([0] * num_players)

        self.master_opponent_matrix = self.master_opponent_matrix_data['matrix']
        self.master_opponent_players = self.master_opponent_matrix_data['players']
        self.master_teammate_matrix = self.master_teammate_matrix_data['matrix']
        self.master_teammate_players = self.master_teammate_matrix_data['players']

        # Stores all aggregated team ratings
        self.team_rating_dict = {}

        # Stores all the different possible team combinations for a match
        self.unique_match_list = list()

        # Stores a score for each match which rates how balanced the teams are
        self.match_balance_rating_score_dict = {}

        # Stores the balance scores and the sum of shared appearances together in the same dictionary
        self.match_balance_rating_score_teammate_appearances_dict = {}

        self.best_rating_balanced_matches_stats = {}

        # Stores a list which will contain the matches in order of highest suitability
        self.sorted_match_list_by_rating = []

        # Stores a counter for the number of balanced matches which have been found by the program
        # The program will stop running when a predetermined number of balanced matches have been found
        self.balanced_matches_count = 0

        # Stores the number of teammate and opponent appearances of players for each set of teams provided
        self.player_teammate_appearances = self.load_from_json(teammate_appearances_location)
        self.player_opponent_appearances = self.load_from_json(opponent_appearances_location)

        self.run()

    def run(self):
        self.find_potential_match_teams()

        self.find_team_ratings()

        self.find_match_balance_rating_scores()

        self.get_best_rating_balanced_matches()

        self.sort_best_rating_balanced_matches()

        # Commenting out so output can be called manually to get the output
        # self.return_matches_summary()

    def return_matches_summary(self):
        matches_summary_df_array = []

        match_summaries = []
        for teams in self.sorted_match_list_by_stats:
            team_a = ["A", teams[0]]
            team_b = ["B", teams[1]]

            matches_summary_df_array.append(self.get_match_summary(team_a, team_b, teams))

            # Get matrices to summarise the playing history between the players of the match
            team_a_teammate_matrix, team_a_opponent_matrix, team_b_teammate_matrix, team_b_opponent_matrix, opponent_matrix, opponent_teammate_matrix = self.get_matrices(team_a, team_b)

            match_summaries.append([team_a_teammate_matrix, team_a_opponent_matrix, team_b_teammate_matrix, team_b_opponent_matrix, opponent_matrix, opponent_teammate_matrix])



        return [matches_summary_df_array, match_summaries]

    def get_matrices(self, team_a, team_b):
        team_a_teammate_matrix = self.get_teammate_matrix(team_a[1])
        team_a_opponent_matrix = self.get_opponent_matrix(team_a[1], team_a[1])
        team_b_teammate_matrix = self.get_teammate_matrix(team_b[1])
        team_b_opponent_matrix = self.get_opponent_matrix(team_b[1], team_b[1])
        opponent_matrix = self.get_opponent_matrix(team_a[1], team_b[1])
        opponent_teammate_matrix = self.get_opponent_teammate_matrix(team_a[1], team_b[1])
        return team_a_teammate_matrix, team_a_opponent_matrix, team_b_teammate_matrix, team_b_opponent_matrix, opponent_matrix, opponent_teammate_matrix

    def get_teammate_matrix(self, team):
        # Find the indices of the subset players in the original list
        indices = [self.master_teammate_players.index(player) for player in team]

        # Filter the matrix to include only the rows and columns corresponding to the subset players
        filtered_matrix = [[self.master_teammate_matrix[i][j] for j in indices] for i in indices]

        # Create a new dictionary with the filtered matrix and subset players
        filtered_teammate_matrix_data = {
            'matrix': filtered_matrix,
            'players': team
        }

        return filtered_teammate_matrix_data

    def get_opponent_teammate_matrix(self,  team_a, team_b):
        # Find the indices of the players in each team
        team_a_indices = [self.master_teammate_players.index(player) for player in team_a]
        team_b_indices = [self.master_teammate_players.index(player) for player in team_b]

        print("team_a_indices", team_a_indices)
        print("team_b_indices", team_b_indices)

        # Filter the matrix to include only the rows corresponding to team_a_players
        # and the columns corresponding to team_b_players
        filtered_matrix = [[self.master_teammate_matrix[i][j] for j in team_b_indices] for i in team_a_indices]

        # Create a new dictionary with the filtered matrix and player lists
        filtered_opponent_matrix_data = {
            'matrix': filtered_matrix,
            'team_a_players': team_a,
            'team_b_players': team_b
        }

        return filtered_opponent_matrix_data

    def get_opponent_matrix(self, team_a, team_b):
        # Find the indices of the players in each team
        team_a_indices = [self.master_opponent_players.index(player) for player in team_a]
        team_b_indices = [self.master_opponent_players.index(player) for player in team_b]

        # Filter the matrix to include only the rows corresponding to team_a_players
        # and the columns corresponding to team_b_players
        filtered_matrix = [[self.master_opponent_matrix[i][j] for j in team_b_indices] for i in team_a_indices]

        # Create a new dictionary with the filtered matrix and player lists
        filtered_opponent_matrix_data = {
            'matrix': filtered_matrix,
            'team_a_players': team_a,
            'team_b_players': team_b
        }

        return filtered_opponent_matrix_data

    def get_match_summary(self, team_a, team_b, both_teams):

        match_team_df_array = []

        # List schema: balance_score, team1_teammate_apps, team2_teammate_apps, teams_opponent_apps
        teams_stats = self.best_rating_balanced_matches_stats[both_teams]

        for team in [team_a, team_b]:
            # Get all of the team member names in a list
            team_members = team[1]

            # Get team member ratings and total scores
            team_member_rating_dict = {team_member: self.player_rating_dict[team_member] for team_member in
                                       team_members}
            team_member_rating_df = pd.DataFrame(team_member_rating_dict).T
            team_member_rating_df.loc['TOTAL'] = team_member_rating_df.sum()
            # Adding column manually because the 'names' argument doesn't work for reset_index function on pythonanywhere
            team_member_rating_df.insert(0, "Player", team_member_rating_df.index)

            # # Adding the 'Shared Appearances' column
            # team_member_rating_df['Tm Apps'] = ""
            # team_member_rating_df['Opp Apps'] = ""
            #
            # team_member_rating_df.loc['TOTAL', 'Tm Apps'] = teams_stats[1] if team[0] =='A' else teams_stats[2]
            # team_member_rating_df.loc['TOTAL', 'Opp Apps'] = teams_stats[3]

            team_member_rating_df.reset_index(inplace=True, drop=True)

            match_team_df_array.append(team_member_rating_df)

        return match_team_df_array

    def find_match_balance_rating_scores(self):
        for pair_of_teams in self.unique_match_list:

            match_balance_rating_score = self.calculate_match_balance(pair_of_teams)

            # print(match_balance_rating_score)

            # Convert lists to tuples so that the pair of teams can be stored as a dictionary key
            pair_of_teams_tuple = tuple(tuple(team) for team in pair_of_teams)
            self.match_balance_rating_score_dict[pair_of_teams_tuple] = match_balance_rating_score

            # If the teams are completely balanced - increment the balanced matches counter
            if (match_balance_rating_score == 0):
                self.balanced_matches_count += 1
                print("yo")
                # If the number of gathered balanced matches is equal to 20
                # Used to be: If the requested number of balanced matches has been found - no more will be searched for
                # Changed because we want more than just ability-balanced matches now, we want to take into account
                # teammate appearances and opponent appearances
                if (self.balanced_matches_count == 20):
                    break

    def get_best_rating_balanced_matches(self):
        # Sort the matches in order of lowest balance score (best) to highest (worst)
        self.sorted_match_list_by_rating = sorted(self.match_balance_rating_score_dict, key=self.match_balance_rating_score_dict.get)

        matches_to_review = min(len(self.sorted_match_list_by_rating), 5)

        for match_number in range(0, matches_to_review):

            pair_of_teams = (self.sorted_match_list_by_rating[match_number][0], self.sorted_match_list_by_rating[match_number][1])

            # Calculate the historical teammate and opponent counts for the two teams
            pair_appearances_stats = self.calculate_pair_appearances(pair_of_teams)


            # Add the match rating score to the pair_appearance_stats
            match_stats = [self.match_balance_rating_score_dict[pair_of_teams]] + pair_appearances_stats

            self.best_rating_balanced_matches_stats[pair_of_teams] = match_stats

            print("unsorted: ", self.best_rating_balanced_matches_stats[pair_of_teams])


    def sort_best_rating_balanced_matches(self):
        def custom_match_sort(key_value_pair):
            key, values = key_value_pair
            balance_score, team1_teammate_apps, team2_teammate_apps, teams_opponent_apps = values
            return(balance_score, (team1_teammate_apps + team2_teammate_apps)**2 + (teams_opponent_apps)**2, team1_teammate_apps + team2_teammate_apps, teams_opponent_apps)

        self.sorted_match_list_by_stats = dict(sorted(self.best_rating_balanced_matches_stats.items(), key=custom_match_sort))

        print("sorted: ", self.sorted_match_list_by_stats)

    def calculate_match_balance(self, pair_of_teams):
        # Get the relevant team ratings from the team_rating_dict
        team_1_ratings = self.team_rating_dict[tuple(pair_of_teams[0])]
        team_2_ratings = self.team_rating_dict[tuple(pair_of_teams[1])]

        # Find the overall difference between the ratings of each team
        defensive_difference = self.calculate_net_difference(team_1_ratings['Defending'], team_2_ratings['Defending'])
        attacking_difference = self.calculate_net_difference(team_1_ratings['Attacking'], team_2_ratings['Attacking'])
        overall_difference = self.calculate_net_difference(team_1_ratings['Overall'], team_2_ratings['Overall'])

        # The magic formula - Will give a lower (better) score when there's no difference in ratings whatsoever
        match_balance_rating_score = (defensive_difference + attacking_difference) * (overall_difference + 1)

        return match_balance_rating_score


    def calculate_pair_appearances(self, pair_of_teams):
        team_1_player_pairs = self.get_teammate_pair_list(pair_of_teams[0])
        team_2_player_pairs = self.get_teammate_pair_list(pair_of_teams[1])
        teams_opponent_pairs = self.get_opponent_pair_list(pair_of_teams)

        team_1_teammate_appearances = 0
        team_2_teammate_appearances = 0
        teams_opponent_appearances = 0

        for pair in team_1_player_pairs:
            team_1_teammate_appearances += self.get_player_pair_teammate_appearances(pair)

        for pair in team_2_player_pairs:
            team_2_teammate_appearances += self.get_player_pair_teammate_appearances(pair)

        for pair in teams_opponent_pairs:
            teams_opponent_appearances += self.get_player_pair_opponent_appearances(pair)

        return [team_1_teammate_appearances, team_2_teammate_appearances, teams_opponent_appearances]


        # # Get the relevant team ratings from the team_rating_dict
        # team_1_ratings = self.team_rating_dict[tuple(pair_of_teams[0])]
        # team_2_ratings = self.team_rating_dict[tuple(pair_of_teams[1])]
        #
        # # Find the overall difference between the ratings of each team
        # defensive_difference = self.calculate_net_difference(team_1_ratings['Defending'], team_2_ratings['Defending'])
        # attacking_difference = self.calculate_net_difference(team_1_ratings['Attacking'], team_2_ratings['Attacking'])
        # overall_difference = self.calculate_net_difference(team_1_ratings['Overall'], team_2_ratings['Overall'])
        #
        # # The magic formula - Will give a lower (better) score when there's no difference in ratings whatsoever
        # match_balance_rating_score = (defensive_difference + attacking_difference) * (overall_difference + 1)
        #
        # return match_balance_rating_score
        pass


    def get_teammate_pair_list(self, players):
        pairs = []

        for i in range(len(players)):
            for j in range(i + 1, len(players)):
                pair = tuple(sorted((players[i], players[j])))
                pairs.append(pair)

        return pairs

    def get_opponent_pair_list(self, teams):
        pair_list = []
        for team1_player in teams[0]:
            for team2_player in teams[1]:
                player_names_in_alphabetical_order = sorted([team1_player, team2_player])
                pair = player_names_in_alphabetical_order[0] + '+' + player_names_in_alphabetical_order[1]
                pair_list.append(pair)
        return pair_list

    def get_player_pair_teammate_appearances(self, pair):
        pair_name = pair[0] + '+' + pair[1]
        return self.player_teammate_appearances.get(pair_name, 0)

    def get_player_pair_opponent_appearances(self, pair):
        return self.player_opponent_appearances.get(pair, 0)


    def calculate_net_difference(self, rating_1, rating_2):
        return math.sqrt((rating_1 - rating_2) ** 2)

    def find_team_ratings(self):
        # Find the ratings for each possible pair of teams
        for pair_of_teams in self.unique_match_list:
            team_1 = pair_of_teams[0]
            team_2 = pair_of_teams[1]

            team_1_ratings, team_2_ratings = self.get_team_ratings(team_1, team_2)

            # Appending the team ratings to the team_rating_dict dictionary
            # Tuple is required because a list can't be used as a dictionary key
            self.team_rating_dict[tuple(team_1)] = team_1_ratings
            self.team_rating_dict[tuple(team_2)] = team_2_ratings

    def get_team_ratings(self, team_1, team_2):
        # TODO: Could make this more efficient by doing matrix addition rather than looping and adding player ratings individually

        # Team ratings: ['Total defensive rating', 'Total attacking rating', 'Total overall rating']
        team_1_ratings = {'Defending': 0, 'Attacking': 0, 'Overall': 0}
        team_2_ratings = {'Defending': 0, 'Attacking': 0, 'Overall': 0}

        for player_name in team_1:
            player_defence_rating = self.player_rating_dict[player_name]['Defending']
            player_attack_rating = self.player_rating_dict[player_name]['Attacking']

            team_1_ratings['Defending'] += player_defence_rating
            team_1_ratings['Attacking'] += player_attack_rating
            team_1_ratings['Overall'] += player_defence_rating + player_attack_rating

        for player_name in team_2:
            player_defence_rating = self.player_rating_dict[player_name]['Defending']
            player_attack_rating = self.player_rating_dict[player_name]['Attacking']

            team_2_ratings['Defending'] += player_defence_rating
            team_2_ratings['Attacking'] += player_attack_rating
            team_2_ratings['Overall'] += player_defence_rating + player_attack_rating

        return team_1_ratings, team_2_ratings

    def find_potential_match_teams(self):

        # Will use the brute force method up until there are 16 teams
        if (len(self.player_name_superset) <= 16):
            self.find_teams_brute_force()
        else:
            self.find_teams_heuristic_function()

    def find_teams_brute_force(self):
        # Find all the different combinations of n-member teams
        team_combination = list(combinations(self.player_name_superset,
                                             int(math.ceil(
                                                 len(self.player_name_superset) / 2))))  # rounds up if odd number

        # Convert the teams to sets so that we can find the set difference with the superset, and find the opposing team
        team_combination_sets = [set(combination) for combination in team_combination]  # converting tuples to sets

        # Finding corresponding sets of teams using set difference
        # Find the sets of opposing teams. Convert the sets to lists so that they can be sorted
        multi_team_combination = [sorted([list(team), list(self.player_name_superset.difference(team))]) for team in
                                  team_combination_sets]

        # Convert lists to tuples so that duplicate match pairs can be deleted
        multi_team_combination_tuple = [(tuple(team[0]), tuple(team[1])) for team in multi_team_combination]

        self.unique_match_list = list(set(multi_team_combination_tuple))

    def find_teams_heuristic_function(self):
        # Is there any way to swap values about to increase the number of potential team sets?
        team_a_size = 0
        team_b_size = 0
        team_a_rating = 0
        team_b_rating = 0
        team_a = []
        team_b = []

        # Finding team structure - Makes teams of generic ratings rather than teams of player names
        for rating in self.player_overall_ratings:
            if (team_a_size == team_b_size):
                if (team_a_rating <= team_b_rating):
                    team_a.append(rating)
                    team_a_size += 1
                    team_a_rating += rating
                else:
                    team_b.append(rating)
                    team_b_size += 1
                    team_b_rating += rating
            elif (team_b_size > team_a_size):
                team_a.append(rating)
                team_a_size += 1
                team_a_rating += rating
            else:
                team_b.append(rating)
                team_b_size += 1
                team_b_rating += rating

        # Counter to ensure we can break out of the following loop if more than 5 swaps have still not fixed the team imbalance
        swap_counter = 0

        # Make swaps between teams if it's worthwhile to
        while (abs(team_a_rating - team_b_rating) > 1):
            # Attempting swaps between the teams to see if there's a more optimal solution
            new_team_a, new_team_b = self.swap_players_between_teams(team_a, team_b, team_a_rating, team_b_rating)

            # If the swapping function couldn't find any swaps to make, it shouldn't be called again
            if (new_team_a == team_a):
                break

            team_a = new_team_a
            team_b = new_team_b

            # Find the newly updated team ratings
            team_a_rating = sum(team_a)
            team_b_rating = sum(team_b)

            swap_counter += 1
            # If there's only a difference of 1 rating point, then we can't improve this further and no more swaps are required
            # should this be?: (abs(team_a_rating - team_b_rating) == 1)??, used to be (abs(team_a_rating - team_b_rating) > 1)
            # I'm changing it because it doesn't look right
            if ((abs(team_a_rating - team_b_rating) == 1) or (swap_counter > 10)):
                break

        team_a_combinations_list = []

        team_a_freq_dict = {rating: team_a.count(rating) for rating in set(team_a)}

        # Find all the different combinations of players you can have in the team - convert generic ratings to names
        for rating in team_a_freq_dict:
            team_a_combinations_list.append(self.find_team_combinations(rating, team_a_freq_dict[rating]))

        # Find the product - which returns all possible team a's
        all_potential_team_a = [team for team in product(*team_a_combinations_list)]

        # Flatten the tuples within the product list
        all_potential_team_a_list = [list(chain(*team)) for team in all_potential_team_a]

        # Putting teams within sets in preparation for set difference calculation
        team_combination_sets = [set(combination) for combination in
                                 all_potential_team_a_list]  # converting tuples to sets
                                 

        # Finding corresponding sets of teams using set difference
        # Find the sets of opposing teams. Convert the sets to lists so that they can be sorted
        self.unique_match_list = [sorted([list(team), list(self.player_name_superset.difference(team))]) for team in
                                  team_combination_sets]


    def swap_players_between_teams(self, team_a, team_b, team_a_rating, team_b_rating):

        # Sorting the players from high to low so we can reduce the chance of the two worst players being on the same team
        team_a.sort(reverse=True)
        team_b.sort(reverse=True)

        # Swaps players between the weaker team and stronger team where the difference in overall rating is only 1
        if (team_a_rating < team_b_rating):
            for b_player in range(len(team_b)):
                for a_player in range(len(team_a)):
                    if team_b[b_player] == team_a[a_player] + 1:
                        b_player_stored = team_b[b_player]
                        team_b[b_player] = team_a[a_player]
                        team_a[a_player] = b_player_stored
                        return (team_a, team_b)
        else:
            for a_player in range(len(team_a)):
                for b_player in range(len(team_b)):
                    if team_a[a_player] == team_b[b_player] + 1:
                        a_player_stored = team_a[a_player]
                        team_a[a_player] = team_b[b_player]
                        team_b[b_player] = a_player_stored
                        return (team_a, team_b)

        # If no useful swap can be found, return both teams unchanged
        return (team_a, team_b)

    def find_team_combinations(self, rating, rating_frequency):
        return list(combinations(self.overall_score_to_player_dict[rating], rating_frequency))

    def load_from_json(self, file_path):
        with open(file_path, 'r') as file:
            data = json.load(file)
        return data

    

    # Example usage of the Team_builder class
if __name__ == "__main__":
    # Update file paths accordingly
    csv_location = 'player_ratings (1).csv'
    teammate_appearances_location = 'teammate_appearances_counts.json'
    opponent_appearances_location = 'opponent_appearances_counts.json'
    teammate_matrix_location = 'teammate_matrix.json'
    opponent_matrix_location = 'opponent_matrix.json'
    matches_requested = 1

    # Create an instance of Team_builder
    team_builder_instance = Team_builder(csv_location, teammate_appearances_location, opponent_appearances_location, teammate_matrix_location, opponent_matrix_location, matches_requested)

    # Run the team builder
    team_builder_instance.run()