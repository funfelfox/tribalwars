javascript:
var currentUrl = window.location.href;
var yourVillage = currentUrl.toString().substring(currentUrl.toString().indexOf("=")+1, currentUrl.toString().indexOf("&"));
var world = currentUrl.toString().substring(currentUrl.toString().indexOf("/")+2, currentUrl.toString().indexOf("."));
var baseUrl = "https://"+world+".plemiona.pl";
var tribesId = []
var playersId = []
var pressed = false;
 
 
class Loot_resInfo {
	constructor(lp, ranking, gracz, plemie, wynik, kiedy) {
		this.lp = lp
		this.ranking = ranking;
		this.gracz = gracz;
		this.plemie = plemie;
		this.wynik = wynik;
		this.kiedy = kiedy;
	}
}
 
function httpGet(theUrl) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", theUrl, false );
    xmlHttp.send( null );
    return xmlHttp.responseText;
}
 
 
function httpPost(theUrl, value, h) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", theUrl, false);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    var data = {
        'name': value[0],
        'h': h
    }
 
    var formBody = [];
    for (var property in data) {
    var encodedKey = encodeURIComponent(property);
    var encodedValue = encodeURIComponent(data[property]);
    formBody.push(encodedKey + "=" + encodedValue);
    }
    formBody = formBody.join("&");
 
 
    xhr.send(formBody);
}
 
function getByValue(map, searchValue) {
    for (let [key, value] of map.entries()) {
        if (value === searchValue)
        return key;
    }
    return null;
}
 
var startDialog = Dialog.show(
    'Script', '<div id="dudialog">Lista plemiona do sprawdzenia<br><textarea id="ScriptAlly" placeholder="Lista skrotow plemion, oddzielona spacja"  style="width: 96%; margin: 0px auto 0px auto; border: 1px solid rgb(129, 66, 2);" required></textarea><br><label for="top_how_many">Ile graczy sprawdzic? (25-5000):</label><input type="number" id="top_how_many" name="top_how_many" value="25" min="25" max="5000"><button type="button" onclick="handleButtonEvent()" style="border-radius: 5px; border: 1px solid #000; color: #fff; background: linear-gradient(to bottom, #947a62 0%,#7b5c3d 22%,#6c4824 30%,#6c4824 100%)">Wygeneruj rankingi!</button><br>Po zakcpetowaniu prosze poczekac na wygenerowanie listy...<br><br><table id="buttons-script"></table></div>'
)
 
var handleButtonEvent = () => {
    if (!pressed) {
        ally = document.getElementById('ScriptAlly').value.split(' ');
		if (document.getElementById('top_how_many').value > 5000 || document.getElementById('top_how_many').value  < 25) {
			alert("Niepoprawna ilosc¡ graczy!");
		} else {
			let numberOfRepetitions = Math.ceil(document.getElementById('top_how_many').value/25);
			listPlayersRanking(ally,numberOfRepetitions);
			pressed = true;
		}
	}
}
 
var listPlayersRanking = (ally, numberOfRepetitions) => { 
	let rankingPerAlly = []; 
	for (let i=0; i<numberOfRepetitions; i++) {
		let URI = "https://"+world+".plemiona.pl/game.php?village="+yourVillage+"&screen=ranking&mode=in_a_day&offset="+i*25+"&type=loot_res"
		let get = httpGet(URI);
		let doc = new DOMParser().parseFromString(get, "text/html");
 
		let rankingTable = doc.getElementById("in_a_day_ranking_table");
		const trs = rankingTable.getElementsByTagName("tr")
 
		for (const tr of trs) {
			let loot_resInfo = new Loot_resInfo();
			let tds = tr.getElementsByTagName("td");
			for (let j = 0; j < tds.length; j++) {
				if (j==0) {
					loot_resInfo.ranking = tds[j].innerHTML;
				}
				if (j==1) {
					let name = tds[j].getElementsByTagName("a")[0].innerHTML.substring(tds[j].getElementsByTagName("a")[0].innerHTML.indexOf(">") + 1).replace(/(\r\n|\n|\r)/gm, "");;
					name = name.replace("<span class=\"icon friend offline\" title=\"offline\"></span>", "");
					name = name.replace("<span class=\"icon friend online\" title=\"online\"></span>", "");
					name = name.trim();
					loot_resInfo.gracz = name;
				}
				if (j==2) {
					let plemie = tds[j].getElementsByTagName("a")[0]
					if( plemie != undefined) {
						loot_resInfo.plemie = plemie.innerHTML;
					} else {
						continue;
					}
				}
				if (j==3) {
					loot_resInfo.wynik = tds[j].innerHTML.replaceAll("<span class=\"grey\">.</span>", "");
				} 
				if (j==4) {
					loot_resInfo.kiedy = tds[j].innerHTML;
				}
			}
			if (ally.includes(loot_resInfo.plemie)) {
				rankingPerAlly.push(loot_resInfo);
			}
		}
	}
	generateAllyList(rankingPerAlly, ally, numberOfRepetitions)
}
 
var generateAllyList = (rankingPerAlly, ally, numberOfRepetitions) => {
	var now = new Date();
	var howManyPlayers = numberOfRepetitions*25;
	let finalString = "Ranking farmy aktualny na dzien " + now.toLocaleDateString() + " dla pierwszych "+ howManyPlayers+ " graczy\n";
	for (const allyName of ally) {
		let lp = 1;
		let thisAlly = [];
		for (lootInfo of rankingPerAlly) {
			if (lootInfo.plemie == allyName) {
				lootInfo.lp = lp;
				lp += 1;
				thisAlly.push(lootInfo);
			}
		}
 
		finalString += "[spoiler= "+allyName+"]\n"
		finalString += "[table]\n"
		finalString += "[**] LP [||] Ranking [||] Gracz [||] Plemie [||] Wynik [||] Kiedy [/**]"
		for (const lootInfoInAlly of thisAlly) {
			 finalString += "[*] [b]" + lootInfoInAlly.lp +  "[/b] [|] " +lootInfoInAlly.ranking +  " [|] [player]" + lootInfoInAlly.gracz+  "[/player] [|] [ally]" +lootInfoInAlly.plemie +  "[/ally] [|] [b]" +lootInfoInAlly.wynik +  "[/b] [|] " + lootInfoInAlly.kiedy;
		}
		finalString += "[/table]\n[/spoiler]"
		finalString += "\n\n"
	}
 
	$(document).ready(function() {
		let textArea = document.createElement("TEXTAREA")
		textArea.style.cssText = "width:500px;height:200px"
		textArea.innerHTML = finalString
		$('#dudialog')[0].append(`Ponizej znajduje sie wygenerowana tabela, skopiuj ja i wklej na forum!`);
		$('#dudialog')[0].append(document.createElement("br"));
		$('#dudialog')[0].append(document.createElement("br"));
		$('#dudialog')[0].append(textArea);
	})
 
}
