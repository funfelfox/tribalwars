/*
 * Script Name: Clear Barbarian Walls
 * Version: v1.4.2
 * Last Updated: 2023-10-04
 * Author: RedAlert
 * Author URL: https://twscripts.dev/
 * Author Contact: redalert_tw (Discord)
 * Approved: N/A
 * Approved Date: 2021-04-21
 * Mod: JawJaw
 */

/*--------------------------------------------------------------------------------------
 * This script can NOT be cloned and modified without permission from the script author.
 --------------------------------------------------------------------------------------*/

var scriptData = {
    name: 'Clear Barbarian Walls',
    version: 'v1.4.2',
    author: 'RedAlert',
    authorUrl: 'https://twscripts.dev/',
    helpLink:
        'https://forum.tribalwars.net/index.php?threads/clear-barbarian-walls.286971/',
};

// User Input
if (typeof DEBUG !== 'boolean') DEBUG = false; // enable/disable debug mode

// Globals
var ALLOWED_GAME_SCREENS = ['map']; // list of game screens where script can be executed
var COORDS_REGEX = /[0-9]{1,3}\|[0-9]{1,3}/g; // regex for coordinates

if (typeof TWMap === 'undefined') TWMap = {};
if ('TWMap' in window) mapOverlay = TWMap;

// Data Store Config
var STORAGE_KEY = 'RA_CBW_STORE'; // key for sessionStorage
var DEFAULT_STATE = {
    MAX_BARBARIANS: 100,
    MAX_FA_PAGES_TO_FETCH: 20,
    WALL_LEVEL: 1,
    PARTIAL_LOSSES_REPORTS: true,
};

// Translations
var translations = {
    en_DK: {
        'Clear Barbarian Walls': 'Clear Barbarian Walls',
        Help: 'Help',
        'This script requires PA and FA to be active!':
            'This script requires PA and FA to be active!',
        'Redirecting...': 'Redirecting...',
        'Fetching FA pages...': 'Fetching FA pages...',
        'Finished fetching FA pages!': 'Finished fetching FA pages!',
        Fetching: 'Fetching',
        'No barbarian villages found fitting the criteria!':
            'No barbarian villages found fitting the criteria!',
        Type: 'Type',
        Barbarian: 'Barbarian',
        Report: 'Report',
        Distance: 'Distance',
        Wall: 'Wall',
        'Last Attack Time': 'Last Attack Time',
        Actions: 'Actions',
        Attack: 'Attack',
        'barbarian villages where found': 'barbarian villages where found',
        'Showing the first': 'Showing the first',
        'barbarian villages.': 'barbarian villages.',
        Settings: 'Settings',
        'Save Settings': 'Save Settings',
        'Maximum villages to show on the table':
            'Maximum villages to show on the table',
        'Maximum FA Pages to fetch': 'Maximum FA Pages to fetch',
        'Minimum Wall Level': 'Minimum Wall Level',
        'Settings saved!': 'Settings saved!',
        'Include reports with partial losses':
            'Include reports with partial losses',
    },
};

// Init Debug
initDebug();

// Initialize script logic
async function initClearBarbarianWalls(store) {
    const {
        MAX_BARBARIANS,
        MAX_FA_PAGES_TO_FETCH,
        WALL_LEVEL,
        PARTIAL_LOSSES_REPORTS,
    } = store;
    const faURLs = await fetchFAPages(MAX_FA_PAGES_TO_FETCH);

    // Show progress bar and notify user
    startProgressBar(faURLs.length);
    UI.SuccessMessage(tt('Fetching FA pages...'));

    const faPages = [];
    jQuery.fetchAll(
        faURLs,
        function (index, data) {
            updateProgressBar(index, faURLs.length);
            const { plunder_list } = data;
            faPages.push(...plunder_list);
        },
        function () {
            const faTableRows = getFATableRows(faPages);
            const barbarians = getFABarbarians(
                faTableRows,
                WALL_LEVEL,
                PARTIAL_LOSSES_REPORTS
            );

            const content = prepareContent(barbarians, MAX_BARBARIANS);
            renderUI(content);
            jQuery('#barbVillagesCount').text(barbarians.length);

            updateMap(barbarians);

            // event handlers
            showSettingsPanel(store);
        },
        function (error) {
            UI.ErrorMessage('Error fetching FA pages!');
            console.error(`${scriptInfo()} Error:`, error);
        }
    );
}

// Update map to include barbarians
function updateMap(barbarians) {
    const barbCoords = barbarians.map((barbarian) => barbarian.coord);
    // Show wall level of barbarian villages on the Map
    if (mapOverlay.mapHandler._spawnSector) {
        //exists already, don't recreate
    } else {
        //doesn't exist yet
        mapOverlay.mapHandler._spawnSector = mapOverlay.mapHandler.spawnSector;
    }

    TWMap.mapHandler.spawnSector = function (data, sector) {
        // Override Map Sector Spawn
        mapOverlay.mapHandler._spawnSector(data, sector);
        var beginX = sector.x - data.x;
        var endX = beginX + mapOverlay.mapSubSectorSize;
        var beginY = sector.y - data.y;
        var endY = beginY + mapOverlay.mapSubSectorSize;
        for (var x in data.tiles) {
            var x = parseInt(x, 10);
            if (x < beginX || x >= endX) {
                continue;
            }
            for (var y in data.tiles[x]) {
                var y = parseInt(y, 10);

                if (y < beginY || y >= endY) {
                    continue;
                }
                var xCoord = data.x + x;
                var yCoord = data.y + y;
                var v = mapOverlay.villages[xCoord * 1000 + yCoord];
                if (v) {
                    var vXY = '' + v.xy;
                    var vCoords = vXY.slice(0, 3) + '|' + vXY.slice(3, 6);
                    if (barbCoords.includes(vCoords)) {
                        const currentBarbarian = barbarians.find(
                            (obj) => obj.villageId == v.id
                        );

                        const eleDIV = $('<div></div>')
                            .css({
                                border: '1px coral solid',
                                position: 'absolute',
                                backgroundColor: '#000',
                                color: '#fff',
                                width: '30px',
                                height: '15px',
                                marginTop: '20px',
                                marginLeft: '10px',
                                display: 'block',
                                zIndex: '10',
                                fontWeight: 'normal',
                                textAlign: 'center',
                            })
                            .attr('id', 'dsm' + v.id)
                            .html(currentBarbarian.wall);

                        sector.appendElement(
                            eleDIV[0],
                            data.x + x - sector.x,
                            data.y + y - sector.y
                        );
                    }
                }
            }
        }
    };

    mapOverlay.reload();
}

// Prepare content
function prepareContent(villages, maxBarbsToShow) {
    if (villages.length) {
        const barbsTable = buildBarbsTable(villages, maxBarbsToShow);
        var content = `
			<div>
				<p>
					<b><span id="barbVillagesCount"></span> ${tt(
                        'barbarian villages where found'
                    )}</b><br>
					<em>${tt('Showing the first')} ${maxBarbsToShow} ${tt(
            'barbarian villages.'
        )}</em>
				</p>
			</div>
			<div class="ra-table-container">
				${barbsTable}
			</div>
		`;

        return content;
    } else {
        return `<b>${tt(
            'No barbarian villages found fitting the criteria!'
        )}</b>`;
    }
}

// Render UI
function renderUI(body) {
    const content = `
        <div class="ra-clear-barbs-walls" id="raClearBarbWalls">
			<div class="ra-clear-barbs-walls-header">
				<h3>${tt(scriptData.name)}</h3>
				<a href="javascript:void(0);" id="showSettingsPanel" class="btn-show-settings">
					<span class="icon header settings"></span>
				</a>
			</div>
            <div class="ra-clear-barbs-walls-body">
                ${body}
            </div>
			<div class="ra-clear-barbs-walls-footer">
				<small>
					<strong>
						${tt(scriptData.name)} ${scriptData.version}
					</strong> -
					<a href="${scriptData.authorUrl}" target="_blank" rel="noreferrer noopener">
						${scriptData.author}
					</a> -
					<a href="${scriptData.helpLink}" target="_blank" rel="noreferrer noopener">
						${tt('Help')}
					</a>
				</small>
			</div>
        </div>
        <style>
            .ra-clear-barbs-walls { position: relative; display: block; width: 100%; height: auto; clear: both; margin: 10px 0 15px; border: 1px solid #603000; box-sizing: border-box; background: #f4e4bc; }
            .ra-clear-barbs-walls * { box-sizing: border-box; }
			.ra-clear-barbs-walls > div { padding: 10px; }
            .ra-clear-barbs-walls .btn-confirm-yes { padding: 3px; }
			.ra-clear-barbs-walls-header { display: flex; align-items: center; justify-content: space-between; background-color: #c1a264 !important; background-image: url(/graphic/screen/tableheader_bg3.png); background-repeat: repeat-x; }
			.ra-clear-barbs-walls-header h3 { margin: 0; padding: 0; line-height: 1; }
			.ra-clear-barbs-walls-body p { font-size: 14px; }
            .ra-clear-barbs-walls-body label { display: block; font-weight: 600; margin-bottom: 6px; }
            
			/* Table Styling */
			.ra-table-container { overflow-y: auto; overflow-x: hidden; height: auto; max-height: 312px;border: 1px solid #bc6e1f; }
			.ra-table th { font-size: 14px; }
			.ra-table th,
            .ra-table td { padding: 3px; text-align: center; }
            .ra-table td a { word-break: break-all; }
			.ra-table a:focus { color: blue; }
			.ra-table a.btn:focus { color: #fff; }
			.ra-table tr:nth-of-type(2n) td { background-color: #f0e2be }
			.ra-table tr:nth-of-type(2n+1) td { background-color: #fff5da; }

			/* Popup */
			.ra-popup-content { width: 360px; }
			.ra-popup-content * { box-sizing: border-box; }
			.ra-popup-content input[type="text"] { padding: 3px; width: 100%; }

			/* Helpers */
            .ra-mb15 { margin-bottom: 15px; }

			/* Elements */
			.already-sent-command { opacity: 0.6; }
        </style>
    `;

    if (jQuery('#raClearBarbWalls').length < 1) {
        jQuery('#contentContainer').prepend(content);
    } else {
        jQuery('.ra-clear-barbs-walls-body').html(body);
    }
}

// Action Handlers: Show Settings Panel
function showSettingsPanel(store) {
    jQuery('#showSettingsPanel').on('click', function (e) {
        e.preventDefault();

        const {
            MAX_BARBARIANS,
            MAX_FA_PAGES_TO_FETCH,
            WALL_LEVEL,
            PARTIAL_LOSSES_REPORTS,
        } = store;

        const content = `
			<div class="ra-popup-content">
				<div class="ra-popup-header">
					<h3>${tt('Settings')}</h3>
				</div>
				<div class="ra-popup-body ra-mb15">
					<table class="ra-settings-table" width=100%">
						<tbody>
							<tr>
								<td width="80%">
									<label for="maxBarbVillages">
										${tt('Maximum villages to show on the table')}
									</label>
								</td>
								<td width="30%">
									<input type="text" name="max_barb_villages" id="maxBarbVillages" value="${MAX_BARBARIANS}" />
								</td>
							</tr>
							<tr>
								<td width="80%">
									<label for="maxFApages">
										${tt('Maximum FA Pages to fetch')}
									</label>
								</td>
								<td width="30%">
									<input type="text" name="max_fa_pages" id="maxFApages" value="${MAX_FA_PAGES_TO_FETCH}" />
								</td>
							</tr>
							<tr>
								<td width="80%">
									<label for="minWallLevel">
										${tt('Minimum Wall Level')}
									</label>
								</td>
								<td width="30%">
									<input type="text" name="min_wall_level" id="minWallLevel" value="${WALL_LEVEL}" />
								</td>
							</tr>
							<tr>
								<td width="80%">
									<label for="minWallLevel">
										${tt('Include reports with partial losses')}
									</label>
								</td>
								<td width="30%">
									<input type="checkbox" name="partial_losses_reports" id="partialLossesReports" ${
                                        PARTIAL_LOSSES_REPORTS ? 'checked' : ''
                                    } />
								</td>
							</tr>
						</tbody>
					</table>
				</div>
				<div class="ra-popup-footer">
					<a href="javascript:void(0);" id="saveSettingsBtn" class="btn btn-confirm-yes">
						${tt('Save Settings')}
					</a>
				</div>
			</div>
		`;

        Dialog.show('SettingsPanel', content);

        saveSettings();
    });
}

// Action Handlers: Save Settings
function saveSettings() {
    jQuery('#saveSettingsBtn').on('click', function (e) {
        e.preventDefault();

        const maxBarbVillages = jQuery('#maxBarbVillages').val();
        const maxFApages = jQuery('#maxFApages').val();
        const minWallLevel = jQuery('#minWallLevel').val();
        const partialLossesReports = jQuery('#partialLossesReports').is(
            ':checked'
        );

        const data = {
            MAX_BARBARIANS: maxBarbVillages,
            MAX_FA_PAGES_TO_FETCH: maxFApages,
            WALL_LEVEL: minWallLevel,
            PARTIAL_LOSSES_REPORTS: partialLossesReports,
        };

        writeStorage(data, readStorage(DEFAULT_STATE));
        UI.SuccessMessage(tt('Settings saved!'), 1000);

        // Update UI to reflect new settings
        initClearBarbarianWalls(data);
    });
}

// Build barbs table
function buildBarbsTable(villages, maxBarbsToShow) {
    villages = villages.slice(0, maxBarbsToShow);

    let barbsTable = `
		<table class="ra-table" width="100%">
			<thead>
				<tr>
					<th>
						#
					</th>
					<th>
						${tt('Type')}
					</th>
					<th>
						${tt('Barbarian')}
					</th>
					<th>
						${tt('Report')}
					</th>
					<th>
						${tt('Distance')}
					</th>
					<th>
						${tt('Wall')}
					</th>
					<th>
						${tt('Last Attack Time')}
					</th>
					<th>
						${tt('Actions')}
					</th>
				</tr>
			</thead>
			<tbody>
	`;

    villages.forEach((village, index) => {
        index++; // update index so it starts at 1 instead of 0
        const { villageId, coord, wall, reportId, reportTime, type, distance } =
            village;

        const unitsToSend = calculateUnitsToSend(wall);

        const villageUrl = `${game_data.link_base_pure}info_village&id=${villageId}`;
        const reportUrl = `${game_data.link_base_pure}report&mode=all&view=${reportId}`;
        const commandUrl = `${game_data.link_base_pure}place&target=${villageId}${unitsToSend}&wall=${wall}`;

        barbsTable += `
			<tr>
				<td>
					${index}
				</td>
				<td>
					<img src="${type}">
				</td>
				<td>
					<a href="${villageUrl}" target="_blank" rel="noopener noreferrer">
						${coord}
					</a>
				</td>
				<td>
					<a href="${reportUrl}" target="_blank" rel="noopener noreferrer">
						<span class="icon header new_report"></span>
					</a>
				</td>
				<td>
					${distance}
				</td>
				<td>
					${wall !== '?' ? wall : '<b style="color:red;">?</b>'}
				</td>
				<td>
					${reportTime}
				</td>
				<td>
					<a href="${commandUrl}" onClick="highlightOpenedCommands(this);" class="ra-clear-barb-wall-btn btn" target="_blank" rel="noopener noreferrer">
						${tt('Attack')}
					</a>
				</td>
			</tr>
		`;
    });

    barbsTable += `
			</tbody>
		</table>
	`;

    return barbsTable;
}

// Action Handler: Highlight Opened Commands
function highlightOpenedCommands(element) {
    element.classList.add('btn-confirm-yes');
    element.classList.add('btn-already-sent');
    element.parentElement.parentElement.classList.add('already-sent-command');
}

// Helper: Get FA pages URLs for AJAX
async function fetchFAPages(maxFAPagesToFetch) {
    const faPageURLs = await jQuery
        .get(game_data.link_base_pure + 'am_farm')
        .then((response) => {
            const htmlDoc = jQuery.parseHTML(response);
            const plunderListNav = jQuery(htmlDoc).find(
                '#plunder_list_nav:eq(0) a'
            );
            const firstFApage =
                game_data.link_base_pure +
                `am_farm&ajax=page_entries&Farm_page=0&class=&extended=1`;

            // Getting amount of LA pages
            const faPageURLs = [firstFApage];
            jQuery(plunderListNav).each(function (index) {
                index++;
                if (index <= maxFAPagesToFetch - 1) {
                    const currentPageNumber = parseInt(
                        getParameterByName(
                            'Farm_page',
                            window.location.origin + jQuery(this).attr('href')
                        )
                    );
                    faPageURLs.push(
                        game_data.link_base_pure +
                            `am_farm&ajax=page_entries&Farm_page=${currentPageNumber}&class=&extended=1&order=distance&dir=asc`
                    );
                }
            });

            return faPageURLs;
        })
        .catch((error) => {
            UI.ErrorMessage('Error fetching FA page!');
            console.error(`${scriptInfo()} Error:`, error);
        });

    return faPageURLs;
}

// Helper: Get FA table rows for all pages
function getFATableRows(pages) {
    let barbariansText = '';
    pages.forEach((page) => {
        barbariansText += page;
    });
    return jQuery.parseHTML(barbariansText);
}

// Helper: Get barbarian villages with wall bigger then 0
function getFABarbarians(rows, wallLevel, partialLossesReports) {
    const barbarians = [];

    rows.forEach((row) => {
        if (parseInt(jQuery(row).find('td:eq(6)').text()) >= wallLevel) {
            const villageId = parseInt(
                getParameterByName(
                    'target',
                    window.location.origin +
                        jQuery(row).find('td').last().find('a').attr('href')
                )
            );
            const coord = jQuery(row)
                .find('td:eq(3) a')
                .text()
                .match(COORDS_REGEX)[0];
            const wall = parseInt(jQuery(row).find('td:eq(6)').text());
            const distance = jQuery(row).find('td:eq(7)').text().trim();
            const reportId = parseInt(
                getParameterByName(
                    'view',
                    window.location.origin +
                        jQuery(row).find('td:eq(3) a').attr('href')
                )
            );
            const reportTime = jQuery(row).find('td:eq(4)').text().trim();
            const type = jQuery(row).find('td:eq(1) img').attr('src');

            if (!type.includes('green.png')) {
                barbarians.push({
                    villageId: villageId,
                    coord: coord,
                    distance: distance,
                    wall: wall,
                    reportId: reportId,
                    reportTime: reportTime,
                    type: type,
                });
            }
        } else {
            if (
                jQuery(row).find('td:eq(6)').text() === '?' &&
                partialLossesReports
            ) {
                const villageId = parseInt(
                    getParameterByName(
                        'target',
                        window.location.origin +
                            jQuery(row).find('td').last().find('a').attr('href')
                    )
                );
                const coord = jQuery(row)
                    .find('td:eq(3) a')
                    .text()
                    .match(COORDS_REGEX)[0];
                const wall = jQuery(row).find('td:eq(6)').text();
                const distance = jQuery(row).find('td:eq(7)').text().trim();
                const reportId = parseInt(
                    getParameterByName(
                        'view',
                        window.location.origin +
                            jQuery(row).find('td:eq(3) a').attr('href')
                    )
                );
                const reportTime = jQuery(row).find('td:eq(4)').text().trim();
                const type = jQuery(row).find('td:eq(1) img').attr('src');

                if (!type.includes('green.png')) {
                    barbarians.push({
                        villageId: villageId,
                        coord: coord,
                        distance: distance,
                        wall: wall,
                        reportId: reportId,
                        reportTime: reportTime,
                        type: type,
                    });
                }
            }
        }
    });

    return barbarians;
}

// Helper: Calculate units to send based on wall level
function calculateUnitsToSend(wall) {
    switch (wall) {
        case 1:
            return `&axe=60&ram=4&spy=1`;
        case 2:
            return `&axe=60&ram=7&spy=1`;
        case 3:
            return `&axe=60&ram=10&spy=1`;
        case 4:
            return `&axe=150&ram=15&spy=1`;
        case 5:
            return `&axe=150&ram=20&spy=1`;
        case 6:
            return `&axe=150&ram=25&spy=1`;
        case 7:
            return `&axe=250&ram=30&spy=1`;
        case 8:
            return `&axe=250&ram=38&spy=1`;
        case 9:
            return `&axe=500&ram=46&spy=1`;
        default:
            return `&axe=20&ram=2&spy=1`;
    }
}

// Helper: Make consecutive AJAX (GET) requests
$.fetchAll = function (
    urls, // array of URLs
    onLoad, // called when any URL is loaded, params (index, data)
    onDone, // called when all URLs successfully loaded, no params
    onError // called when a URL load fails or if onLoad throws an exception, params (error)
) {
    var numDone = 0;
    var lastRequestTime = 0;
    var minWaitTime = 250; // ms between requests
    loadNext();
    function loadNext() {
        if (numDone == urls.length) {
            onDone();
            return;
        }

        let now = Date.now();
        let timeElapsed = now - lastRequestTime;
        if (timeElapsed < minWaitTime) {
            let timeRemaining = minWaitTime - timeElapsed;
            setTimeout(loadNext, timeRemaining);
            return;
        }
        lastRequestTime = now;
        $.get(urls[numDone])
            .done((data) => {
                try {
                    onLoad(numDone, data);
                    ++numDone;
                    loadNext();
                } catch (e) {
                    onError(e);
                }
            })
            .fail((xhr) => {
                onError(xhr);
            });
    }
};

// Helper: Progress bar UI
function startProgressBar(total) {
    const width = jQuery('#contentContainer')[0].clientWidth;
    const preloaderContent = `
		<div id="progressbar" class="progress-bar" style="margin-bottom:12px;">
        	<span class="count label">0/${total}</span>
        	<div id="progress">
				<span class="count label" style="width: ${width}px;">
					0/${total}
				</span>
			</div>
    	</div>
	`;
    $('#contentContainer').eq(0).prepend(preloaderContent);
}

// Helper: Updates progress bar
function updateProgressBar(index, total) {
    jQuery('#progress').css('width', `${((index + 1) / total) * 100}%`);
    jQuery('.count').text(`${tt('Fetching')} ${index + 1}/${total}`);
    if (index + 1 == total) {
        UI.SuccessMessage(tt('Finished fetching FA pages!'));
        jQuery('#progressbar').fadeOut(1000);
    }
}

// Helper: Read client-side storage
function readStorage(defaultState) {
    let storedState = sessionStorage.getItem(STORAGE_KEY);
    if (!storedState) return defaultState;
    if (typeof storedState === 'object') return defaultState;
    storedState = JSON.parse(storedState);
    return storedState;
}

// Helper: Write into client-side storage
function writeStorage(data, initialState) {
    const dataToBeSaved = {
        ...initialState,
        ...data,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dataToBeSaved));
}

// Helper: Get parameter by name
function getParameterByName(name, url = window.location.href) {
    return new URL(url).searchParams.get(name);
}

// Helper: Generates script info
function scriptInfo() {
    return `[${scriptData.name} ${scriptData.version}]`;
}

// Helper: Prints universal debug information
function initDebug() {
    console.debug(`${scriptInfo()} It works ðŸš€!`);
    console.debug(`${scriptInfo()} HELP:`, scriptData.helpLink);
    if (DEBUG) {
        console.debug(`${scriptInfo()} Market:`, game_data.market);
        console.debug(`${scriptInfo()} World:`, game_data.world);
        console.debug(`${scriptInfo()} Screen:`, game_data.screen);
        console.debug(`${scriptInfo()} Game Version:`, game_data.majorVersion);
        console.debug(`${scriptInfo()} Game Build:`, game_data.version);
        console.debug(`${scriptInfo()} Locale:`, game_data.locale);
        console.debug(
            `${scriptInfo()} Premium:`,
            game_data.features.Premium.active
        );
    }
}

// Helper: Text Translator
function tt(string) {
    var gameLocale = game_data.locale;

    if (translations[gameLocale] !== undefined) {
        return translations[gameLocale][string];
    } else {
        return translations['en_DK'][string];
    }
}

// Initialize Script
(function () {
    if (
        game_data.features.FarmAssistent.active &&
        game_data.features.Premium.active
    ) {
        const gameScreen = getParameterByName('screen');
        if (ALLOWED_GAME_SCREENS.includes(gameScreen)) {
            const state = readStorage(DEFAULT_STATE);
            initClearBarbarianWalls(state);
        } else {
            UI.InfoMessage(tt('Redirecting...'));
            window.location.assign(game_data.link_base_pure + 'map');
        }
    } else {
        UI.ErrorMessage(tt('This script requires PA and FA to be active!'));
    }
})();
