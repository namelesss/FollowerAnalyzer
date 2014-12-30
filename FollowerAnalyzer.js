var menuC = new Tab(document.getElementById('menuC'), menuClickCallback);
var tabC = new Tab(document.getElementById('tabC'), tabClickCallback);

var nameStyle = "text-align: left;padding-left: 10px";
var questListC = new List(document.getElementById('questListC'),
    [{key: "successRate", title:"成功率", style:"width:64px!important"},
    {key: "matchComp", title:"配隊組合"},
    {key: "unMatch", title:"未對應", style:nameStyle},
    {key: "matchTrait", title:"特長", style:nameStyle}
    ]);

var followerListTable = [
    {key: "name", title: "名稱", style:nameStyle, color:"nameColor",
      titleClicked:sortFDB, sortSeq:["quality", "average", "id"]},
    {key: "raceName", title: "種族", style:nameStyle, titleClicked:sortFDB, sortSeq:["raceName", "average", "id"]},
    {key: "specName", title: "職業", style:nameStyle, titleClicked:sortFDB, sortSeq:["spec", "average", "id"]},
    {key: "inactive", title: "停用", style:nameStyle, titleClicked:sortFDB, sortSeq:["active", "average", "id"]},
    {key: "level", title: "等級", titleClicked:sortFDB, sortSeq:["level", "iLevel", "average", "id"]},
    {key: "iLevel", title: "裝等", titleClicked:sortFDB, sortSeq:["level", "iLevel", "average", "id"]},
    {key: "ability1", title: "技能1"},
    {key: "ability2", title: "技能2"},
    {key: "trait1", title: "特長1"},
    {key: "trait2", title: "特長2"},
    {key: "trait3", title: "特長3"},
    {key: "count", title: "出場率", style:nameStyle, titleClicked:sortFDB, sortSeq:["average", "id"]}
    ];
var followerListC = new List(document.getElementById('followerListC'), followerListTable);

var questC = document.getElementById('questC');

var FOLLOWERDB = [];
var match = [];

function tabClickCallback(tab)
{
  var idx = parseInt(tab.charAt(tab.length - 1)) - 1;

  questListC.createList(match[idx]);
  var h = genImg(TRAIT[QUESTS[idx].type]) + " + ";
  for (var e in QUESTS[idx].encounters)
    h += genImg(ABILITY[QUESTS[idx].encounters[e]]) + " ";
  questC.innerHTML = h;
}

function menuClickCallback(menu)
{
  if (menu == "followerMenu")
  {
    followerListC.show();
    questC.style.display = 'none';
    tabC.hide();
    questListC.hide();
  }
  else
  {
    followerListC.hide();
    questC.style.display = 'block'
    tabC.show();
    questListC.show();
  }
}

function handleFile(e)
{
  while(FOLLOWERDB.length > 0)
     FOLLOWERDB.pop();
  var result = ("" + e.target.result).split("\n");

  // Fetch Data
  if (result.length < 2) return;
  genFollowerList(result);
  FOLLOWERDB.sort(function(a, b) { return sortFunc(a, b, -1, ["level", "iLevel", "average", "id"]); });  

  // Generate Match tab data
  genMatchList();

  // Generate Output
  menuC.createTab({followerMenu: {name:"追隨者"}, missionMenu: {name:"645任務"}});
  tabC.createTab( { quest1: {name:"任務1"}, quest2: {name:"任務2"}, quest3: {name:"任務3"}, quest4: {name:"任務4"} });
  followerListC.createList(FOLLOWERDB);
}

function loadFileEntry(_chosenEntry) {
  var chosenEntry = _chosenEntry;
  chosenEntry.file(function(file) {
    var reader = new FileReader();

    reader.onerror = function(e){
      console.error(e);
    };
    reader.onload = handleFile;

    reader.readAsText(file);
    // Update pathname
    chrome.fileSystem.getDisplayPath(chosenEntry, function(path) {
      document.querySelector('#file_path').value = "檔案: " + path;
    });
  });
}

function loadFileFromStorageEntry()
{
  chrome.storage.local.get('chosenFile', function(items) 
  {
    if (items.chosenFile) 
    {
      chrome.fileSystem.isRestorable(items.chosenFile, function(bIsRestorable) 
      {
        if (bIsRestorable) 
        {
          console.info("Restoring " + items.chosenFile);
          chrome.fileSystem.restoreEntry(items.chosenFile, function(chosenEntry) 
          {
            if (chosenEntry) 
            {
              loadFileEntry(chosenEntry);
            }
          });
        }
      });
    }
  });
}

document.querySelector('#refresh').addEventListener('click', function(e)
{
  loadFileFromStorageEntry();
});

document.querySelector('#choose_file').addEventListener('click', function(e) 
{
  chrome.fileSystem.chooseEntry({type: 'openFile', 
                                 accepts: [{extensions: ["csv"]}],
                                 acceptsAllTypes: false }, function(theEntry) 
  {
    if (chrome.runtime.lastError || !theEntry) 
    {
      // No file selected
      return;
    }
    // use local storage to retain access to this file
    chrome.storage.local.set({'chosenFile': chrome.fileSystem.retainEntry(theEntry)});
    loadFileEntry(theEntry);
  });
});

var cover = document.getElementById('cover');
var input = document.getElementById('input');
document.querySelector('#open').addEventListener('click', function(e)
{
  input.value = "";
  cover.style.display = "block";
  input.focus();
});
document.querySelector('#close').addEventListener('click', function(e)
{
  cover.style.display = "none";
});
document.querySelector('#from_string').addEventListener('click', function(e)
{
  cover.style.display = "none";
  handleFile({target:{result:input.value}});
  document.querySelector('#file_path').value = "字串輸入";
});

window.addEventListener("load", function() 
{
  if (launchData && launchData.items && launchData.items[0]) 
  {
    loadFileEntry(launchData.items[0].entry);
  } 
  else 
  {
    loadFileFromStorageEntry();
  }
});

// HTML Generation Functions
function genImg(img) 
{ 
  var t = (img.name) ? (" title='" + img.name + "'" ): ("");
  return "<img src='img/" + img.img + ".jpg'" + t + ">"; 
}
function genMacthTable_follower_img(abi, countered)
{
  return "<div class='follower abi'"
      + ((abi) ? " style=\"background-image:url(img/" 
      + ABILITY[abi].img + ".jpg);\">" : ">")
      + ((countered) ? "<div class='follower countered'></div>" : "")
      + "</div>";
}

function genMacthTable_follower(f, matchedFlag)
{
  var lowILV = f.iLevel < 645;  // strick to 645?
  return "<div class='follower'" + (lowILV ? "title='ilv:"+f.iLevel+"'": "") + ">"
    + "<div class='follower abis" + f.abilities.length + "'>"
      + genMacthTable_follower_img(f.abilities[0], matchedFlag & 1)
      + genMacthTable_follower_img(f.abilities[1], matchedFlag & 2)
      + "</div>"
      + "<div class='follower name' style='color:" 
      + ((lowILV)? "red" : f.nameColor) + "'>" + f.name + "</div>"
      + "</div>";
}
function genMatchTable(matchData)
{
  var f1 = FOLLOWERDB[matchData.team[0]];
  var f2 = FOLLOWERDB[matchData.team[1]];
  var f3 = FOLLOWERDB[matchData.team[2]];
  var table = "<div class='followers'>" 
    + genMacthTable_follower(f1, matchData.matchedFlag[0])
    + genMacthTable_follower(f2, matchData.matchedFlag[1])
    + genMacthTable_follower(f3, matchData.matchedFlag[2])
    + "</div>";
  return table;
}

// Follower Sorting Functions
var sortFlag = 0;
function sortFDB (ele) 
{
  var brothers = ele.parentNode.childNodes;
  for (var i = 0; i < brothers.length; ++i)
  {
    if (ele.innerHTML.match(followerListTable[i].title))
    {
      sortFlag = (Math.abs(sortFlag) == (i + 1)) ? - sortFlag : (- (i + 1));
      ele.innerHTML = followerListTable[i].title + ((sortFlag > 0) ? "△" : "▽");
      FOLLOWERDB.sort(function(a, b) { return sortFunc(a, b, sortFlag, followerListTable[i].sortSeq); });
    }
    else
      brothers[i].innerHTML = followerListTable[i].title;
  }

  followerListC.updateList();
};
function sortFunc(a, b, ascending, list)
{
  for (var i in list)
  {
    if (a[list[i]] == b[list[i]])
      continue;
    else
      return ((a[list[i]] > b[list[i]])?ascending:-ascending);
  }
  return 0;
}

// UI indepentant functions
function genFollowerList(dataArray)
{
  for (var i = 1; i < dataArray.length; ++i)
  {
    var str = dataArray[i].split(",");
    if (!str[0]) continue;
    var follower = {};
    var abi = [], tra = [];  
    follower.name = str[1];
    follower.id = str[0];

    follower.spec = parseInt(str[2]);
    follower.quality = parseInt(str[3]);
    follower.level = parseInt(str[4]);
    follower.iLevel = parseInt(str[5]);
    follower.active = (str[6] == "inactive") ? 0 : 1;
    if (str[7]) abi.push(parseInt(str[7]));
    if (str[8]) abi.push(parseInt(str[8]));
    if (str[9]) tra.push(parseInt(str[9]));
    if (str[10]) tra.push(parseInt(str[10]));
    if (str[11]) tra.push(parseInt(str[11]));
    follower.abilities = abi;
    follower.traits = tra;
    follower.countQuest = [0, 0, 0, 0];
    follower.count = "";
    follower.inactive = follower.active ? "" :"☆" ;

    follower.nameColor = QUALITY[follower.quality];
    follower.raceName = (follower.id in RACE) ? RACE[follower.id].a : follower.race;
    follower.specName = SPEC[follower.spec].name;
    follower.ability1 = genImg(ABILITY[abi[0]]);
    follower.ability2 = (1 in abi) ? genImg(ABILITY[abi[1]]) : "";
    follower.trait1 = genImg(TRAIT[tra[0]]);
    follower.trait2 = (1 in tra) ? genImg(TRAIT[tra[1]]) : "";
    follower.trait3 = (2 in tra) ? genImg(TRAIT[tra[2]]) : "";
    follower.count = "";
    FOLLOWERDB.push(follower);
  }
}

function genMatchList()
{
  var matchCount = [0, 0, 0, 0];  // dirty
  for (var i = 0; i < QUESTS.length; ++i)
  {
    match[i] = [];
    MatchMission(FOLLOWERDB, QUESTS[i], match[i], 1.0);
    if (match[i].length == 0)
    {
      var bound = 0.95, MATCH_MAX = 10;
      do
      {
        match[i] = [];
        MatchMission(FOLLOWERDB, QUESTS[i], match[i], bound);
        bound -= 0.05;
      }while (match[i].length < MATCH_MAX);
    }
    // sort
    match[i].sort(function(a, b) { return b.rate - a.rate; });

    for (var j = 0; j < match[i].length; ++j)
    {
      var curMatch = match[i][j];

      matchCount[i]++;
      FOLLOWERDB[curMatch.team[0]].countQuest[i]++;
      FOLLOWERDB[curMatch.team[1]].countQuest[i]++;
      FOLLOWERDB[curMatch.team[2]].countQuest[i]++;

      curMatch.successRate = (curMatch.rate * 100).toFixed(2)  + "%";
      curMatch.matchComp = genMatchTable(curMatch);
      var unMatchHtml = "";
      for (var abi in curMatch.unMatchList)
        unMatchHtml += genImg(ABILITY[curMatch.unMatchList[abi]]) + " ";
      curMatch.unMatch = unMatchHtml;
      var matchTraitHtml = "";
      for (var tar in curMatch.traitMatchList)
        matchTraitHtml += genImg(TRAIT[curMatch.traitMatchList[tar]]) + " ";
      curMatch.matchTrait = matchTraitHtml;
    }
  }

  for (var f in FOLLOWERDB)
  {
    var average = 0; 
    for (var i = 0; i < QUESTS.length; ++i)
    {
      var count = 0;
      if (FOLLOWERDB[f].countQuest[i] == 0 || matchCount[i] == 0)
         count = 0;
      else
        count = FOLLOWERDB[f].countQuest[i] * 100 / matchCount[i];
      if (count > 50)
        FOLLOWERDB[f].count += ("<span style='color:red'>" + count.toFixed(2) + "%</span> ");
      else
        FOLLOWERDB[f].count += (count).toFixed(2) + "% ";
      average += count;
    }
    FOLLOWERDB[f].average = average/4;
    FOLLOWERDB[f].count = FOLLOWERDB[f].average.toFixed(2) + "%(" + FOLLOWERDB[f].count + ")";
  }
}

function matchEncounter(encounters, abilities)
{
  var idx;
  var matched = 0;
  for (var i in abilities)
  {
    idx = encounters.indexOf(abilities[i]);
    if (idx >= 0)
    {
      encounters.splice(idx, 1);
      matched |= (1 << i); // bit1:abi[0] bit2:abi[1]
    }
  }
  return matched;
}

function successRate(quest, numUnMatch, followers, traitMatchList)
{
  var needNumAbilities = quest.encounters.length;
  var base = quest.encounters.length * 3 + 3; // 3-man Raid Specific
  var abiMatch = needNumAbilities - numUnMatch;

  for (var f in followers)
  {
    // Encounter Type Match
    var typeMatch = 0;
    for (var t in followers[f].traits)
      if (followers[f].traits[t] == quest.type)
        typeMatch = 1; // not ++
    if (typeMatch == 1 ) 
      traitMatchList.push(quest.type);
    
    // Success rate plus
    for (var t in followers[f].traits)
    {
      if (followers[f].traits[t] == 201)
        traitMatchList.push(201);
      if (quest.time > 7 && followers[f].traits[t] == 76)
        traitMatchList.push(76);
      else if (quest.time < 7 && followers[f].traits[t] == 77)
        traitMatchList.push(77);
    }
    var traitMatch = traitMatchList.length;

    // Race Match
    var raceMatch = 0;
    for (var t in followers[f].traits)
    {
      var r = followers[f].traits[t];
      if (r in RACE_MATCH)
        if (RACE_MATCH[r] == followers[(f+1)%3].raceName || RACE_MATCH[r] == followers[(f+2)%3].raceName)
        {
          raceMatch++;
          traitMatchList.push(r);
        }
    }
  }
  return (3 * abiMatch + traitMatch + raceMatch * 1.5 + 3) / base;
}

var only100 = true;
function MatchMission(data, quest, match, threshold)
{
  var count = 0;
  for (var a = 0; a < data.length; ++a)
  {
    if (only100 && data[a].level < 100) continue;
    var encLeft1 = quest.encounters.slice(0);
    var matchedFlag1 = matchEncounter(encLeft1, data[a].abilities);
    
    for (var b = a + 1; b < data.length; ++b)
    {
      if (only100 && data[b].level < 100) continue;
      var encLeft2 = encLeft1.slice(0);
      var matchedFlag2 = matchEncounter(encLeft2, data[b].abilities);
      
      for (var c = b + 1; c < data.length; ++c)
      {
        if (only100 && data[c].level < 100) continue;
        var encLeft3 = encLeft2.slice(0);
        var matchedFlag3 = matchEncounter(encLeft3, data[c].abilities);
        
        var traitMatch = [];
        var rate = successRate(quest, encLeft3.length, [data[a], data[b], data[c]], traitMatch);

        if (rate < threshold)
          continue;

        match.push({team:[a, b, c], 
            matchedFlag:[matchedFlag1, matchedFlag2, matchedFlag3],
            rate:rate, 
            unMatchList:encLeft3, 
            traitMatchList:traitMatch});
      }
    }
  }
}


var QUESTS = [
  { type:48, encounters:[10,8,2,6,9,1], time:8}, //trait 227,228?
  { type:49, encounters:[1,9,6,8,9,10], time:8},
  { type:38, encounters:[2,10,7,4,9,10], time:8},
  { type:40, encounters:[1,3,3,6,7,4], time:8}
];

var QUALITY = [
  "",
  "",
  "#1eff00",
  "#0070dd",
  "#a335ee"
];
// ---------Copy from id convert table------------
var ABILITY = {
1:{name:"狂野侵略", img:"spell_nature_reincarnation"},
2:{name:"巨力打擊", img:"ability_warrior_savageblow"},
3:{name:"集體傷害", img:"spell_fire_selfdestruct"},
4:{name:"魔法減益", img:"spell_shadow_shadowwordpain"},
6:{name:"危險區域", img:"spell_shaman_earthquake"},
7:{name:"爪牙成群", img:"spell_deathknight_armyofthedead"},
8:{name:"強力法術", img:"spell_shadow_shadowbolt"},
9:{name:"致命爪牙", img:"achievement_boss_twinorcbrutes"},
10:{name:"計時戰鬥", img:"spell_holy_borrowedtime"}
};
var SPEC = {
2:{name:"血魄死亡騎士", counters:[1,2,7,8,10]},
3:{name:"冰霜死亡騎士", counters:[1,4,7,8,10]},
4:{name:"穢邪死亡騎士", counters:[1,2,7,8,10]},
5:{name:"平衡德魯伊", counters:[6,7,9,10]},
7:{name:"野性戰鬥德魯伊", counters:[1,2,6,10]},
8:{name:"守護者德魯伊", counters:[1,2,6,9,10]},
9:{name:"恢復德魯伊", counters:[3,4,7,9,10]},
10:{name:"野獸控制獵人", counters:[1,6,7,9,10]},
12:{name:"射擊獵人", counters:[6,7,8,9,10]},
13:{name:"生存獵人", counters:[2,6,7,9,10]},
14:{name:"秘法法師", counters:[6,8,9,10]},
15:{name:"火焰法師", counters:[6,7,8,9,10]},
16:{name:"冰霜法師", counters:[2,7,8,9,10]},
17:{name:"釀酒武僧", counters:[1,2,3,6,9]},
18:{name:"織霧武僧", counters:[3,4,6,8,10]},
19:{name:"御風武僧", counters:[1,6,8,9,10]},
20:{name:"神聖聖騎士", counters:[3,4,8,9,10]},
21:{name:"防護聖騎士", counters:[1,2,4,8,9]},
22:{name:"懲戒聖騎士", counters:[2,7,8,9,10]},
23:{name:"戒律牧師", counters:[3,4,6,9,10]},
24:{name:"神聖牧師", counters:[3,4,6,7,10]},
25:{name:"暗影牧師", counters:[4,6,7,9,10]},
26:{name:"刺殺盜賊", counters:[2,6,8,9,10]},
27:{name:"戰鬥盜賊", counters:[6,7,8,9,10]},
28:{name:"敏銳盜賊", counters:[2,6,7,8,9]},
29:{name:"元素薩滿", counters:[3,7,8,9,10]},
30:{name:"增強薩滿", counters:[3,6,7,9,10]},
31:{name:"恢復薩滿", counters:[3,4,7,8,10]},
32:{name:"痛苦術士", counters:[4,7,8,9,10]},
33:{name:"惡魔學識術士", counters:[2,7,8,10]},
34:{name:"毀滅術士", counters:[3,8,9,10]},
35:{name:"武器戰士", counters:[1,6,7,8,10]},
37:{name:"狂怒戰士", counters:[2,6,7,8,10]},
38:{name:"防護戰士", counters:[1,2,6,7,8]}
};
var TRAIT = {
54:{name:"鍊金術", img:"trade_alchemy"},
67:{name:"阿古斯同盟", img:"achievement_character_draenei_male"},
227:{name:"釣手", img:"achievement_profession_fishing_northrendangler"},
37:{name:"屠獸者", img:"achievement_boss_kingdred"},
55:{name:"鍛造", img:"trade_blacksmithing"},
231:{name:"保鏢", img:"ability_hanzandfranz_chestbump"},
69:{name:"飲酒狂", img:"achievement_character_pandaren_female"},
77:{name:"力量爆發", img:"spell_nature_shamanrage"},
68:{name:"犬科同伴", img:"ability_worgen_darkflight"},
45:{name:"穴居怪", img:"achievement_dungeon_deepholm"},
70:{name:"德拉諾之子", img:"achievement_character_orc_female"},
66:{name:"月神之子", img:"achievement_character_nightelf_male"},
8:{name:"冷血無情", img:"achievement_zone_stormpeaks_02"},
201:{name:"作戰經驗", img:"ability_rogue_combatreadiness"},
232:{name:"舞者", img:"ability_hunter_displacement"},
71:{name:"死亡的魅力", img:"achievement_character_undead_female"},
36:{name:"斬魔者", img:"achievement_boss_princemalchezaar_02"},
65:{name:"矮人後裔", img:"achievement_character_dwarf_female"},
75:{name:"經驗學家", img:"achievement_femalegoblinhead"},
74:{name:"精靈一族", img:"achievement_character_bloodelf_male"},
56:{name:"附魔", img:"trade_engraving"},
57:{name:"工程學", img:"trade_engineering"},
221:{name:"史詩作騎", img:"mountjournalportrait"},
228:{name:"萬年青", img:"ability_druid_manatree"},
80:{name:"額外訓練", img:"garrison_building_sparringarena"},
29:{name:"Fast Learner", img:"ability_mage_studentofthemind"},
41:{name:"怒靈殺手", img:"achievement_boss_ragnaros"},
63:{name:"地精粉絲", img:"achievement_character_gnome_male"},
40:{name:"古羅殺手", img:"achievement_boss_gruulthedragonkiller"},
46:{name:"遊擊高手", img:"achievement_zone_ungorocrater_01"},
236:{name:"爐石戰記專家", img:"item_hearthstone_card"},
53:{name:"草藥學", img:"trade_herbalism"},
76:{name:"驚人耐力", img:"spell_holy_wordfortitude"},
64:{name:"人類學家", img:"achievement_character_human_female"},
58:{name:"銘文學", img:"inv_inscription_tradeskill01"},
59:{name:"珠寶學", img:"inv_misc_gem_01"},
60:{name:"製皮", img:"trade_leatherworking"},
78:{name:"孤狼", img:"ability_shaman_freedomwolf"},
48:{name:"沼澤行者", img:"achievement_zone_sholazar_03"},
52:{name:"採礦", img:"trade_mining"},
7:{name:"登山客", img:"achievement_zone_thousandneedles_01"},
44:{name:"自然學家", img:"achievement_zone_silverpine_01"},
38:{name:"巨魔殺手", img:"achievement_reputation_ogre"},
4:{name:"獸人殺手", img:"achievement_boss_general_nazgrim"},
49:{name:"曠野奔馳者", img:"achievement_zone_arathihighlands_01"},
39:{name:"源生者殺手", img:"achievement_boss_yoggsaron_01"},
79:{name:"拾荒者", img:"achievement_guildperk_bountifulbags"},
62:{name:"剝皮", img:"inv_misc_pelt_wolf_01"},
61:{name:"裁縫", img:"trade_tailoring"},
43:{name:"鳥爪殺手", img:"inv_ravenlordpet"},
72:{name:"圖騰師", img:"achievement_character_tauren_male"},
42:{name:"虛空殺手", img:"achievement_boss_zuramat"},
73:{name:"巫毒狂熱者", img:"achievement_character_troll_male"},
9:{name:"荒地居民", img:"achievement_zone_tanaris_01"}
};
var RACE = {
225:{a:"獸人", h:"獸人"},
177:{a:"人類", h:"人類"},
178:{a:"人類", h:"人類"},
203:{a:"豺狼人", h:"豺狼人"},
455:{a:"地精", h:"哥不林"},
406:{a:"狼人", h:"哥不林"},
382:{a:"矮人", h:"獸人"},
351:{a:"矮人", h:"巨魔"},
285:{a:"德萊尼", h:"獸人"},
363:{a:"人類", h:"獸人"},
237:{a:"夜精靈", h:"獸人"},
429:{a:"矮人", h:"熊貓人"},
280:{a:"狼人", h:"哥不林"},
279:{a:"夜精靈", h:"巨魔"},
417:{a:"人類", h:"獸人"},
364:{a:"夜精靈", h:"獸人"},
400:{a:"人類", h:"獸人"},
345:{a:"人類", h:"不死族"},
459:{a:"德萊尼", h:"獸人"},
394:{a:"矮人", h:"獸人"},
297:{a:"夜精靈", h:"巨魔"},
462:{a:"高等鴉人", h:"高等鴉人"},
207:{a:"德萊尼", h:"血精靈"},
333:{a:"矮人", h:"牛頭人"},
216:{a:"矮人", h:"不死族"},
387:{a:"矮人", h:"哥不林"},
250:{a:"狼人", h:"牛頭人"},
424:{a:"狼人", h:"哥不林"},
357:{a:"夜精靈", h:"哥不林"},
298:{a:"熊貓人", h:"哥不林"},
231:{a:"人類", h:"血精靈"},
388:{a:"矮人", h:"牛頭人"},
327:{a:"德萊尼", h:"血精靈"},
430:{a:"夜精靈", h:"牛頭人"},
334:{a:"矮人", h:"牛頭人"},
346:{a:"夜精靈", h:"巨魔"},
255:{a:"夜精靈", h:"巨魔"},
274:{a:"夜精靈", h:"牛頭人"},
412:{a:"人類", h:"血精靈"},
370:{a:"狼人", h:"哥不林"},
260:{a:"夜精靈", h:"牛頭人"},
376:{a:"地精", h:"血精靈"},
273:{a:"人類", h:"獸人"},
286:{a:"人類", h:"牛頭人"},
219:{a:"刃牙虎人", h:"刃牙虎人"},
352:{a:"狼人", h:"不死族"},
244:{a:"夜精靈", h:"牛頭人"},
375:{a:"矮人", h:"巨魔"},
238:{a:"狼人", h:"哥不林"},
445:{a:"熊貓人", h:"獸人"},
399:{a:"人類", h:"獸人"},
439:{a:"人類", h:"獸人"},
405:{a:"矮人", h:"哥不林"},
292:{a:"夜精靈", h:"獸人"},
202:{a:"人類", h:"人類"},
393:{a:"德萊尼", h:"獸人"},
340:{a:"矮人", h:"牛頭人"},
303:{a:"矮人", h:"哥不林"},
328:{a:"人類", h:"牛頭人"},
440:{a:"夜精靈", h:"熊貓人"},
267:{a:"狼人", h:"巨魔"},
194:{a:"木精", h:"木精"},
460:{a:"哥不林", h:"哥不林"},
232:{a:"夜精靈", h:"牛頭人"},
411:{a:"地精", h:"巨魔"},
304:{a:"夜精靈", h:"血精靈"},
358:{a:"夜精靈", h:"血精靈"},
452:{a:"地精", h:"巨魔"},
381:{a:"德萊尼", h:"牛頭人"},
249:{a:"夜精靈", h:"牛頭人"},
224:{a:"鴉人流亡者", h:"鴉人流亡者"},
218:{a:"鴉人流亡者", h:"鴉人流亡者"},
423:{a:"夜精靈", h:"獸人"},
291:{a:"人類", h:"獸人"},
266:{a:"夜精靈", h:"牛頭人"},
446:{a:"人類", h:"牛頭人"},
193:{a:"巨魔", h:"巨魔"},
451:{a:"地精", h:"熊貓人"},
243:{a:"矮人", h:"巨魔"},
261:{a:"狼人", h:"巨魔"},
256:{a:"狼人", h:"巨魔"},
458:{a:"德萊尼", h:"獸人"},
339:{a:"德萊尼", h:"血精靈"},
418:{a:"夜精靈", h:"牛頭人"},
369:{a:"夜精靈", h:"哥不林"},
342:{a:"人類", h:"人類"},
209:{a:"食人妖", h:"食人妖"},
227:{a:"人類", h:"獸人"},
204:{a:"人類", h:"不死族"},
208:{a:"德萊尼", h:"德萊尼"},
91:{a:"德萊尼", h:"不死族"},
395:{a:"人類", h:"血精靈"},
184:{a:"德萊尼", h:"獸人"},
92:{a:"人類", h:"獸人"},
341:{a:"人類", h:"不死族"},
347:{a:"人類", h:"不死族"},
179:{a:"德萊尼", h:"獸人"},
87:{a:"人類", h:"獸人"},
287:{a:"人類", h:"獸人"},
390:{a:"德萊尼", h:"巨魔"},
107:{a:"德萊尼", h:"血精靈"},
326:{a:"矮人", h:"牛頭人"},
235:{a:"德萊尼", h:"血精靈"},
288:{a:"地精", h:"不死族"},
189:{a:"獨眼魔", h:"獨眼魔"},
230:{a:"狼人", h:"獸人"},
447:{a:"矮人", h:"不死族"},
444:{a:"地精", h:"巨魔"},
371:{a:"矮人", h:"不死族"},
153:{a:"矮人", h:"獸人"},
254:{a:"狼人", h:"巨魔"},
365:{a:"地精", h:"獸人"},
295:{a:"血精灵", h:"血精靈"},
408:{a:"狼人", h:"不死族"},
271:{a:"矮人", h:"不死族"},
262:{a:"夜精靈", h:"牛頭人"},
401:{a:"矮人", h:"獸人"},
360:{a:"狼人", h:"血精靈"},
434:{a:"錦魚人", h:"錦魚人"},
385:{a:"矮人", h:"巨魔"},
368:{a:"人類", h:"血精靈"},
377:{a:"矮人", h:"獸人"},
32:{a:"巨魔", h:"巨魔"},
463:{a:"夜精靈", h:"不死族"},
276:{a:"人類", h:"巨魔"},
413:{a:"人類", h:"獸人"},
258:{a:"狼人", h:"牛頭人"},
265:{a:"狼人", h:"巨魔"},
96:{a:"夜精靈", h:"巨魔"},
427:{a:"地精", h:"牛頭人"},
431:{a:"矮人", h:"獸人"},
350:{a:"地精", h:"牛頭人"},
301:{a:"矮人", h:"巨魔"},
379:{a:"矮人", h:"熊貓人"},
354:{a:"夜精靈", h:"不死族"},
115:{a:"矮人", h:"血精靈"},
441:{a:"矮人", h:"牛頭人"},
410:{a:"狼人", h:"不死族"},
398:{a:"人類", h:"血精靈"},
323:{a:"矮人", h:"牛頭人"},
277:{a:"德萊尼", h:"血精靈"},
289:{a:"矮人", h:"不死族"},
450:{a:"夜精靈", h:"不死族"},
335:{a:"德萊尼", h:"血精靈"},
426:{a:"矮人", h:"獸人"},
384:{a:"矮人", h:"牛頭人"},
93:{a:"地精", h:"巨魔"},
180:{a:"狼人", h:"巨魔"},
89:{a:"矮人", h:"哥不林"},
436:{a:"熊貓人", h:"熊貓人"},
299:{a:"德萊尼", h:"血精靈"},
270:{a:"狼人", h:"不死族"},
330:{a:"人類", h:"血精靈"},
383:{a:"德萊尼", h:"巨魔"},
397:{a:"矮人", h:"不死族"},
88:{a:"地精", h:"獸人"},
211:{a:"矮人", h:"哥不林"},
170:{a:"刃牙虎人", h:"刃牙虎人"},
245:{a:"夜精靈", h:"牛頭人"},
113:{a:"矮人", h:"哥不林"},
110:{a:"矮人", h:"牛頭人"},
449:{a:"夜精靈", h:"熊貓人"},
119:{a:"熊貓人", h:"熊貓人"},
294:{a:"狼人", h:"巨魔"},
403:{a:"矮人", h:"血精靈"},
236:{a:"矮人", h:"牛頭人"},
343:{a:"矮人", h:"牛頭人"},
453:{a:"矮人", h:"不死族"},
402:{a:"地精", h:"巨魔"},
263:{a:"夜精靈", h:"巨魔"},
331:{a:"德萊尼", h:"血精靈"},
248:{a:"狼人", h:"巨魔"},
190:{a:"人類", h:"人類"},
97:{a:"矮人", h:"不死族"},
355:{a:"矮人", h:"巨魔"},
419:{a:"矮人", h:"不死族"},
396:{a:"人類", h:"獸人"},
374:{a:"夜精靈", h:"巨魔"},
105:{a:"人類", h:"血精靈"},
359:{a:"人類", h:"獸人"},
253:{a:"夜精靈", h:"牛頭人"},
386:{a:"熊貓人", h:"獸人"},
416:{a:"夜精靈", h:"哥不林"},
432:{a:"熊貓人", h:"熊貓人"},
112:{a:"夜精靈", h:"血精靈"},
414:{a:"狼人", h:"血精靈"},
284:{a:"夜精靈", h:"不死族"},
407:{a:"地精", h:"不死族"},
392:{a:"德萊尼", h:"哥不林"},
448:{a:"猴人", h:"猴人"},
283:{a:"人類", h:"血精靈"},
247:{a:"夜精靈", h:"巨魔"},
361:{a:"夜精靈", h:"血精靈"},
192:{a:"哥不林", h:"哥不林"},
348:{a:"地精", h:"血精靈"},
421:{a:"德萊尼", h:"血精靈"},
442:{a:"地精", h:"巨魔"},
269:{a:"人類", h:"獸人"},
373:{a:"人類", h:"不死族"},
102:{a:"人類", h:"不死族"},
157:{a:"獸人", h:"獸人"},
422:{a:"人類", h:"牛頭人"},
391:{a:"德萊尼", h:"哥不林"},
356:{a:"狼人", h:"血精靈"},
118:{a:"熊貓人", h:"熊貓人"},
332:{a:"德萊尼", h:"牛頭人"},
437:{a:"熊貓人", h:"熊貓人"},
338:{a:"德萊尼", h:"血精靈"},
362:{a:"地精", h:"不死族"},
106:{a:"人類", h:"血精靈"},
103:{a:"人類", h:"不死族"},
272:{a:"夜精靈", h:"熊貓人"},
438:{a:"矮人", h:"不死族"},
154:{a:"人類", h:"血精靈"},
239:{a:"德萊尼", h:"熊貓人"},
329:{a:"人類", h:"牛頭人"},
372:{a:"矮人", h:"不死族"},
114:{a:"德萊尼", h:"不死族"},
302:{a:"人類", h:"血精靈"},
94:{a:"人類", h:"不死族"},
233:{a:"地精", h:"牛頭人"},
155:{a:"德萊尼", h:"獸人"},
443:{a:"德萊尼", h:"血精靈"},
228:{a:"狼人", h:"哥不林"},
117:{a:"人類", h:"不死族"},
415:{a:"矮人", h:"不死族"},
409:{a:"狼人", h:"巨魔"},
337:{a:"人類", h:"血精靈"},
95:{a:"夜精靈", h:"哥不林"},
290:{a:"夜精靈", h:"熊貓人"},
275:{a:"矮人", h:"牛頭人"},
349:{a:"德萊尼", h:"熊貓人"},
109:{a:"德萊尼", h:"獸人"},
98:{a:"夜精靈", h:"牛頭人"},
111:{a:"矮人", h:"獸人"},
378:{a:"矮人", h:"牛頭人"},
325:{a:"矮人", h:"牛頭人"},
366:{a:"熊貓人", h:"巨魔"},
242:{a:"人類", h:"不死族"},
176:{a:"德萊尼", h:"獸人"},
171:{a:"機械", h:"機械"},
34:{a:"夜精靈", h:"牛頭人"},
264:{a:"夜精靈", h:"牛頭人"},
252:{a:"狼人", h:"巨魔"},
185:{a:"德萊尼", h:"獸人"},
212:{a:"德萊尼", h:"獸人"},
159:{a:"德萊尼", h:"獸人"},
324:{a:"人類", h:"牛頭人"},
300:{a:"人類", h:"不死族"},
99:{a:"狼人", h:"巨魔"},
101:{a:"夜精靈", h:"巨魔"},
380:{a:"矮人", h:"巨魔"},
183:{a:"獸人", h:"獸人"},
246:{a:"狼人", h:"巨魔"},
404:{a:"地精", h:"巨魔"},
259:{a:"狼人", h:"巨魔"},
435:{a:"人類", h:"獸人"},
268:{a:"夜精靈", h:"牛頭人"},
90:{a:"地精", h:"血精靈"},
251:{a:"狼人", h:"巨魔"},
428:{a:"人類", h:"不死族"},
296:{a:"矮人", h:"獸人"},
234:{a:"地精", h:"巨魔"},
182:{a:"人類", h:"獸人"},
425:{a:"德萊尼", h:"不死族"},
293:{a:"地精", h:"巨魔"},
344:{a:"熊貓人", h:"巨魔"},
172:{a:"人類", h:"人類"},
205:{a:"德萊尼", h:"德萊尼"},
281:{a:"矮人", h:"獸人"},
120:{a:"熊貓人", h:"熊貓人"},
420:{a:"熊貓人", h:"巨魔"},
116:{a:"夜精靈", h:"血精靈"},
108:{a:"狼人", h:"巨魔"},
367:{a:"地精", h:"熊貓人"},
241:{a:"矮人", h:"不死族"},
336:{a:"人類", h:"血精靈"},
217:{a:"夜精靈", h:"牛頭人"},
229:{a:"矮人", h:"不死族"},
282:{a:"熊貓人", h:"哥不林"},
353:{a:"人類", h:"牛頭人"},
278:{a:"矮人", h:"牛頭人"},
186:{a:"德萊尼", h:"獸人"},
100:{a:"狼人", h:"牛頭人"},
195:{a:"人類", h:"不死族"},
104:{a:"狼人", h:"血精靈"},
257:{a:"夜精靈", h:"牛頭人"},
433:{a:"熊貓人", h:"熊貓人"},
240:{a:"人類", h:"獸人"},
389:{a:"德萊尼", h:"哥不林"},
168:{a:"埃匹希斯守衛", h:"埃匹希斯守衛"}
};
RACE_MATCH = {
63:RACE[455].a,
64:RACE[177].a,
65:RACE[382].a,
66:RACE[279].a,
67:RACE[459].a,
68:RACE[250].a,
69:RACE[436].a
};

