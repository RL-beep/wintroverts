//------------------------------------- Global Variables -------------------------------------------------------------
// Import required libraries

let sortDirection = {}; // Sort dirction of table Columns
let playerImages = {}; // Cache for player images
// Create an object to hold the dynamic date variables
let selectedDates = {};

//------------------------------------- On load functions -------------------------------------------------------------

$(document).ready(async function() {
    try {
        const data = await getDatabase(); // Wait for getDatabase() to complete and get the data
        await getPlayerImages();

        // Populate both tables in parallel and wait for both to complete
        await Promise.all([
            populateTable("peffermill", data),
            populateTable("portobello", data),
            populateTable("cornExchange", data),
        ]);

        // Fade out the preloader after both tables are populated
        $('#preloader').fadeOut('slow');
    } catch (error) {
        console.error('Error fetching data or populating tables:', error);
        $('#preloader').fadeOut('slow');
    }
});

async function getPlayerImages() {
    return new Promise((resolve, reject) => {
        const storage = firebase.storage();
        const imagesRef = storage.ref().child('');

        imagesRef.listAll()
            .then((result) => {
                const promises = result.items.map((item) => {
                    // Check if item is an image file based on file extension
                    if (item.name.match(/\.(jpg|jpeg|png|gif)$/i)) {
                        return new Promise((resolveImage, rejectImage) => {
                            item.getDownloadURL()
                                .then((url) => {
                                    const img = new Image();
                                    img.src = url;
                                    
                                    img.onload = () => {
                                        playerImages[item.name] = url;
                                        resolveImage();
                                    };

                                    img.onerror = () => {
                                        rejectImage(new Error(`Error loading image: ${item.name}`));
                                    };
                                })
                                .catch(rejectImage);
                        });
                    } else {
                        // Skip non-image files
                        return Promise.resolve();
                    }
                });

                Promise.all(promises)
                    .then(resolve)
                    .catch(reject);
            })
            .catch(reject);
    });
}

function getDatabase() {
    return new Promise((resolve, reject) => {
        const firebaseConfig = {
            apiKey: "AIzaSyD9O9Hyuzt5dmmgCN-vplCi7O24-rNdVmM",
            authDomain: "wintroverts-90302.firebaseapp.com",
            databaseURL: "https://wintroverts-90302-default-rtdb.europe-west1.firebasedatabase.app",
            projectId: "wintroverts-90302",
            storageBucket: "wintroverts-90302.appspot.com",
            messagingSenderId: "537691008365",
            appId: "1:537691008365:web:fb4f5a1dba73a8723ebe64",
            measurementId: "G-6HZYX76M99"
        };

        // Initialize Firebase
        const app = firebase.initializeApp(firebaseConfig);

        // Reference to your Firebase Realtime Database
        const database = firebase.database(app);

        // Example: Fetching data from the database
        const dbRef = firebase.database().ref();
        dbRef.on('value', (snapshot) => {
            const data = snapshot.val();
            resolve(data); // Resolve with the fetched data
        }, (error) => {
            reject(error); // Reject the promise in case of error
        });
    });
}

async function populateTable(venue, data = {}) {
    return new Promise((resolve, reject) => {

        if (venue === "peffermill") {
            formattedVenue = "Peffermill";
        } else if (venue === "portobello") {
            formattedVenue = "Portobello";
        } else {
            formattedVenue = "CornExchange";
        }
 
        // Check if there are rows in the table and enable/disable the buttons accordingly
        const incrementBtn = document.getElementById(`incrementAppearancesBtn${formattedVenue}`);
        const decrementBtn = document.getElementById(`decrementAppearancesBtn${formattedVenue}`);
        const generateBtn = document.getElementById(`generateTeamBtn${formattedVenue}`);
        const table = document.getElementById(`${venue}Table`);
        const tableBody = document.getElementById(`${venue}TableBody`);

        // Check if the data is provided
        if (!data) {
            incrementBtn.disabled = true;
            incrementBtn.classList.add('button-disabled');

            decrementBtn.disabled = true;
            decrementBtn.classList.add('button-disabled');

            if(venue == "peffermill"){

                generateBtn.disabled = true;
                generateBtn.classList.add('button-disabled');
            }
            resolve(); // Resolve the promise as there's no data to process
            return;
        }

        // Check if the venue exists in the data and if it has any players
        if (!data[venue] || !data[venue].Players) {
            incrementBtn.disabled = true;
            incrementBtn.classList.add('button-disabled');

            decrementBtn.disabled = true;
            decrementBtn.classList.add('button-disabled');

            if(venue == "peffermill"){
                generateBtn.disabled = true;
                generateBtn.classList.add('button-disabled');
            }

            resolve();
            return;
        }

        const players = data[venue].Players;


        if (!table || !tableBody) {
            console.error('Table or TableBody not found');
            resolve();
            return;
        }

        if (tableBody.children.length === 0) {
            const tableHead = table.createTHead();
            const headerRow = tableHead.insertRow();

            const headers = ['Player', 'Position', 'Apps', 'Goals', 'Atk Rating', 'Def Rating', 'Available', 'Delete'];
            headers.forEach(headerText => {
                const th = document.createElement('th');
                if (headerText !== 'Delete') {
                    th.innerHTML = `${headerText} <i class="fas fa-sort" style="color: #333;"></i>`;
                    th.dataset.column = headerText.replace(' ', ''); // Optional: dataset to store column info
                    if (headerText !== 'Player') {
                        th.classList.add('center-heading');
                    }
                    headerRow.appendChild(th);

                    // Initialize sortDirection for each column
                    sortDirection[headerText.replace(' ', '')] = 'asc';
                } else {
                    th.classList.add('center-heading');
                    th.textContent = headerText;
                    headerRow.appendChild(th);
                }
            });
        }
        // Clear any existing rows
        tableBody.innerHTML = '';

        // Populate table rows with player data
        for (const playerName in players) {
            if (players.hasOwnProperty(playerName)) {
                const playerData = players[playerName];
                const row = document.createElement('tr');
        
                // Construct the key with the ".png" extension
                const imageKey = playerData.image + ".png";
        
                // Fetch the image URL from playerImages cache using the constructed key
                const imageUrl = playerImages[imageKey];

                row.innerHTML = `
                <td contenteditable="true" data-key="${playerName}" data-field="Player">
                    <img src="${imageUrl}">${playerName}
                </td>
                <td class="center-text" contenteditable="true" data-key="${playerName}" data-field="Position">${playerData.Position}</td>
                <td class="center-text" contenteditable="true" data-key="${playerName}" data-field="Apps">${playerData.Apps}</td>
                <td class="center-text" contenteditable="true" data-key="${playerName}" data-field="Goals">${playerData.Goals}</td>
                <td class="center-text" data-key="${playerName}" data-field="AtkRating">
                    <select class="rating-select" data-key="${playerName}" data-field="AtkRating">
                        ${generateRatingOptions(playerData["AtkRating"])}
                    </select>
                </td>
                <td class="center-text" data-key="${playerName}" data-field="DefRating">
                    <select class="rating-select" data-key="${playerName}" data-field="DefRating">
                        ${generateRatingOptions(playerData["DefRating"])}
                    </select>
                </td>
                <td class="center-text" data-key="${playerName}" data-field="Available">
                    <input type="checkbox" class="form-check-input Available-toggle" data-key="${playerName}" ${playerData.Available ? 'checked' : ''}>
                </td>
                <td class="center-text" data-field="Delete">
                    <button class="btn btn-danger delete-btn" data-key="${playerName}">
                        <i class="fas fa-times"></i>
                    </button>
                </td>
            `;
        
                if (!playerData.Available) {
                    row.classList.add('row-not-available');
                }
        
                tableBody.appendChild(row);
            }
        }

        // Attach sort listeners
        attachSortListeners(venue);

        addCellUpdateListeners(venue);
        addAvailableToggleListeners(venue);
        addDeleteButtonListeners(venue);
        updateAvailablePlayersText(venue);
        addRatingSelectListeners(venue);

        if (tableBody.children.length > 0) {
            incrementBtn.disabled = false;
            incrementBtn.classList.remove('button-disabled');
            incrementBtn.classList.add('button-enabled');

            decrementBtn.disabled = false;
            decrementBtn.classList.remove('button-disabled');
            decrementBtn.classList.add('button-enabled');

            if (venue === "peffermill") {
                if (tableBody.children.length >= 2) {
                    generateBtn.disabled = false;
                    generateBtn.classList.remove('button-disabled');
                    generateBtn.classList.add('button-enabled');
                } else {
                    generateBtn.disabled = true;
                    generateBtn.classList.remove('button-enabled');
                    generateBtn.classList.add('button-disabled');
                }
            }

        }

        resolve();
    });
}


//------------------------------------- Event Listeners -------------------------------------------------------------

//------------------------------------- Table Header Event Listeners 
function sortTableHandler(venue, event) {
    const column = event.currentTarget.dataset.column;
    const order = (sortDirection[column] === 'asc') ? 'desc' : 'asc';
    sortTable(venue,column, order);
    sortDirection[column] = order;

    // Update the icons
    const tableHeaders = document.querySelectorAll(`#${venue}Table th`);
    tableHeaders.forEach(th => {
        const icon = th.querySelector('i');
        if (icon) {
            icon.className = 'fas fa-sort'; // Reset all to default
        }
    });
    const currentIcon = event.currentTarget.querySelector('i');
    if (currentIcon) {
        currentIcon.className = order === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down'; // Set current
    }
}

// Create a wrapper function to curry the venue parameter
function createSortTableHandler(venue) {
    return function(event) {
        sortTableHandler(venue, event);
    };
}

// Store handlers to manage event listener removal
const sortHandlers = new Map();

function attachSortListeners(venue) {
    const tableHeaders = document.querySelectorAll(`#${venue}Table th`);
    tableHeaders.forEach(header => {
        if (header.textContent !== 'Delete') {
            // Remove existing listener if any
            if (sortHandlers.has(header)) {
                const existingHandler = sortHandlers.get(header);
                header.removeEventListener('click', existingHandler);
            }
            // Create and store new handler
            const newHandler = createSortTableHandler(venue);
            sortHandlers.set(header, newHandler);
            header.addEventListener('click', newHandler);
        }
    });
}

//------------------------------------- Table Body Event Listeners 

function addCellUpdateListeners(venue) {
    const editableCells = document.querySelectorAll('td[contenteditable="true"]');
    editableCells.forEach(cell => {
        const handler = createCellUpdateHandler(venue); // Create handler with venue
        if (cell.dataset.field === 'Player') {
            cell.removeEventListener('blur', handler); // Remove existing handler (if any)
            cell.addEventListener('blur', handler); // Change event to blur
        } else {
            cell.removeEventListener('input', handler); // Remove existing handler (if any)
            cell.addEventListener('input', handler); // Keep other cells as input event
        }
    });
}

function createCellUpdateHandler(venue) {
    return function(event) {
        handleCellUpdate(venue, event);
    };
}


function addAvailableToggleListeners(venue) {
    const table = document.getElementById(`${venue}Table`);
    const availableToggles = table.querySelectorAll('.Available-toggle');
    availableToggles.forEach(toggle => {
        toggle.addEventListener('change', (event) => handleAvailableToggle(venue, event));
    });
}

function addDeleteButtonListeners(venue) {
    const table = document.getElementById(`${venue}Table`);
    const deleteButtons = table.querySelectorAll('.delete-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', (event) => handleDeleteButtonClick(venue, event));
    });
}

function addRatingSelectListeners(venue) {
    const ratingSelects = document.querySelectorAll(`#${venue}Table .rating-select`);
    ratingSelects.forEach(select => {
        select.addEventListener('change', (event) => handleRatingSelectChange(venue, event));
    });
}

function handleRatingSelectChange(venue, event) {
    const select = event.target;
    const newValue = select.value;
    const playerKey = select.dataset.key;
    const field = select.dataset.field;

    updateDatabase(venue, playerKey, field, newValue);
}

//------------------------------------- Button Event Listeners

$('#createPlayerBtn').on('click', function() {
    const playerName = $('#playerNameInput').val();
    const activeTab = $('.nav-tabs .nav-link.active').attr('id');
    let venue;
    if (activeTab === 'peffermillBtn') {
        venue = 'peffermill';
    } else if (activeTab === 'portobelloBtn') {
        venue = 'portobello';
    } else if (activeTab === 'cornExchangeBtn') {
        venue = 'cornExchange';
    }
    addNewPlayer(venue, playerName);
});

$('#generateTeamBtnPeffermill').on('click', function() {
    // Display hidden buttons
    $('#peffermillSubTab .nav-link').not('#peffermillTableBtn').css('display', 'block');

    // Extract player information from the existing table
    const players = {};
    $('#peffermillTableBody tr').each(function() {
        const playerName = $(this).find('td[data-field="Player"]').text().trim();
        const playerImage = $(this).find('td[data-field="Player"] img').attr('src').trim();
        const atkRating = $(this).find('td[data-field="AtkRating"] select').val().trim();
        const defRating = $(this).find('td[data-field="DefRating"] select').val().trim();
        const available = $(this).find('td[data-field="Available"] input[type="checkbox"]').prop('checked');
        players[playerName] = {
            playerName: playerName,
            playerImage: playerImage,
            AtkRating: atkRating,
            DefRating: defRating,
            Available: available
        };
    });

    // Populate the new tables in the lineups div
    createLineupsFixture(players,'#peffermill');
});

$('#generateTeamBtnPortobello').on('click', function() {
    // Display hidden buttons
    $('#portobelloSubTab .nav-link').not('#portobelloTableBtn').css('display', 'block');

    // Extract player information from the existing table
    const players = {};
    $('#portobelloTableBody tr').each(function() {
        const playerName = $(this).find('td[data-field="Player"]').text().trim();
        const playerImage = $(this).find('td[data-field="Player"] img').attr('src').trim();
        const atkRating = $(this).find('td[data-field="AtkRating"] select').val().trim();
        const defRating = $(this).find('td[data-field="DefRating"] select').val().trim();
        const available = $(this).find('td[data-field="Available"] input[type="checkbox"]').prop('checked');
        players[playerName] = {
            playerName: playerName,
            playerImage: playerImage,
            AtkRating: atkRating,
            DefRating: defRating,
            Available: available
        };
    });

    // Populate the new tables in the lineups div
    createLineupsFixture(players,'#portobello');
});

$('#generateTeamBtnCornExchange').on('click', function() {
    // Display hidden buttons
    $('#cornExchangeSubTab .nav-link').not('#cornExchangeTableBtn').css('display', 'block');

    // Extract player information from the existing table
    const players = {};
    $('#cornExchangeTableBody tr').each(function() {
        const playerName = $(this).find('td[data-field="Player"]').text().trim();
        const playerImage = $(this).find('td[data-field="Player"] img').attr('src').trim();
        const atkRating = $(this).find('td[data-field="AtkRating"] select').val().trim();
        const defRating = $(this).find('td[data-field="DefRating"] select').val().trim();
        const available = $(this).find('td[data-field="Available"] input[type="checkbox"]').prop('checked');
        players[playerName] = {
            playerName: playerName,
            playerImage: playerImage,
            AtkRating: atkRating,
            DefRating: defRating,
            Available: available
        };
    });

    // Populate the new tables in the lineups div
    createLineupsFixture(players,'#cornExchange');
});

function handleAppearancesButtonClick(event, venue) {

    // Determine the active tab pane based on the venue
    const activeTabPane = document.querySelector(`#${venue}-tab-pane`);

    // Get all checked availability toggles within the active tab pane
    const checkedAvailabilityToggles = activeTabPane.querySelectorAll('.Available-toggle:checked');

    // Decrement or increment appearances for each checked player in the determined venue
    checkedAvailabilityToggles.forEach(toggle => {
        const key = toggle.getAttribute('data-key');
        if (event.target.id.includes('increment')) {
            incrementAppearances(venue, key);
        } else if (event.target.id.includes('decrement')) {
            decrementAppearances(venue, key);
        }
    });
}

// Event listener for the "Increment Appearances" button
document.getElementById('incrementAppearancesBtnPeffermill').addEventListener('click', function(event) {
    handleAppearancesButtonClick(event, 'peffermill');
});

document.getElementById('incrementAppearancesBtnPortobello').addEventListener('click', function(event) {
    handleAppearancesButtonClick(event, 'portobello');
});

document.getElementById('incrementAppearancesBtnCornExchange').addEventListener('click', function(event) {
    handleAppearancesButtonClick(event, 'cornExchange');
});

// Event listener for the "Decrement Appearances" button
document.getElementById('decrementAppearancesBtnPeffermill').addEventListener('click', function(event) {
    handleAppearancesButtonClick(event, 'peffermill');
});

document.getElementById('decrementAppearancesBtnPortobello').addEventListener('click', function(event) {
    handleAppearancesButtonClick(event, 'portobello');
});

document.getElementById('decrementAppearancesBtnCornExchange').addEventListener('click', function(event) {
    handleAppearancesButtonClick(event, 'cornExchange');
});


//------------------------------------- Lineups TAB Functions --------------------------------------------------------


// Function to create the date picker input and handle the date change event
function createDatePicker(pane) {

    // Handle the date selection change event
    $(`${pane}-lineups-date-picker`).on('change', function() {
        const selectedDate = $(this).val(); // Get the selected date

        // Use the pane string (without the #) as the key for dynamic variables
        const key = `${pane.slice(1)}SelectedDate`; 
        selectedDates[key] = selectedDate; 

        // Log the selected date
        console.log(`Selected Date for ${key}: `, selectedDates[key]);
    });

}

// Main function to create lineups
async function createLineupsFixture(players, pane) {
    const teammateAppearancesJson = await fetchJSONFromFirebase('https://firebasestorage.googleapis.com/v0/b/wintroverts-90302.appspot.com/o/teammate_appearances_counts.json?alt=media');
    const opponentAppearancesJson = await fetchJSONFromFirebase('https://firebasestorage.googleapis.com/v0/b/wintroverts-90302.appspot.com/o/opponent_appearances_counts.json?alt=media');
    $('#newPreloader').show();

    try {
        $(`${pane}-lineups-tab-pane`).empty();

        // Create and append the date picker
        const lineupsDiv = $(`${pane}-lineups-tab-pane`);
        createDatePicker(pane);

        const headers = ['Player', 'Atk Rating', 'Def Rating', 'Teammate Appearances', 'Opponent Appearances'];

        const table1 = $('<table>').addClass('table lineups-table lineups-table-1');
        const table2 = $('<table>').addClass('table lineups-table lineups-table-2');

        const thead1 = $('<thead>').append($('<tr>').append(headers.map(header => $('<th>').text(header))));
        const thead2 = $('<thead>').append($('<tr>').append(headers.map(header => $('<th>').text(header))));

        table1.append(thead1);
        table2.append(thead2);

        const tbody1 = $('<tbody>').addClass('lineups-tbody');
        const tbody2 = $('<tbody>').addClass('lineups-tbody');

        let totalAtk1 = 0, totalDef1 = 0;
        let totalAtk2 = 0, totalDef2 = 0;
        let totalTeammateAppearances1 = 0, totalOpponentAppearances1 = 0;
        let totalTeammateAppearances2 = 0, totalOpponentAppearances2 = 0;

        const availablePlayers = Object.entries(players)
            .filter(([_, player]) => player.Available)
            .map(([playerName, playerData]) => {
                return {
                    playerName: playerName,
                    playerData: playerData
                };
            });

        if (availablePlayers.length <= 16) {
            alert("Must have a minimum of 17 available players");
            console.log(pane)
            $('#newPreloader').fadeOut('slow');
            $(`${pane}-lineups-tab-pane`).empty();
            $(`${pane}-date-picker-container`).hide(); 
            return;
        } else {
            $(`${pane}-date-picker-container`).show(); 
        }

        const unique_match_list = findTeamsHeuristicFunction(availablePlayers);
        const { teamA, teamB } = await generateBalancedTeams(unique_match_list, availablePlayers);

        teamA.forEach(player => {
            const row = createRow(player);
            tbody1.append(row);
            totalAtk1 += Number(player.playerData.AtkRating);
            totalDef1 += Number(player.playerData.DefRating);
            totalTeammateAppearances1 += player.playerData.teammates.totalTeammateAppearances;
            totalOpponentAppearances1 += player.playerData.opponents.totalOpponentAppearances;
        });

        teamB.forEach(player => {
            const row = createRow(player);
            tbody2.append(row);
            totalAtk2 += Number(player.playerData.AtkRating);
            totalDef2 += Number(player.playerData.DefRating);
            totalTeammateAppearances2 += player.playerData.teammates.totalTeammateAppearances;
            totalOpponentAppearances2 += player.playerData.opponents.totalOpponentAppearances;
        });

        table1.append(tbody1);
        table2.append(tbody2);

        const container1 = $('<div>').addClass('lineups-container');
        const container2 = $('<div>').addClass('lineups-container');

        const header1 = $('<h3>').text('Lightside').addClass('lineups-header');
        const header2 = $('<h3>').text('Darkside').addClass('lineups-header');

        const totals1 = $('<div>').addClass('lineups-totals').html(
            `<b>Attack Rating:</b> ${totalAtk1}<br>
            <b>Defence Rating:</b> ${totalDef1}<br>
            <b>Total Teammate Appearances:</b> ${totalTeammateAppearances1}<br>
            <b>Total Opponent Appearances:</b> ${totalOpponentAppearances1}`
        );
        const totals2 = $('<div>').addClass('lineups-totals').html(
            `<b>Attack Rating:</b> ${totalAtk2}<br>
            <b>Defence Rating:</b> ${totalDef2}<br>
            <b>Total Teammate Appearances:</b> ${totalTeammateAppearances2}<br>
            <b>Total Opponent Appearances:</b> ${totalOpponentAppearances2}`
        );

        container1.append(header1, table1, totals1);
        container2.append(header2, table2, totals2);

        const copyIcon = $('<i>').addClass('fas fa-copy copy-icon');

        // Add click event to copyIcon
        copyIcon.on('click', function() {
            copyPlayerNamesToClipboard();
        });
        
        // Create the action button
        const actionButton = $('<button>')
            .addClass('export-button')
            .text('EXPORT TO DOC');
        
        // Add click event to the action button
        actionButton.on('click', function() {
            exportToDoc(pane);
        });
        
        // Create a container for the copy icon and the action button
        const actionContainer = $('<div>')
            .addClass('action-container')
            .css({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
                // marginLeft: '40px'
            });
        
        // Append the copy icon and action button to the action container
        actionContainer.append(copyIcon, actionButton);
        
        // Append the action container to the lineupsDiv, at the same level as totals1 and totals2
        container1.append(header1, table1, totals1, );
        container2.append(header2, table2, totals2,);
        
        // Append containers to the main div
        lineupsDiv.append(container1,actionContainer,container2);

        function createRow(player) {
            const img = $('<img>').attr('src', player.playerData.playerImage).addClass('lineups-player-image');
            const playerNameSpan = $('<span>').text(player.playerName);
            const playerCell = $('<td>').append(img, playerNameSpan);

            const atkRating = Number(player.playerData.AtkRating);
            const defRating = Number(player.playerData.DefRating);
            const teammateAppearances = player.playerData.teammates.totalTeammateAppearances;
            const opponentAppearances = player.playerData.opponents.totalOpponentAppearances;

            return $('<tr>').append(
                playerCell,
                $('<td>').text(atkRating),
                $('<td>').text(defRating),
                $('<td>').text(teammateAppearances),
                $('<td>').text(opponentAppearances)
            ).data('playerData', player.playerData).data('playerName', player.playerName);
        }

        function recalculateTotals() {
            let totalAtk1 = 0, totalDef1 = 0;
            let totalAtk2 = 0, totalDef2 = 0;
            let totalTeammateAppearances1 = 0, totalOpponentAppearances1 = 0;
            let totalTeammateAppearances2 = 0, totalOpponentAppearances2 = 0;

            const teamAPlayers = [];
            const teamBPlayers = [];

            tbody1.find('tr').each(function() {
                const playerData = $(this).data('playerData');
                const playerName = $(this).data('playerName');
                teamAPlayers.push(playerName);

                totalAtk1 += Number(playerData.AtkRating);
                totalDef1 += Number(playerData.DefRating);
            });

            tbody2.find('tr').each(function() {
                const playerData = $(this).data('playerData');
                const playerName = $(this).data('playerName');
                teamBPlayers.push(playerName);

                totalAtk2 += Number(playerData.AtkRating);
                totalDef2 += Number(playerData.DefRating);
            });

            const teamAAppearances = calculateTeammateAppearances(teamAPlayers, teammateAppearancesJson);
            const teamBAppearances = calculateTeammateAppearances(teamBPlayers, teammateAppearancesJson);

            const teamAOpponentAppearances = calculateOpponentTeammateAppearances(teamAPlayers, teamBPlayers, opponentAppearancesJson);
            const teamBOpponentAppearances = calculateOpponentTeammateAppearances(teamBPlayers, teamAPlayers, opponentAppearancesJson);

            tbody1.find('tr').each(function() {
                const playerName = $(this).data('playerName');
                const playerData = $(this).data('playerData');

                const updatedPlayerData = {
                    ...playerData,
                    teammates: teamAAppearances[playerName],
                    opponents: teamAOpponentAppearances[playerName]
                };

                $(this).data('playerData', updatedPlayerData);

                totalTeammateAppearances1 += updatedPlayerData.teammates.totalTeammateAppearances;
                totalOpponentAppearances1 += updatedPlayerData.opponents.totalOpponentAppearances;

                $(this).find('td').eq(3).text(updatedPlayerData.teammates.totalTeammateAppearances);
                $(this).find('td').eq(4).text(updatedPlayerData.opponents.totalOpponentAppearances);
            });

            tbody2.find('tr').each(function() {
                const playerName = $(this).data('playerName');
                const playerData = $(this).data('playerData');

                const updatedPlayerData = {
                    ...playerData,
                    teammates: teamBAppearances[playerName],
                    opponents: teamBOpponentAppearances[playerName]
                };

                $(this).data('playerData', updatedPlayerData);

                totalTeammateAppearances2 += updatedPlayerData.teammates.totalTeammateAppearances;
                totalOpponentAppearances2 += updatedPlayerData.opponents.totalOpponentAppearances;

                $(this).find('td').eq(3).text(updatedPlayerData.teammates.totalTeammateAppearances);
                $(this).find('td').eq(4).text(updatedPlayerData.opponents.totalOpponentAppearances);
            });

            totals1.html(
                `<b>Attack Rating:</b> ${totalAtk1}<br>
                <b>Defence Rating:</b> ${totalDef1}<br>
                <b>Total Teammate Appearances:</b> ${totalTeammateAppearances1}<br>
                <b>Total Opponent Appearances:</b> ${totalOpponentAppearances1}`
            );
            totals2.html(
                `<b>Attack Rating:</b> ${totalAtk2}<br>
                <b>Defence Rating:</b> ${totalDef2}<br>
                <b>Total Teammate Appearances:</b> ${totalTeammateAppearances2}<br>
                <b>Total Opponent Appearances:</b> ${totalOpponentAppearances2}`
            );
        }

        $('.lineups-tbody').sortable({
            connectWith: '.lineups-tbody',
            placeholder: 'ui-state-highlight',
            update: function(event, ui) {
                recalculateTotals();
            }
        }).disableSelection();




    } catch (error) {
        console.error('Error populating lineups:', error);
    } finally {
        $('#newPreloader').fadeOut('slow');
        $(`${pane}LineupsBtn`).show();
        $(`${pane}LineupsTab`).css('display', 'block');
        $(`${pane}LineupsBtn`).tab('show');
    }
}



// Function to copy player names, ratings, and appearances to clipboard
function copyPlayerNamesToClipboard() {
    // Initialize arrays to store player data
    let table1Players = [];
    let table2Players = [];

    // Get the player data from table 1
    $('.lineups-table-1 tbody tr').each(function(index) {
        let playerName = $(this).data('playerName');
        if (playerName && !playerName.startsWith('FILLER')) { // Exclude players with names starting with "FILLER"
            let atkRating = $(this).find('td:nth-child(2)').text();
            let defRating = $(this).find('td:nth-child(3)').text();
            let teammateAppearances = $(this).find('td:nth-child(4)').text();
            let opponentAppearances = $(this).find('td:nth-child(5)').text();

            table1Players.push({
                number: index + 1,
                playerName: playerName,
                atkRating: atkRating,
                defRating: defRating,
                teammateAppearances: teammateAppearances,
                opponentAppearances: opponentAppearances
            });
        }
    });

    // Get the player data from table 2
    $('.lineups-table-2 tbody tr').each(function(index) {
        let playerName = $(this).data('playerName');
        if (playerName && !playerName.startsWith('FILLER')) { // Exclude players with names starting with "FILLER"
            let atkRating = $(this).find('td:nth-child(2)').text();
            let defRating = $(this).find('td:nth-child(3)').text();
            let teammateAppearances = $(this).find('td:nth-child(4)').text();
            let opponentAppearances = $(this).find('td:nth-child(5)').text();

            table2Players.push({
                number: index + 1,
                playerName: playerName,
                atkRating: atkRating,
                defRating: defRating,
                teammateAppearances: teammateAppearances,
                opponentAppearances: opponentAppearances
            });
        }
    });

    // Combine player data with side labels
    let allPlayerData = [
        { side: '--LIGHTSIDE--\n', players: table1Players },
        { side: '--DARKSIDE--\n', players: table2Players }
    ];

    // Create the text content for copying
    let textContent = '';
    allPlayerData.forEach(sideData => {
        textContent += sideData.side + '\n';
        sideData.players.forEach(player => {
            textContent += `${player.number}. @${player.playerName}\n`;
            textContent += `Atk: ${player.atkRating}, Def: ${player.defRating}, Team Opps: ${player.teammateAppearances}, Opp Opps: ${player.opponentAppearances}\n`;
            textContent += '-----------------------\n'; // Separator for players
        });
    });
    

    // Calculate totals for each table
    let totalAtk1 = 0, totalDef1 = 0, totalTeammateAppearances1 = 0, totalOpponentAppearances1 = 0;
    let totalAtk2 = 0, totalDef2 = 0, totalTeammateAppearances2 = 0, totalOpponentAppearances2 = 0;

    table1Players.forEach(player => {
        totalAtk1 += parseInt(player.atkRating);
        totalDef1 += parseInt(player.defRating);
        totalTeammateAppearances1 += parseInt(player.teammateAppearances);
        totalOpponentAppearances1 += parseInt(player.opponentAppearances);
    });

    table2Players.forEach(player => {
        totalAtk2 += parseInt(player.atkRating);
        totalDef2 += parseInt(player.defRating);
        totalTeammateAppearances2 += parseInt(player.teammateAppearances);
        totalOpponentAppearances2 += parseInt(player.opponentAppearances);
    });

    textContent += `\n--LIGHTSIDE--\nTotal Attack Rating: ${totalAtk1} | Total Defence Rating: ${totalDef1} | Total Teammate Appearances: ${totalTeammateAppearances1} | Total Opponent Appearances: ${totalOpponentAppearances1}\n`;
    textContent += `--DARKSIDE--\nTotal Attack Rating: ${totalAtk2} | Total Defence Rating: ${totalDef2} | Total Teammate Appearances: ${totalTeammateAppearances2} | Total Opponent Appearances: ${totalOpponentAppearances2}\n`;

    // Create a textarea element to hold the text to copy
    const textarea = document.createElement('textarea');
    textarea.value = textContent.trim(); // Remove trailing whitespace

    // Append the textarea to the document body
    document.body.appendChild(textarea);

    // Select the text within the textarea
    textarea.select();

    // Copy the selected text to the clipboard
    document.execCommand('copy');

    // Remove the textarea from the document body
    document.body.removeChild(textarea);

    // Notify the user that the text has been copied
    alert('Teams copied to clipboard!');
}

// Function to pad strings for alignment
function pad(str, width, padChar = ' ') {
    str = str.toString();
    return str + padChar.repeat(Math.max(0, width - str.length));
}

function exportToDoc(pane){
    const key = `${pane.slice(1)}SelectedDate`; 
    if (!selectedDates[key]){
        alert('Please select a date!');
    } else {
        connectToGoogleSheet(pane);
    }
}


function connectToGoogleSheet(pane) {
    google.accounts.oauth2.initTokenClient({
      client_id: "537691008365-a7e703685vonbh9aqm2ge6l7qkbkue6k.apps.googleusercontent.com",
      scope: "https://www.googleapis.com/auth/spreadsheets",
      callback: (response) => {
        console.log("Access Token:", response.access_token);
        fetchGoogleSheetData(response.access_token,pane);
      },
    }).requestAccessToken();
  }
  

  function fetchGoogleSheetData(accessToken, pane) { 
    const spreadsheetId = "1rX5runSBVi63uurXYF1-MeU6v5PJmW712cS31K4KEBw";
    const sheetName = "2025"; // Hardcoded sheet name
    const range = `${sheetName}!A1:E10`; // Use the sheetName variable
  
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    console.error("API Error Details:", err);
                    alert("Your email does not have permission to access the Google Sheet");
                    throw new Error(`API Error: ${err.error.message}`);
                });
            }
            return response.json();
        })
        .then(data => {
            const exportedFixtureListDetails = getCurrentFixtureDetails();
            
            // Call findLastTotalRowAndInsert and insert players after the last total row
            findLastTotalRow(accessToken, spreadsheetId, sheetName, (startRow) => {
                insertPlayersIntoSheet(accessToken, spreadsheetId, sheetName, exportedFixtureListDetails, startRow, pane)
                    .then(() => {
                        // Display success alert if the players were inserted correctly
                        alert("Fixture exported successfully!");
                    })
                    .catch(error => {
                        // Display error alert if there was an issue inserting the players
                        alert("An error occurred while exporting the fixture.");
                        console.error("Error inserting players into sheet:", error);
                    });
            });
        })
        .catch(error => {
            // Display error alert if fetching data fails
            alert("An error occurred while fetching the sheet data.");
            console.error("Error fetching sheet data:", error);
        });
}


function insertPlayersIntoSheet(accessToken, spreadsheetId, sheetName, fixtureDetails, startRow, pane) {
    const lightSidePlayers = fixtureDetails.find(item => item.side === '--LIGHTSIDE--\n')?.players || [];
    const darkSidePlayers = fixtureDetails.find(item => item.side === '--DARKSIDE--\n')?.players || [];
    const numberOfRowsToInsert = Math.max(lightSidePlayers.length, darkSidePlayers.length) + 3;
    const key = `${pane.slice(1)}SelectedDate`;

    // Extract and format the date
    const dateString = selectedDates[key]; // assuming this is something like "2025-01-21"
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString('en-GB', {
        weekday: 'short', // "Tue"
        day: '2-digit',   // "21"
        month: 'short',   // "Jan"
    }).replace(',', ''); // Remove the comma from the formatted date

    console.log("Formatted Date:", formattedDate);

    // Check that getSheetId returns a promise
    getSheetId(accessToken, spreadsheetId, sheetName)
        .then(sheetId => {
            if (!sheetId) {
                throw new Error("Sheet ID is undefined.");
            }

            const insertRequests = [{
                insertDimension: {
                    range: {
                        sheetId: sheetId,
                        dimension: "ROWS",
                        startIndex: startRow,
                        endIndex: startRow + numberOfRowsToInsert, // Insert rows for players + 1 for header
                    }
                }
            }];

            // Insert the first row with emojis and the formatted date in Column A
            insertRequests.push({
                updateCells: {
                    range: {
                        sheetId: sheetId,
                        startRowIndex: startRow,
                        endRowIndex: startRow + 1,
                        startColumnIndex: 0, // Column A (0-based index)
                        endColumnIndex: 10,  // Columns B-J
                    },
                    rows: [{
                        values: [
                            { 
                                userEnteredValue: { stringValue: formattedDate },  // Insert formatted date in Column A
                                userEnteredFormat: { 
                                    horizontalAlignment: "RIGHT", 
                                    textFormat: { 
                                        fontFamily: "Calibri", 
                                        fontSize: 12, 
                                        bold: true
                                    },
                                    backgroundColor: { 
                                        red: 0.471, 
                                        green: 0.565, 
                                        blue: 0.612 
                                    } // Background color #78909c (in RGB format)
                                } 
                            },
                            { userEnteredValue: { stringValue: "🏳️" }, userEnteredFormat: { horizontalAlignment: "CENTER", textFormat: { fontFamily: "Arial", fontSize: 12 } } }, // Column C
                            { userEnteredValue: { stringValue: "🗡️" }, userEnteredFormat: { horizontalAlignment: "CENTER", textFormat: { fontFamily: "Arial", fontSize: 12 } } }, // Column D
                            { userEnteredValue: { stringValue: "🛡️" }, userEnteredFormat: { horizontalAlignment: "CENTER", textFormat: { fontFamily: "Arial", fontSize: 12 } } }, // Column E
                            { userEnteredValue: { stringValue: "" }, userEnteredFormat: { horizontalAlignment: "CENTER", textFormat: { fontFamily: "Arial", fontSize: 12 } } }, // Empty for Column F
                            { userEnteredValue: { stringValue: "" }, userEnteredFormat: { horizontalAlignment: "CENTER", textFormat: { fontFamily: "Arial", fontSize: 12 } } }, // Empty for Column G
                            { userEnteredValue: { stringValue: "🏴" }, userEnteredFormat: { horizontalAlignment: "CENTER", textFormat: { fontFamily: "Arial", fontSize: 12 } } }, // Column H
                            { userEnteredValue: { stringValue: "🗡️" }, userEnteredFormat: { horizontalAlignment: "CENTER", textFormat: { fontFamily: "Arial", fontSize: 12 } } }, // Column I
                            { userEnteredValue: { stringValue: "🛡️" }, userEnteredFormat: { horizontalAlignment: "CENTER", textFormat: { fontFamily: "Arial", fontSize: 12 } } }  // Column J
                        ]
                    }],
                    fields: "userEnteredValue,userEnteredFormat(horizontalAlignment,textFormat,backgroundColor)"
                }
            });

            const createUpdateRequest = (rowIndex, columnIndex, value, bold = false) => ({
                updateCells: {
                    range: {
                        sheetId: sheetId,
                        startRowIndex: rowIndex,
                        endRowIndex: rowIndex + 1,
                        startColumnIndex: columnIndex,
                        endColumnIndex: columnIndex + 1,
                    },
                    rows: [{
                        values: [{
                            userEnteredValue: { stringValue: String(value) },
                            userEnteredFormat: {
                                horizontalAlignment: "CENTER",
                                textFormat: {
                                    fontFamily: "Arial",
                                    fontSize: 12,
                                    bold: bold,
                                }
                            }
                        }]
                    }],
                    fields: "userEnteredValue,userEnteredFormat(horizontalAlignment,textFormat)"
                }
            });

            // Helper to calculate totals
            const calculateTotal = (players, key) => players.reduce((sum, player) => sum + parseFloat(player[key] || 0), 0);

            // Insert LIGHTSIDE players
            lightSidePlayers.forEach((player, index) => {
                const rowIndex = startRow + index + 1; // Row index for LIGHTSIDE
                insertRequests.push(createUpdateRequest(rowIndex, 1, player.playerName)); // Column B: Player name
                insertRequests.push(createUpdateRequest(rowIndex, 2, player.atkRating)); // Column C: Attack rating
                insertRequests.push(createUpdateRequest(rowIndex, 3, player.defRating)); // Column D: Defence rating

                const totalRating = parseFloat(player.atkRating || 0) + parseFloat(player.defRating || 0);
                insertRequests.push(createUpdateRequest(rowIndex, 4, totalRating)); // Column E: Total rating
            });

            // Insert LIGHTSIDE total row
            const lightTotalRowIndex = startRow + lightSidePlayers.length + 1;
            insertRequests.push(createUpdateRequest(lightTotalRowIndex, 1, "TOTAL", true)); // Column B
            insertRequests.push(createUpdateRequest(lightTotalRowIndex, 2, calculateTotal(lightSidePlayers, "atkRating"), true)); // Column C
            insertRequests.push(createUpdateRequest(lightTotalRowIndex, 3, calculateTotal(lightSidePlayers, "defRating"), true)); // Column D
            insertRequests.push(createUpdateRequest(lightTotalRowIndex, 4, calculateTotal(lightSidePlayers, "atkRating") + calculateTotal(lightSidePlayers, "defRating"), true)); // Column E

            // Insert DARKSIDE players
            darkSidePlayers.forEach((player, index) => {
                const rowIndex = startRow + index + 1; // Row index for DARKSIDE
                insertRequests.push(createUpdateRequest(rowIndex, 6, player.playerName)); // Column G: Player name
                insertRequests.push(createUpdateRequest(rowIndex, 7, player.atkRating)); // Column H: Attack rating
                insertRequests.push(createUpdateRequest(rowIndex, 8, player.defRating)); // Column I: Defence rating

                const totalRating = parseFloat(player.atkRating || 0) + parseFloat(player.defRating || 0);
                insertRequests.push(createUpdateRequest(rowIndex, 9, totalRating)); // Column J: Total rating
            });

            // Insert DARKSIDE total row
            const darkTotalRowIndex = startRow + darkSidePlayers.length + 1;
            insertRequests.push(createUpdateRequest(darkTotalRowIndex, 6, "TOTAL", true)); // Column G
            insertRequests.push(createUpdateRequest(darkTotalRowIndex, 7, calculateTotal(darkSidePlayers, "atkRating"), true)); // Column H
            insertRequests.push(createUpdateRequest(darkTotalRowIndex, 8, calculateTotal(darkSidePlayers, "defRating"), true)); // Column I
            insertRequests.push(createUpdateRequest(darkTotalRowIndex, 9, calculateTotal(darkSidePlayers, "atkRating") + calculateTotal(darkSidePlayers, "defRating"), true)); // Column J

            // Send the batch update request
            fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ requests: insertRequests }),
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        console.error("Error inserting players:", err);
                        alert("An error occurred while exporting the fixture.");
                        throw new Error(`API Error: ${err.error.message}`);
                    });
                }
                // Show success alert if data was inserted successfully
                alert("Fixture exported successfully!");
                console.log("Players successfully inserted into the sheet with emojis, formatting, and totals.");
            })
            .catch(error => {
                alert("An error occurred while exporting the fixture.");
                console.error("Error inserting players:", error);
            });
        })
        .catch(error => {
            alert("An error occurred while fetching sheet data.");
            console.error("Error fetching sheet ID:", error);
        });
}










  
  function findLastTotalRow(accessToken, spreadsheetId, sheetName, callback) {
    const range = `${sheetName}!B:B`; // Fetch all of column B
  
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    })
        .then(response => response.json())
        .then(data => {
            const values = data.values || [];
            let lastTotalRow = -1;
  
            // Find the last occurrence of "TOTAL"
            for (let i = values.length - 1; i >= 0; i--) {
                if (values[i][0] && values[i][0].trim().toUpperCase() === "TOTAL") {
                    lastTotalRow = i + 1; // Add 1 to get 1-based index
                    break;
                }
            }
  
            if (lastTotalRow !== -1) {
                console.log(`The last row with "TOTAL" in column B is row: ${lastTotalRow}`);
                callback(lastTotalRow + 1); // Pass the next row to the callback
            } else {
                console.log(`"TOTAL" not found in column B.`);
                callback(0); // Start from the first row if "TOTAL" is not found
            }
        })
        .catch(error => console.error("Error fetching column B data:", error));
}

function getCurrentFixtureDetails() {
    // Initialize arrays to store player data
    let table1Players = [];
    let table2Players = [];

    // Get the player data from table 1
    $('.lineups-table-1 tbody tr').each(function(index) {
        let playerName = $(this).data('playerName');
        if (playerName && !playerName.startsWith('FILLER')) { // Exclude players with names starting with "FILLER"
            let atkRating = $(this).find('td:nth-child(2)').text();
            let defRating = $(this).find('td:nth-child(3)').text();
            let teammateAppearances = $(this).find('td:nth-child(4)').text();
            let opponentAppearances = $(this).find('td:nth-child(5)').text();

            table1Players.push({
                number: index + 1,
                playerName: playerName,
                atkRating: atkRating,
                defRating: defRating,
                teammateAppearances: teammateAppearances,
                opponentAppearances: opponentAppearances
            });
        }
    });

    // Get the player data from table 2
    $('.lineups-table-2 tbody tr').each(function(index) {
        let playerName = $(this).data('playerName');
        if (playerName && !playerName.startsWith('FILLER')) { // Exclude players with names starting with "FILLER"
            let atkRating = $(this).find('td:nth-child(2)').text();
            let defRating = $(this).find('td:nth-child(3)').text();
            let teammateAppearances = $(this).find('td:nth-child(4)').text();
            let opponentAppearances = $(this).find('td:nth-child(5)').text();

            table2Players.push({
                number: index + 1,
                playerName: playerName,
                atkRating: atkRating,
                defRating: defRating,
                teammateAppearances: teammateAppearances,
                opponentAppearances: opponentAppearances
            });
        }
    });

    // Sort players by name in reverse order for each table
    table1Players.sort((a, b) => b.playerName.localeCompare(a.playerName)); // Reverse order
    table2Players.sort((a, b) => b.playerName.localeCompare(a.playerName)); // Reverse order

    // Combine player data with side labels
    let allPlayerData = [
        { side: '--LIGHTSIDE--\n', players: table1Players },
        { side: '--DARKSIDE--\n', players: table2Players }
    ];

    return allPlayerData;
}


  
  
  
  
  
  


//------------------------------------- Generating Team Functions -----------------------------------------------------


function findTeamsHeuristicFunction(players) {
    let team_a_size = 0;
    let team_b_size = 0;
    let team_a_rating = 0;
    let team_b_rating = 0;
    let team_a = [];
    let team_b = [];

    // Convert player ratings to an array of objects with player data and overall rating
    const playerOverallRatings = players.map(player => {
        const overallRating = parseInt(player.playerData.AtkRating) + parseInt(player.playerData.DefRating);
        return {
            player: {
                ...player,
                overallRating: overallRating
            },
            rating: overallRating
        };
    });

    // Finding team structure based on player overall ratings
    for (let item of playerOverallRatings) {
        let rating = item.rating;
        if (team_a_size === team_b_size) {
            if (team_a_rating <= team_b_rating) {
                team_a.push(item);
                team_a_size++;
                team_a_rating += rating;
            } else {
                team_b.push(item);
                team_b_size++;
                team_b_rating += rating;
            }
        } else if (team_b_size > team_a_size) {
            team_a.push(item);
            team_a_size++;
            team_a_rating += rating;
        } else {
            team_b.push(item);
            team_b_size++;
            team_b_rating += rating;
        }
    }

    let swap_counter = 0;

    while (Math.abs(team_a_rating - team_b_rating) > 1) {
        const { newTeamA, newTeamB } = swapPlayersBetweenTeams(team_a, team_b, team_a_rating, team_b_rating);

        if (arraysEqual(newTeamA, team_a)) {
            break;
        }

        team_a = newTeamA;
        team_b = newTeamB;

        team_a_rating = newTeamA.reduce((total, item) => total + item.rating, 0);
        team_b_rating = newTeamB.reduce((total, item) => total + item.rating, 0);

        swap_counter++;

        if (Math.abs(team_a_rating - team_b_rating) === 1 || swap_counter > 10) {
            break;
        }
    }

    let team_a_combinations_list = [];
    let team_a_freq_dict = {};

    for (let item of team_a) {
        let rating = item.rating;
        if (team_a_freq_dict[rating]) {
            team_a_freq_dict[rating]++;
        } else {
            team_a_freq_dict[rating] = 1;
        }
    }

    for (let rating in team_a_freq_dict) {
        team_a_combinations_list.push(findTeamCombinations(rating, team_a_freq_dict[rating]));
    }

    let all_potential_team_a = cartesianProduct(team_a_combinations_list);

    let all_potential_team_a_list = all_potential_team_a.map(team => team.flat());

    let team_combination_sets = all_potential_team_a_list.map(combination => new Set(combination));

    let player_name_superset = new Set(players.map(player => player.playerName));

    let unique_match_list = team_combination_sets.map(team => {
        let team_a_list = Array.from(team);
        let team_b_list = Array.from(new Set([...player_name_superset].filter(x => !team.has(x))));
        return [
            team_a_list.map(playerName => players.find(p => p.playerName === playerName)),
            team_b_list.map(playerName => players.find(p => p.playerName === playerName))
        ];
    });

    console.log("Unique Matches:", unique_match_list);

    return unique_match_list;

    function arraysEqual(arr1, arr2) {
        return arr1.length === arr2.length && arr1.every((value, index) => value === arr2[index]);
    }

    function swapPlayersBetweenTeams(teamA, teamB, teamARating, teamBRating) {
        teamA.sort((a, b) => b.rating - a.rating);
        teamB.sort((a, b) => b.rating - a.rating);

        if (teamARating < teamBRating) {
            for (let bPlayerIndex = 0; bPlayerIndex < teamB.length; bPlayerIndex++) {
                for (let aPlayerIndex = 0; aPlayerIndex < teamA.length; aPlayerIndex++) {
                    if (teamB[bPlayerIndex].rating === teamA[aPlayerIndex].rating + 1) {
                        let bPlayerStored = teamB[bPlayerIndex];
                        teamB[bPlayerIndex] = teamA[aPlayerIndex];
                        teamA[aPlayerIndex] = bPlayerStored;
                        return { newTeamA: teamA, newTeamB: teamB };
                    }
                }
            }
        } else {
            for (let aPlayerIndex = 0; aPlayerIndex < teamA.length; aPlayerIndex++) {
                for (let bPlayerIndex = 0; bPlayerIndex < teamB.length; bPlayerIndex++) {
                    if (teamA[aPlayerIndex].rating === teamB[bPlayerIndex].rating + 1) {
                        let aPlayerStored = teamA[aPlayerIndex];
                        teamA[aPlayerIndex] = teamB[bPlayerIndex];
                        teamB[bPlayerIndex] = aPlayerStored;
                        return { newTeamA: teamA, newTeamB: teamB };
                    }
                }
            }
        }

        return { newTeamA: teamA, newTeamB: teamB };
    }

    function findTeamCombinations(rating, ratingFrequency) {
        let players_with_rating = playerOverallRatings.filter(player => player.rating == rating);
        let combinations = getCombinations(players_with_rating, ratingFrequency);
        return combinations.map(combination => combination.map(player => player.player.playerName));
    }

    function getCombinations(arr, k) {
        let i, subI, ret = [], sub, next;
        for (i = 0; i < arr.length; i++) {
            if (k === 1) {
                ret.push([arr[i]]);
            } else {
                sub = getCombinations(arr.slice(i + 1, arr.length), k - 1);
                for (subI = 0; subI < sub.length; subI++) {
                    next = sub[subI];
                    next.unshift(arr[i]);
                    ret.push(next);
                }
            }
        }
        return ret;
    }

    function cartesianProduct(arr) {
        return arr.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())));
    }
}

async function fetchJSONFromFirebase(filePath) {
    const response = await fetch(filePath);
    return await response.json();
}

async function generateBalancedTeams(unique_match_list, players) {
    const teammateAppearancesJson = await fetchJSONFromFirebase('https://firebasestorage.googleapis.com/v0/b/wintroverts-90302.appspot.com/o/teammate_appearances_counts.json?alt=media');
    const opponentAppearancesJson = await fetchJSONFromFirebase('https://firebasestorage.googleapis.com/v0/b/wintroverts-90302.appspot.com/o/opponent_appearances_counts.json?alt=media');

    let team_rating_dict = {};
    let player_rating_dict = {};

    // Build player rating dictionary
    players.forEach(player => {
        player_rating_dict[player.playerName] = {
            'Defending': parseInt(player.playerData.DefRating),
            'Attacking': parseInt(player.playerData.AtkRating)
        };
    });

    // Calculate team ratings for each match
    unique_match_list.forEach(pair_of_teams => {
        let team_1 = pair_of_teams[0].map(player => player.playerName);
        let team_2 = pair_of_teams[1].map(player => player.playerName);

        let team_1_ratings = getTeamRatings(team_1, player_rating_dict);
        let team_2_ratings = getTeamRatings(team_2, player_rating_dict);

        team_rating_dict[team_1.join(",")] = team_1_ratings;
        team_rating_dict[team_2.join(",")] = team_2_ratings;
    });

    // Calculate match balances
    let match_balances = unique_match_list.map(pair_of_teams => {
        let teamA = pair_of_teams[0].map(player => ({
            playerName: player.playerName,
            playerData: {
                ...player.playerData,
                teammates: calculateTeammateAppearances(pair_of_teams[0].map(p => p.playerName), teammateAppearancesJson)[player.playerName],
                opponents: calculateOpponentTeammateAppearances(pair_of_teams[0].map(p => p.playerName), pair_of_teams[1].map(p => p.playerName), opponentAppearancesJson)[player.playerName]
            }
        }));
        let teamB = pair_of_teams[1].map(player => ({
            playerName: player.playerName,
            playerData: {
                ...player.playerData,
                teammates: calculateTeammateAppearances(pair_of_teams[1].map(p => p.playerName), teammateAppearancesJson)[player.playerName],
                opponents: calculateOpponentTeammateAppearances(pair_of_teams[1].map(p => p.playerName), pair_of_teams[0].map(p => p.playerName), opponentAppearancesJson)[player.playerName]
            }
        }));

        let balance = calculateMatchBalance([teamA.map(player => player.playerName), teamB.map(player => player.playerName)], team_rating_dict);

        return {
            teams: [teamA, teamB],
            balance: balance,
            totalTeammateAppearancesTeamA: calculateTotalTeammateAppearances(teamA),
            totalTeammateAppearancesTeamB: calculateTotalTeammateAppearances(teamB),
            totalOpponentAppearancesTeamA: calculateTotalOpponentAppearances(teamA),
            totalOpponentAppearancesTeamB: calculateTotalOpponentAppearances(teamB)
        };
    });

    // Find the minimum balance score
    let min_balance = Math.min(...match_balances.map(match => match.balance));

    // Filter matches to include only those with the minimum balance score
    let balanced_matches = match_balances.filter(match => match.balance === min_balance);

   // Custom sort function based on the provided criteria
   function customMatchSort(a, b) {
    const aValue = [
        a.balance,
        (a.totalTeammateAppearancesTeamA + a.totalTeammateAppearancesTeamB)**2 + (a.totalOpponentAppearancesTeamA + a.totalOpponentAppearancesTeamB)**2,
        a.totalTeammateAppearancesTeamA + a.totalTeammateAppearancesTeamB,
        a.totalOpponentAppearancesTeamA + a.totalOpponentAppearancesTeamB
    ];
    const bValue = [
        b.balance,
        (b.totalTeammateAppearancesTeamA + b.totalTeammateAppearancesTeamB)**2 + (b.totalOpponentAppearancesTeamA + b.totalOpponentAppearancesTeamB)**2,
        b.totalTeammateAppearancesTeamA + b.totalTeammateAppearancesTeamB,
        b.totalOpponentAppearancesTeamA + b.totalOpponentAppearancesTeamB
    ];

    for (let i = 0; i < aValue.length; i++) {
        if (aValue[i] < bValue[i]) return -1;
        if (aValue[i] > bValue[i]) return 1;
    }
    return 0;
    }

    // Sort the balanced matches
    balanced_matches.sort(customMatchSort);

    // When generating teams, randomly pick between the first (up to) 10 best results
    const randomIndex = Math.floor(Math.random() * Math.min(balanced_matches.length, 10));

    console.log("team picked is no: ",randomIndex)

    console.log("Balanced Matches with best (lowest) balance:", balanced_matches);

    return { teamA: balanced_matches[randomIndex]?.teams[0] || [], teamB: balanced_matches[randomIndex]?.teams[1] || [] };
} 

function calculateTeammateAppearances(team, appearancesData) {
    let appearances = {};
    
    // Initialize appearances object for each player in the team for appearances
    team.forEach(player => {
        appearances[player] = {
            totalTeammateAppearances: 0,
            teammates: {}
        };
    });

    // Calculate teammate appearances within the same team
    for (let i = 0; i < team.length; i++) {
        for (let j = i + 1; j < team.length; j++) {
            let pair1 = team[i] + "+" + team[j];
            let pair2 = team[j] + "+" + team[i];

            // Check if pair1 exists in appearancesData
            if (appearancesData[pair1]) {
                appearances[team[i]].totalTeammateAppearances += appearancesData[pair1];
                appearances[team[j]].totalTeammateAppearances += appearancesData[pair1];
                appearances[team[i]].teammates[team[j]] = appearancesData[pair1];
                appearances[team[j]].teammates[team[i]] = appearancesData[pair1];
            }

            // Check if pair2 exists in appearancesData (handle case where player comes after +)
            if (appearancesData[pair2]) {
                appearances[team[j]].totalTeammateAppearances += appearancesData[pair2];
                appearances[team[i]].totalTeammateAppearances += appearancesData[pair2];
                appearances[team[j]].teammates[team[i]] = appearancesData[pair2];
                appearances[team[i]].teammates[team[j]] = appearancesData[pair2];
            }
        }
    }

    return appearances;
}

// Function to calculate opponent appearances for a player
function calculateOpponentTeammateAppearances(teamA, teamB, appearancesData) {
    let opponentAppearances = {};

    // Initialize opponentAppearances object for each player in teamA
    teamA.forEach(playerA => {
        opponentAppearances[playerA] = {
            totalOpponentAppearances: 0,
            opponents: {}
        };

        // Initialize opponents object for each playerA to store appearances with players in teamB
        teamB.forEach(opponent => {
            opponentAppearances[playerA].opponents[opponent] = 0; // Initialize to 0 or leave empty if no data available initially
        });
    });

    // Calculate opponent teammate appearances between teamA and teamB
    teamA.forEach(playerA => {
        teamB.forEach(opponent => {
            let pair1 = playerA + "+" + opponent;
            let pair2 = opponent + "+" + playerA;

            // Check if pair1 or pair2 exists in appearancesData
            if (appearancesData[pair1]) {
                opponentAppearances[playerA].totalOpponentAppearances += appearancesData[pair1];
                opponentAppearances[playerA].opponents[opponent] += appearancesData[pair1];
            }
            if (appearancesData[pair2]) {
                opponentAppearances[playerA].totalOpponentAppearances += appearancesData[pair2];
                opponentAppearances[playerA].opponents[opponent] += appearancesData[pair2];
            }
        });
    });

    return opponentAppearances;
}


// Helper function to calculate total teammate appearances
function calculateTotalTeammateAppearances(team) {
    return team.reduce((total, player) => total + player.playerData.teammates.totalTeammateAppearances, 0);
}

// Helper function to calculate total opponent appearances
function calculateTotalOpponentAppearances(team) {
    return team.reduce((total, player) => total + player.playerData.opponents.totalOpponentAppearances, 0);
}

function calculateNetDifference(rating1, rating2) {
    return Math.sqrt((rating1 - rating2) ** 2);
}

function calculateMatchBalance(pair_of_teams, team_rating_dict) {
    let team_1_ratings = team_rating_dict[pair_of_teams[0].join(",")];
    let team_2_ratings = team_rating_dict[pair_of_teams[1].join(",")];

    let defensive_difference = calculateNetDifference(team_1_ratings['Defending'], team_2_ratings['Defending']);
    let attacking_difference = calculateNetDifference(team_1_ratings['Attacking'], team_2_ratings['Attacking']);
    let overall_difference = calculateNetDifference(team_1_ratings['Overall'], team_2_ratings['Overall']);

    let match_balance_rating_score = (defensive_difference + attacking_difference) * (overall_difference + 1);

    return match_balance_rating_score;
}

function getTeamRatings(team, player_rating_dict) {
    let team_ratings = {'Defending': 0, 'Attacking': 0, 'Overall': 0};

    team.forEach(player_name => {
        let player_defence_rating = player_rating_dict[player_name]['Defending'];
        let player_attack_rating = player_rating_dict[player_name]['Attacking'];

        team_ratings['Defending'] += player_defence_rating;
        team_ratings['Attacking'] += player_attack_rating;
        team_ratings['Overall'] += player_defence_rating + player_attack_rating;
    });

    return team_ratings;
}




//------------------------------------- Helper Functions -------------------------------------------------------------

function sortTable(venue, column, order) {
    const table = document.getElementById(`${venue}Table`);
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));

    rows.sort((a, b) => {
        let cellA, cellB;

        if (column === 'Available') {
            // For Available column, compare checkbox states
            cellA = a.querySelector(`td[data-field="${column}"] input`).checked;
            cellB = b.querySelector(`td[data-field="${column}"] input`).checked;

            if (order === 'asc') {
                return (cellA === cellB) ? 0 : cellA ? -1 : 1;
            } else {
                return (cellA === cellB) ? 0 : cellA ? 1 : -1;
            }
        } else {
            // For other columns, compare text content
            cellA = a.querySelector(`td[data-field="${column}"]`).textContent.trim();
            cellB = b.querySelector(`td[data-field="${column}"]`).textContent.trim();

            if (order === 'asc') {
                return cellA.localeCompare(cellB, undefined, { numeric: true });
            } else {
                return cellB.localeCompare(cellA, undefined, { numeric: true });
            }
        }
    });

    // Append sorted rows to tbody
    rows.forEach(row => tbody.appendChild(row));
}

function handleCellUpdate(venue, event) {
    const cell = event.target;
    const newValue = cell.textContent.trim();
    const playerKey = cell.dataset.key;
    const field = cell.dataset.field;

    if (field === 'Player') {
        // Only update the database if the content has changed
        if (newValue !== playerKey) {
            updateDatabase(venue, playerKey, field, newValue);
        }
    } else {
        updateDatabase(venue, playerKey, field, newValue);
    }
}

function updateDatabase(venue, playerKey, field, newValue) {
    const dbRef = firebase.database().ref(`${venue}/Players/${playerKey}`);
    const updatedData = {};

    if (field === 'Player') {
        // Check if the player name (key) is being updated
        const playerDataRef = firebase.database().ref(`${venue}/Players/${playerKey}`);
        playerDataRef.once('value', (snapshot) => {
            const playerData = snapshot.val();
            if (playerData) {
                // Delete the old key
                const updates = {};
                updates[`${venue}/Players/${playerKey}`] = null;

                // Create a new key with the updated player name
                const newPlayerKey = newValue;
                updates[`${venue}/Players/${newPlayerKey}`] = playerData;

                // Update the database
                firebase.database().ref().update(updates)
                    .then(() => {
                        console.log(`Player name updated from ${playerKey} to ${newPlayerKey}`);
                        // Refresh the table
                        getDatabase().then(data => {
                            populateTable(venue, data);
                        });
                    })
                    .catch((error) => {
                        console.error('Error updating player name:', error);
                    });
            }
        });
    } else {
        updatedData[field] = newValue;
        dbRef.update(updatedData, (error) => {
            if (error) {
                console.error('Error updating database:', error);
            } else {
                console.log('Database updated successfully');
            }
        });
    }
}


function handleAvailableToggle(venue, event) {
    const checkbox = event.target;
    const isChecked = checkbox.checked;
    const playerKey = checkbox.dataset.key;

    const dbRef = firebase.database().ref(`${venue}/Players/${playerKey}`);
    dbRef.update({ Available: isChecked }, (error) => {
        if (error) {
            console.error('Error updating Available:', error);
        } else {
            console.log('Available updated successfully');
            updateAvailablePlayersText(venue);
        }
    });

    const row = checkbox.closest('tr');
    if (isChecked) {
        row.classList.remove('row-not-available');
    } else {
        row.classList.add('row-not-available');
    }
}

function handleDeleteButtonClick(venue, event) {
    const button = event.target.closest('button');
    const playerKey = button.dataset.key;

    

    const dbRef = firebase.database().ref(`${venue}/Players/${playerKey}`);
    dbRef.remove()
        .then(() => {
            console.log('Player deleted successfully');
            // Remove the row from the table
            const row = button.closest('tr');
            const tableBody = row.closest('tbody');
            row.remove();

            // Check if there are no rows left in the table body
            if (tableBody.rows.length === 0) {
                // Remove the table headers
                const table = tableBody.closest('table');
                const tableHead = table.querySelector('thead');
                if (tableHead) {
                    tableHead.remove();
                }

                if (venue === "peffermill") {
                    formattedVenue = "Peffermill";
                } else if (venue === "portobello") {
                    formattedVenue = "Portobello";
                } else {
                    formattedVenue = "CornExchange";
                }

                // Disable the increment and decrement buttons
                const incrementBtn = document.getElementById(`incrementAppearancesBtn${formattedVenue}`);
                const decrementBtn = document.getElementById(`decrementAppearancesBtn${formattedVenue}`);
                const generateBtn = document.getElementById(`generateTeamBtn${formattedVenue}`);

                incrementBtn.disabled = true;
                incrementBtn.classList.remove('button-enabled');
                incrementBtn.classList.add('button-disabled');

                decrementBtn.disabled = true;
                decrementBtn.classList.remove('button-enabled');
                decrementBtn.classList.add('button-disabled');

                if (formattedVenue === "Peffermill") {
                    generateBtn.disabled = true;
                    generateBtn.classList.remove('button-enabled');
                    generateBtn.classList.add('button-disabled');
                }
            } else if (formattedVenue === "Peffermill") {
                // Enable/disable the generate button based on the number of rows
                const generateBtn = document.getElementById(`generateTeamBtn${formattedVenue}`);
                if (tableBody.rows.length >= 2) {
                    generateBtn.disabled = false;
                    generateBtn.classList.remove('button-disabled');
                    generateBtn.classList.add('button-enabled');
                } else {
                    generateBtn.disabled = true;
                    generateBtn.classList.remove('button-enabled');
                    generateBtn.classList.add('button-disabled');
                }
            }

            updateAvailablePlayersText(venue);
        })
        .catch((error) => {
            console.error(`Error deleting player from ${venue} venue:`, error);
        });
}

function updateAvailablePlayersText(venue) {
    let formattedVenue;
    if (venue === "peffermill") {
        formattedVenue = "Peffermill";
    } else if (venue === "portobello") {
        formattedVenue = "Portobello";
    } else {
        formattedVenue = "CornExchange";
    }

    const availablePlayersCountElement = document.getElementById(`available${formattedVenue}PlayersCount`);
    if (availablePlayersCountElement) {
        const table = document.getElementById(`${venue}Table`);
        const availablePlayersCount = table.querySelectorAll('.Available-toggle:checked').length;
        availablePlayersCountElement.textContent = "Available Players: " + availablePlayersCount;
    } else {
        console.error('Element id not found.');
    }
}
  
  // Function to increment appearances for a player
  function incrementAppearances(venue, playerKey) {
    const dbRef = firebase.database().ref(`${venue}/Players/${playerKey}`);
    dbRef.once('value', (snapshot) => {
        const playerData = snapshot.val();
        const currentAppearances = parseInt(playerData.Apps) || 0; // Parse as integer
        const newAppearances = currentAppearances + 1;
        dbRef.update({
            Apps: newAppearances
        }).then(() => {
            console.log('Appearances incremented successfully');
            // Refresh the table
            getDatabase().then(data => {
                populateTable(venue, data);
            }).catch(error => {
                console.error('Error fetching data after incrementing appearances:', error);
            });
        }).catch((error) => {
            console.error('Error incrementing appearances:', error);
        });
    });
}

// Function to decrement appearances for a player
function decrementAppearances(venue, playerKey) {
    const dbRef = firebase.database().ref(`${venue}/Players/${playerKey}`);
    dbRef.once('value', (snapshot) => {
        const playerData = snapshot.val();
        const currentAppearances = parseInt(playerData.Apps) || 0; // Parse as integer
        const newAppearances = Math.max(currentAppearances - 1, 0); // Ensure new value is not negative
        dbRef.update({
            Apps: newAppearances
        }).then(() => {
            console.log('Appearances decremented successfully');
            // Refresh the table
            getDatabase().then(data => {
                populateTable(venue, data);
            }).catch(error => {
                console.error(`Error fetching data after decrementing appearances for ${venue}:`, error);
            });
        }).catch((error) => {
            console.error(`Error decrementing appearances for ${venue}:`, error);
        });
    });
}
  
function addNewPlayer(venue, playerName) {
    const defaultImageURL = 'default.png'; // URL of the default image

    const dbRef = firebase.database().ref(`${venue}/Players`);

    // Check if playerName is not empty and if the player already exists in the database
    if (playerName.trim() !== "") {
        dbRef.once('value', (snapshot) => {
            if (!snapshot.hasChild(playerName)) {
                // Player does not exist, create a new player entry
                dbRef.child(playerName).set({
                    Apps: 0,
                    AtkRating: 0,
                    Availability: false,
                    DefRating: 0,
                    Goals: 0,
                    Position: '',
                    image: 'default' // Set the image field to 'default' to indicate the default picture
                }).then(() => {
                    console.log('New player added successfully');
                    $('#addPlayerModal').modal('hide'); // Hide the modal after adding the player
                    // After successfully adding the player, update the table
                    getDatabase().then(data => {
                        populateTable(venue, data);
                    }).catch(error => {
                        console.error('Error fetching data after adding player:', error);
                    });
                }).catch((error) => {
                    console.error('Error adding new player:', error);
                });
            } else {
                alert('Player already exists');
            }
        });
    } else {
        alert('Player name cannot be empty');
    }
}

function generateRatingOptions(selectedRating) {
    let options = '';
    for (let i = 0; i <= 5; i++) {
        options += `<option value="${i}" ${i == selectedRating ? 'selected' : ''}>${i}</option>`;
    }
    return options;
}

function getSheetId(accessToken, spreadsheetId, sheetName) {
    return fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then(response => response.json())
      .then(data => {
        const sheet = data.sheets.find(sheet => sheet.properties.title === sheetName);
        if (!sheet) {
          throw new Error(`Sheet with name "${sheetName}" not found.`);
        }
        return sheet.properties.sheetId;
      });
  }
  