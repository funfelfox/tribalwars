javascript: var config = [{
'tribes': ['NnŻ6','FRONT','*EF*','FRONT.','NnŻ3','NnŻ5','...'],
'color': 'RED'
}, {
'tribes': ['**MC**','-BH-','KMT','MC!'],
'color': 'BLUE'
}, {
'players': [''],
'color': 'GREEN'
}, {
'villages': '500|500 000|000'.split(" "),
'color': 'BLACK'
}];
var barb = {
'min_points': 1500,
'color': 'PINK'
};
var text_color = '#FFFFFF';
var default_color = 'rgba(0, 0, 0, 0.6)';
var doc = document;
var win = (window.frames.length > 0) ? window.main : window;

function fnHilightMap() {
var height = 12;
var ii, col, row, coord, village, player, tribe;
for (row = 0; row < TWMap.size[1]; row++) {
for (col = 0; col < TWMap.size[0]; col++) {
var coord = TWMap.map.coordByPixel(TWMap.map.pos[0] + (TWMap.tileSize[0] * col), TWMap.map.pos[1] + (TWMap.tileSize[1] * row));
if (coord) {
player = null;
tribe = null;
village = TWMap.villages[coord.join("")];

if (village) {
village.points = village.points.replace(".", "");
if (village.owner) {
player = TWMap.players[village.owner];
}
if (doc.getElementById("map_village_" + village.id)) {
var tox = doc.getElementById("map_village_" + village.id);
var cssval = tox.style;
} else {
return
}
bk_color = default_color;
for (ii = 0; ii < config.length; ii++) {
if (config[ii].villages && (config[ii].villages.indexOf(coord.join("|")) >= 0)) {
bk_color = config[ii].color;
break;
}
if (player) {
if (config[ii].players && (config[ii].players.indexOf(player.name) >= 0)) {
bk_color = config[ii].color;
break;
}
tribe = TWMap.allies[player.ally];
if (tribe && config[ii].tribes && (config[ii].tribes.indexOf(tribe.tag) >= 0)) {
bk_color = config[ii].color;
break;
}
}
}
if (!player && (bk_color == default_color)) {
bk_color = barb.color;
}
if ((!player && (village.points >= barb.min_points)) || (player && (player.name != myself))) {
if ((!doc.getElementById("dalesmckay_map_hilight_" + coord.join("")))) {
var div = doc.createElement('div');
div.id = "dalesmckay_map_hilight_" + coord.join("");
div.style.position = cssval.position;
div.style.left = cssval.left;
div.style.top = (parseInt(cssval.top, 10) + 22) + 'px';
div.style.fontSize = '11px';
div.style.fontWeight = 'normal';
div.style.width = (TWMap.tileSize[0] - 1) + 'px';
div.style.height = height + 'px';
div.style.zIndex = 3;
div.style.display = 'block';
div.style.color = text_color;
div.style.textAlign = 'center';
div.style.opacity = '0.7';
div.style.border = '1px solid black';
div.style.borderRadius = '3px';
div.style.textShadow = "0 0 3px black,0 0 3px black";
div.innerHTML = (player ? player.name : (village.points + 'pct'));
if (div.innerHTML.split(" ").length > 1) {
var re = div.innerHTML.split(" ");
div.innerHTML = re[0] + "\n" + re[1];
div.style.height = height * 2 + 'px';
div.style.top = (parseInt(cssval.top, 10) + 10) + 'px';
div.style.fontSize = '10px';
} else if (div.innerHTML.length > 8) {
var re = div.innerHTML;
div.innerHTML = re.substring(8, 0) + "\n" + re.substring(8);
div.style.height = height * 2 + 'px';
div.style.top = (parseInt(cssval.top, 10) + 10) + 'px';
div.style.fontSize = '10px';
}
div.style.backgroundColor = (player ? bk_color : barb.color);
$(tox).after(div);
}
}
}
}
}
}
}

function fnCustomOnMove(x, y) {
win.$("div [id*=dalesmckay_map_hilight_]").remove();
if (chainedHandler) {
chainedHandler(x, y);
}
fnHilightMap()
}
var myself = game_data['player']['name'];
if (game_data['screen'] == "map") {
if ((typeof (chainedHandler) == "undefined") || !chainedHandler) {
var curCentre = [parseInt(win.$("#inputx").attr("value") || "0", 10), parseInt(win.$("#inputy").attr("value") || "0", 10)];
var chainedHandler = TWMap.mapHandler.onMove;
TWMap.mapHandler.onMove = fnCustomOnMove;
}
win.$("div [id*=dalesmckay_map_hilight_]").remove();
fnHilightMap();
} else {

self.location = game_data['link_base_pure'].replace(/screen\=/i, "screen=map");
}
void(0);
