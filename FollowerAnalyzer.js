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
    follower.raceName = (follower.id in RACE_A) ? RACE_A[follower.id] : follower.race;
    follower.specName = SPEC[follower.spec];
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
2:"血魄死亡騎士",
3:"冰霜死亡騎士",
4:"穢邪死亡騎士",
5:"平衡德魯伊",
7:"野性戰鬥德魯伊",
8:"守護者德魯伊",
9:"恢復德魯伊",
10:"野獸控制獵人",
12:"射擊獵人",
13:"生存獵人",
14:"秘法法師",
15:"火焰法師",
16:"冰霜法師",
17:"釀酒武僧",
18:"織霧武僧",
19:"御風武僧",
20:"神聖聖騎士",
21:"防護聖騎士",
22:"懲戒聖騎士",
23:"戒律牧師",
24:"神聖牧師",
25:"暗影牧師",
26:"刺殺盜賊",
27:"戰鬥盜賊",
28:"敏銳盜賊",
29:"元素薩滿",
30:"增強薩滿",
31:"恢復薩滿",
32:"痛苦術士",
33:"惡魔學識術士",
34:"毀滅術士",
35:"武器戰士",
37:"狂怒戰士",
38:"防護戰士"
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
var RACE_A = {
225:"獸人",
177:"人類",
178:"人類",
203:"豺狼人",
455:"地精",
406:"狼人",
382:"矮人",
351:"矮人",
285:"德萊尼",
363:"人類",
237:"夜精靈",
429:"矮人",
280:"狼人",
279:"夜精靈",
417:"人類",
364:"夜精靈",
400:"人類",
345:"人類",
459:"德萊尼",
394:"矮人",
297:"夜精靈",
462:"高等鴉人",
207:"德萊尼",
333:"矮人",
216:"矮人",
387:"矮人",
250:"狼人",
424:"狼人",
357:"夜精靈",
298:"熊貓人",
231:"人類",
388:"矮人",
327:"德萊尼",
430:"夜精靈",
334:"矮人",
346:"夜精靈",
255:"夜精靈",
274:"夜精靈",
412:"人類",
370:"狼人",
260:"夜精靈",
376:"地精",
273:"人類",
286:"人類",
219:"刃牙虎人",
352:"狼人",
244:"夜精靈",
375:"矮人",
238:"狼人",
445:"熊貓人",
399:"人類",
439:"人類",
405:"矮人",
292:"夜精靈",
202:"人類",
393:"德萊尼",
340:"矮人",
303:"矮人",
328:"人類",
440:"夜精靈",
267:"狼人",
194:"木精",
460:"哥不林",
232:"夜精靈",
411:"地精",
304:"夜精靈",
358:"夜精靈",
452:"地精",
381:"德萊尼",
249:"夜精靈",
224:"鴉人流亡者",
218:"鴉人流亡者",
423:"夜精靈",
291:"人類",
266:"夜精靈",
446:"人類",
193:"巨魔",
451:"地精",
243:"矮人",
261:"狼人",
256:"狼人",
458:"德萊尼",
339:"德萊尼",
418:"夜精靈",
369:"夜精靈",
342:"人類",
209:"食人妖",
227:"人類",
204:"人類",
208:"德萊尼",
91:"德萊尼",
395:"人類",
184:"德萊尼",
92:"人類",
341:"人類",
347:"人類",
179:"德萊尼",
87:"人類",
287:"人類",
390:"德萊尼",
107:"德萊尼",
326:"矮人",
235:"德萊尼",
288:"地精",
189:"獨眼魔",
230:"狼人",
447:"矮人",
444:"地精",
371:"矮人",
153:"矮人",
254:"狼人",
365:"地精",
295:"血精灵",
408:"狼人",
271:"矮人",
262:"夜精靈",
401:"矮人",
360:"狼人",
434:"錦魚人",
385:"矮人",
368:"人類",
377:"矮人",
32:"巨魔",
463:"夜精靈",
276:"人類",
413:"人類",
258:"狼人",
265:"狼人",
96:"夜精靈",
427:"地精",
431:"矮人",
350:"地精",
301:"矮人",
379:"矮人",
354:"夜精靈",
115:"矮人",
441:"矮人",
410:"狼人",
398:"人類",
323:"矮人",
277:"德萊尼",
289:"矮人",
450:"夜精靈",
335:"德萊尼",
426:"矮人",
384:"矮人",
93:"地精",
180:"狼人",
89:"矮人",
436:"熊貓人",
299:"德萊尼",
270:"狼人",
330:"人類",
383:"德萊尼",
397:"矮人",
88:"地精",
211:"矮人",
170:"刃牙虎人",
245:"夜精靈",
113:"矮人",
110:"矮人",
449:"夜精靈",
119:"熊貓人",
294:"狼人",
403:"矮人",
236:"矮人",
343:"矮人",
453:"矮人",
402:"地精",
263:"夜精靈",
331:"德萊尼",
248:"狼人",
190:"人類",
97:"矮人",
355:"矮人",
419:"矮人",
396:"人類",
374:"夜精靈",
105:"人類",
359:"人類",
253:"夜精靈",
386:"熊貓人",
416:"夜精靈",
432:"熊貓人",
112:"夜精靈",
414:"狼人",
284:"夜精靈",
407:"地精",
392:"德萊尼",
448:"猴人",
283:"人類",
247:"夜精靈",
361:"夜精靈",
192:"哥不林",
348:"地精",
421:"德萊尼",
442:"地精",
269:"人類",
373:"人類",
102:"人類",
157:"獸人",
422:"人類",
391:"德萊尼",
356:"狼人",
118:"熊貓人",
332:"德萊尼",
437:"熊貓人",
338:"德萊尼",
362:"地精",
106:"人類",
103:"人類",
272:"夜精靈",
438:"矮人",
154:"人類",
239:"德萊尼",
329:"人類",
372:"矮人",
114:"德萊尼",
302:"人類",
94:"人類",
233:"地精",
155:"德萊尼",
443:"德萊尼",
228:"狼人",
117:"人類",
415:"矮人",
409:"狼人",
337:"人類",
95:"夜精靈",
290:"夜精靈",
275:"矮人",
349:"德萊尼",
109:"德萊尼",
98:"夜精靈",
111:"矮人",
378:"矮人",
325:"矮人",
366:"熊貓人",
242:"人類",
176:"德萊尼",
171:"機械",
34:"夜精靈",
264:"夜精靈",
252:"狼人",
185:"德萊尼",
212:"德萊尼",
159:"德萊尼",
324:"人類",
300:"人類",
99:"狼人",
101:"夜精靈",
380:"矮人",
183:"獸人",
246:"狼人",
404:"地精",
259:"狼人",
435:"人類",
268:"夜精靈",
90:"地精",
251:"狼人",
428:"人類",
296:"矮人",
234:"地精",
182:"人類",
425:"德萊尼",
293:"地精",
344:"熊貓人",
172:"人類",
205:"德萊尼",
281:"矮人",
120:"熊貓人",
420:"熊貓人",
116:"夜精靈",
108:"狼人",
367:"地精",
241:"矮人",
336:"人類",
217:"夜精靈",
229:"矮人",
282:"熊貓人",
353:"人類",
278:"矮人",
186:"德萊尼",
100:"狼人",
195:"人類",
104:"狼人",
257:"夜精靈",
433:"熊貓人",
240:"人類",
389:"德萊尼",
168:"埃匹希斯守衛"
};
var RACE_H = {
225:"獸人",
177:"人類",
178:"人類",
203:"豺狼人",
455:"哥不林",
406:"哥不林",
382:"獸人",
351:"巨魔",
285:"獸人",
363:"獸人",
237:"獸人",
429:"熊貓人",
280:"哥不林",
279:"巨魔",
417:"獸人",
364:"獸人",
400:"獸人",
345:"不死族",
459:"獸人",
394:"獸人",
297:"巨魔",
462:"高等鴉人",
207:"血精靈",
333:"牛頭人",
216:"不死族",
387:"哥不林",
250:"牛頭人",
424:"哥不林",
357:"哥不林",
298:"哥不林",
231:"血精靈",
388:"牛頭人",
327:"血精靈",
430:"牛頭人",
334:"牛頭人",
346:"巨魔",
255:"巨魔",
274:"牛頭人",
412:"血精靈",
370:"哥不林",
260:"牛頭人",
376:"血精靈",
273:"獸人",
286:"牛頭人",
219:"刃牙虎人",
352:"不死族",
244:"牛頭人",
375:"巨魔",
238:"哥不林",
445:"獸人",
399:"獸人",
439:"獸人",
405:"哥不林",
292:"獸人",
202:"人類",
393:"獸人",
340:"牛頭人",
303:"哥不林",
328:"牛頭人",
440:"熊貓人",
267:"巨魔",
194:"木精",
460:"哥不林",
232:"牛頭人",
411:"巨魔",
304:"血精靈",
358:"血精靈",
452:"巨魔",
381:"牛頭人",
249:"牛頭人",
224:"鴉人流亡者",
218:"鴉人流亡者",
423:"獸人",
291:"獸人",
266:"牛頭人",
446:"牛頭人",
193:"巨魔",
451:"熊貓人",
243:"巨魔",
261:"巨魔",
256:"巨魔",
458:"獸人",
339:"血精靈",
418:"牛頭人",
369:"哥不林",
342:"人類",
209:"食人妖",
227:"獸人",
204:"不死族",
208:"德萊尼",
91:"不死族",
395:"血精靈",
184:"獸人",
92:"獸人",
341:"不死族",
347:"不死族",
179:"獸人",
87:"獸人",
287:"獸人",
390:"巨魔",
107:"血精靈",
326:"牛頭人",
235:"血精靈",
288:"不死族",
189:"獨眼魔",
230:"獸人",
447:"不死族",
444:"巨魔",
371:"不死族",
153:"獸人",
254:"巨魔",
365:"獸人",
295:"血精靈",
408:"不死族",
271:"不死族",
262:"牛頭人",
401:"獸人",
360:"血精靈",
434:"錦魚人",
385:"巨魔",
368:"血精靈",
377:"獸人",
32:"巨魔",
463:"不死族",
276:"巨魔",
413:"獸人",
258:"牛頭人",
265:"巨魔",
96:"巨魔",
427:"牛頭人",
431:"獸人",
350:"牛頭人",
301:"巨魔",
379:"熊貓人",
354:"不死族",
115:"血精靈",
441:"牛頭人",
410:"不死族",
398:"血精靈",
323:"牛頭人",
277:"血精靈",
289:"不死族",
450:"不死族",
335:"血精靈",
426:"獸人",
384:"牛頭人",
93:"巨魔",
180:"巨魔",
89:"哥不林",
436:"熊貓人",
299:"血精靈",
270:"不死族",
330:"血精靈",
383:"巨魔",
397:"不死族",
88:"獸人",
211:"哥不林",
170:"刃牙虎人",
245:"牛頭人",
113:"哥不林",
110:"牛頭人",
449:"熊貓人",
119:"熊貓人",
294:"巨魔",
403:"血精靈",
236:"牛頭人",
343:"牛頭人",
453:"不死族",
402:"巨魔",
263:"巨魔",
331:"血精靈",
248:"巨魔",
190:"人類",
97:"不死族",
355:"巨魔",
419:"不死族",
396:"獸人",
374:"巨魔",
105:"血精靈",
359:"獸人",
253:"牛頭人",
386:"獸人",
416:"哥不林",
432:"熊貓人",
112:"血精靈",
414:"血精靈",
284:"不死族",
407:"不死族",
392:"哥不林",
448:"猴人",
283:"血精靈",
247:"巨魔",
361:"血精靈",
192:"哥不林",
348:"血精靈",
421:"血精靈",
442:"巨魔",
269:"獸人",
373:"不死族",
102:"不死族",
157:"獸人",
422:"牛頭人",
391:"哥不林",
356:"血精靈",
118:"熊貓人",
332:"牛頭人",
437:"熊貓人",
338:"血精靈",
362:"不死族",
106:"血精靈",
103:"不死族",
272:"熊貓人",
438:"不死族",
154:"血精靈",
239:"熊貓人",
329:"牛頭人",
372:"不死族",
114:"不死族",
302:"血精靈",
94:"不死族",
233:"牛頭人",
155:"獸人",
443:"血精靈",
228:"哥不林",
117:"不死族",
415:"不死族",
409:"巨魔",
337:"血精靈",
95:"哥不林",
290:"熊貓人",
275:"牛頭人",
349:"熊貓人",
109:"獸人",
98:"牛頭人",
111:"獸人",
378:"牛頭人",
325:"牛頭人",
366:"巨魔",
242:"不死族",
176:"獸人",
171:"機械",
34:"牛頭人",
264:"牛頭人",
252:"巨魔",
185:"獸人",
212:"獸人",
159:"獸人",
324:"牛頭人",
300:"不死族",
99:"巨魔",
101:"巨魔",
380:"巨魔",
183:"獸人",
246:"巨魔",
404:"巨魔",
259:"巨魔",
435:"獸人",
268:"牛頭人",
90:"血精靈",
251:"巨魔",
428:"不死族",
296:"獸人",
234:"巨魔",
182:"獸人",
425:"不死族",
293:"巨魔",
344:"巨魔",
172:"人類",
205:"德萊尼",
281:"獸人",
120:"熊貓人",
420:"巨魔",
116:"血精靈",
108:"巨魔",
367:"熊貓人",
241:"不死族",
336:"血精靈",
217:"牛頭人",
229:"不死族",
282:"哥不林",
353:"牛頭人",
278:"牛頭人",
186:"獸人",
100:"牛頭人",
195:"不死族",
104:"血精靈",
257:"牛頭人",
433:"熊貓人",
240:"獸人",
389:"哥不林",
168:"埃匹希斯守衛"
};
RACE_MATCH = {
63:RACE_A[455],
64:RACE_A[177],
65:RACE_A[382],
66:RACE_A[279],
67:RACE_A[459],
68:RACE_A[250],
69:RACE_A[436]
};

