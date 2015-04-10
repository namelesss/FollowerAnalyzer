
var Options = {
  faction:"a",
  only100:true,
  ilv:"required",
};
var ABIDB;
var traitStatistics;
var raceMatchList;
var FOLLOWERDB = [];
var TrioDB = {};
var MATCHDB = {};
var followerTooltip = {};
var curMission;


function fetchData(dataString)
{
  var result = ("" + dataString).split("\n");

  // Fetch Data
  if (result.length < 2) return;
  showCoverMsg(); // Additional Show far before selectMission()
  MATCHDB = {};
  ABIDB.reset();
  traitStatistics.reset();  
  raceMatchList = new RaceMatchList();
  followerTooltip = {};

  genFollowerList(result);
  traitStatistics.genStatisticData();
  raceMatchList.genList();

  followerListC.createList(FOLLOWERDB);
  abilityListC.createList(ABIDB.list);
  // Generate Match tab data
  sortTitleIdx = -1; // Cancel sort by user
  selectMission($("#missionType").val());
  FOLLOWERDB.sort(function(a, b) { return sortFunc(a, b, -1, ["level", "iLevel", "average", "id"]); });  
}

function handleFile(e)
{
  fetchData(e.target.result);
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
      $("#file_path").val("檔案: " + path);
    });
  });
}

function loadFileFromStorageEntry()
{
  chrome.storage.local.get('chosenFile', function(items) 
  {
    if (items.chosenFile) 
      chrome.fileSystem.isRestorable(items.chosenFile, function(bIsRestorable) 
      {
        if (bIsRestorable) 
          chrome.fileSystem.restoreEntry(items.chosenFile, function(chosenEntry) 
          {
            if (chosenEntry) 
              loadFileEntry(chosenEntry);
          });
      });
  });
}


function selectMission(type)
{
  for (var i = 0; i < MISSIONS.length; ++i)
  {
    var m = MISSIONS[i];
    if (m.type == type)
    {
      curMission = m;
      showCoverMsg();
      setTimeout(function () 
      {
        genMatchList();

        var tabs = {};
        for (var j = 0; j < m.list.length; ++j)
        {
          tabs[j] = {name:("任務"+(j+1))};
          if (MATCHDB[curMission.type][j].length < 0 || MATCHDB[type][j][0].rate < 1)
            tabs[j].red = true;
        }
        tabC.createTab(tabs);
        if (sortTitleIdx >= 0)
          FOLLOWERDB.sort(function(a, b) { return sortFunc(a, b, sortFlag, followerListTable[sortTitleIdx].sortSeq); });
        followerListC.updateList();
        abilityListC.updateList();
        hideCoverMsg();
      }, 10);

      return;
    }
  }
}

// UI indepentant functions
//
// Fetch follower data from input array
function genFollowerList(dataArray)
{
  FOLLOWERDB = [];
  for (var i = 0; i < dataArray.length; ++i)
  {
    var str = dataArray[i].split(",");
    if (!str[0]) continue;
    var follower = {};
    var abi = follower.abilities = [];
    var tra = follower.traits = [];  
    follower.id = str[0];

    follower.spec = parseInt(str[1]);
    follower.quality = parseInt(str[2]);
    follower.level = parseInt(str[3]);
    follower.iLevel = parseInt(str[4]);
    follower.active = !(str[5] == "1");
    if (str[6]) abi.push(parseInt(str[6]));
    if (str[7]) abi.push(parseInt(str[7]));
    if (str[8]) abi.push(parseInt(str[8]));
    if (str[9]) tra.push(parseInt(str[9]));
    if (str[10]) tra.push(parseInt(str[10]));
    if (str[11]) tra.push(parseInt(str[11]));
    follower.countQuest = [];

    follower.inactive = follower.active ? "" :"☆" ;
    follower.nameColor = QUALITY[follower.quality];
    follower.name = (follower.id in RACE) ? RACE[follower.id][Options.faction].name : follower.id;
    follower.raceName = (follower.id in RACE) ? RACE[follower.id][Options.faction].race : follower.race;
    follower.specName = SPEC[follower.spec].name;
    follower.ability1 = genImg(ABILITY[abi[0]]);
    follower.ability2 = (1 in abi) ? genImg(ABILITY[abi[1]]) : "";
    follower.ability3 = (2 in abi) ? genImg(ABILITY[abi[2]]) : "";
    follower.trait1 = genImg(TRAIT[tra[0]]);
    follower.trait2 = (1 in tra) ? genImg(TRAIT[tra[1]]) : "";
    follower.trait3 = (2 in tra) ? genImg(TRAIT[tra[2]]) : "";
    follower.countOutput = "";
    FOLLOWERDB.push(follower);

    // add to ABIDB
    ABIDB.addFollower(follower);

    // add to traitStatistics
    traitStatistics.addFollower(follower);

    // add to raceMatchList
    raceMatchList.addFollower(follower);

    // add Follower tooltip
    followerTooltip[follower.name] = genFollowerTooltip(follower).html();
  }
}


function calMatchDB(matchList)
{
  for (var i = 0; i < curMission.list.length; ++i)
  {
    for (var f = 0; f < FOLLOWERDB.length; ++f)
    {
      if (!FOLLOWERDB[f].countQuest[curMission.type]) 
        FOLLOWERDB[f].countQuest[curMission.type] = [];
      FOLLOWERDB[f].countQuest[curMission.type][i] = 0;
    }

    var bound = 1, MATCH_MAX = 5;
    matchList[i] = doMatchMission(curMission.list[i], bound);
    if (matchList[i].length == 0)
      do
      {
        bound -= 0.05;
        matchList[i] = doMatchMission(curMission.list[i], bound);
      }while (matchList[i].length < MATCH_MAX && bound > 0);
    // sort
    matchList[i].sort(function(a, b) { return b.rate - a.rate; });
    // update ability set
    if (bound < 1 && curMission.list[i].threats.length == 6)
      $.each(matchList[i], function () 
      {
        var flag= this.matchedFlag;
        var idx1, idx2;
        if ((idx1 = flag.indexOf(3)) >= 0)
          if ((idx2 = flag.indexOf(3, idx1+1)) >= 0)
            if (flag[3-idx1-idx2] == 0) // not Checked
              ABIDB.addNeededAbi(this.unMatchList, curMission.type, i+1);
            else // won't be 3
            {
              var idx = 3-idx1-idx2;
              var abis = [this.team[idx].abilities[flag[idx]-1], this.unMatchList[0]];
              ABIDB.addNeededAbi(abis, curMission.type, i + 1);
            }
      });

    for (var j = 0; j < matchList[i].length; ++j)
    {
      var curMatch = matchList[i][j];

      $.each(curMatch.team, function() { this.countQuest[curMission.type][i]++});

      curMatch.successRate = (curMatch.rate * 100).toFixed(2)  + "%";
      curMatch.matchComp = genMatchTable(curMatch);
      var unMatchHtml = "";
      for (var abi in curMatch.unMatchList)
        unMatchHtml += genImg(ABILITY[curMatch.unMatchList[abi]], {inList:true});
      curMatch.unMatch = unMatchHtml;
      var matchTraitHtml = "";
      for (var tar in curMatch.traitMatchList)
        matchTraitHtml += genImg(TRAIT[curMatch.traitMatchList[tar]], {inList:true});
      curMatch.matchTrait = matchTraitHtml;
      curMatch.qTime = genTime(curMatch.questTime, (curMatch.traitMatchList.indexOf(221) >= 0));
    }
  }
}

function traverseMatch(matchList, comp, i, least)
{
  for(var j = 0; j < matchList[i].length; ++j)
  {
    var localCount = 0;
    comp.detail.push(matchList[i][j]);
    $.each(matchList[i][j].team, function() 
    {
      if (comp.list.indexOf(this.name) < 0)
        localCount++;
      comp.list.push(this.name);
    });
    comp.count += localCount;
    if (i < matchList.length - 1) 
      traverseMatch(matchList, comp, i + 1, least); // recursion
    else // last encounter, need more condition
      if (comp.count < least.comp.count)
      { //copy
        least.comp.count = comp.count;
        least.comp.detail = comp.detail.slice(0);
       // console.info(localComp.count);
      }
    comp.detail.pop();
    comp.list.pop();comp.list.pop();comp.list.pop();
    comp.count -= localCount;
  }
}

function genMatchList()
{
  if (!MATCHDB[curMission.type])
    calMatchDB(MATCHDB[curMission.type] = [])

  // fill average to FOLLOWERDB
  for (var f in FOLLOWERDB)
  {
    var average = 0; 
    FOLLOWERDB[f].countOutput = "";
    for (var i = 0; i < curMission.list.length; ++i)
    {
      var count = 0;
      if (FOLLOWERDB[f].countQuest[curMission.type][i] == 0 || MATCHDB[curMission.type][i].length == 0)
         count = 0;
      else
        count = FOLLOWERDB[f].countQuest[curMission.type][i] * 100 / MATCHDB[curMission.type][i].length;
      if (count > 50)
        FOLLOWERDB[f].countOutput += genText(count.toFixed(2)+"% ", {color:"red"});
      else
        FOLLOWERDB[f].countOutput += genText(count.toFixed(2) + "% ");
      average += count;
    }
    FOLLOWERDB[f].average = average/4;
    FOLLOWERDB[f].countOutput = FOLLOWERDB[f].average.toFixed(2) + "%(" + FOLLOWERDB[f].countOutput + ")";
  }

  // Get Least Team members
  var product = 1;
  $.each(MATCHDB[curMission.type], function () { product *= this.length });
  if (product < 1000000)
  {
    var least = {comp:{count:999}};
    traverseMatch(MATCHDB[curMission.type], {count:0,list:[],detail:[]}, 0, least);
    $("#leastTitle").css("color","white")
      .text("最少人數："+least.comp.count+"/"+(MATCHDB[curMission.type].length*3));
    $("#leastComp").empty().css("display","table");
    for (var i in MATCHDB[curMission.type])
    {
      var wrapper = $("<div></div>").css("display", "table-row")
        .append(genText("任務" + (parseInt(i) + 1), (MATCHDB[curMission.type][i][0].rate < 1)?{color:"Brown"}:0));
      for (var x = 0; x < 4; ++x) // Restrict 4 max followers
      {
        if (x <least.comp.detail[i].team.length)
          wrapper.append(
            genFollower(least.comp.detail[i].team[x], curMission.iLevel)
            .css("display", "table-cell").css("padding", "2px"));
        else
          wrapper.append($("<div></div>").css("display", "table-cell"));
      }
      wrapper.append(least.comp.detail[i].successRate);
      $("#leastComp").append(wrapper);
    }
  }
  else
  {
    $("#leastTitle").css("color","white").text("無法計算");
    $("#leastComp").empty();
  }
}

function isRaceMatch(trait, numF, followerByIdx)
{
  if (trait in RACE_SAMPLE_ID.u)
  {
  }
  else if (trait in RACE_MATCH)
    for (var i = 1; i < numF; ++i)
    {
      var f = followerByIdx(i);
      if (f.id == 466)
        return (trait == 67 && Options.faction == "a") || (trait == 70 && Options.faction == "h");
      else if (RACE_MATCH[trait] == f.raceName)
        return true;
    }
  return false;
}

function successRate(quest, matchInfo)
{
  var needNumFollowers = quest.numFollowers;
  var needILV = quest.iLevel;
  var numF = quest.numFollowers;
  var base = quest.threats.length * 3 + needNumFollowers;
  var traitMatchList = [];
  var numEpicMount = 0, numHighStamina = 0, numBurstPower = 0, numDancer = 0;
  var numMasterAssassin = 0;

  var raceMatch = 0;
  var followerP = 0;
  var followers = matchInfo.team;
  for (var f = 0; f < followers.length; ++f)
  {
    // Follower Contribute
    var calILV = needILV;
    if (Options.ilv == "current") calILV = followers[f].iLevel;
    if (Options.ilv == "highest") calILV = 675;
    var olv = (calILV > needILV) ? 1 + Math.min(calILV - needILV, 15)/30 : 1;
    var llv = (calILV < needILV) ? 1 - Math.min(needILV - calILV, 30)/15 : 1;
    var abiMatch = parseInt((matchInfo.matchedFlag[f] + 1) / 2);
    followerP += 3 * abiMatch * llv + olv;
    // Normal Trait Match
    var personalNumDancer = 0;
    for (var t in followers[f].traits)
    {
      var trait = followers[f].traits[t];
      switch (trait)
      {
        case quest.type: // Encounter Type Match
          traitMatchList.push(quest.type); break;
        case 201: // Combat Experience
          traitMatchList.push(201); break;
        case 47: // Master Assassin
          traitMatchList.push(47);
          numMasterAssassin++;
          break;
        case 221: // Epic Mount
          numEpicMount++; break;
        case 76: // High Stamina
          numHighStamina++; break;
        case 77: // Burst of Power
          numBurstPower++; break;
        case 232:
          if (matchInfo.unMatchList.indexOf(6) >= 0) // Dancer
            personalNumDancer++; 
          break;
        default:
          if (isRaceMatch(trait, numF, function(i) { return  followers[(f+i)%numF]; }))
          {
            raceMatch++;
            traitMatchList.push(trait);
          }
      }
    }
    numDancer = (personalNumDancer > numDancer) ? personalNumDancer : numDancer;
  }
  var qTime = quest.time / Math.pow(2,numEpicMount);
  if (qTime > 7*60)
    for (var i = 0; i < numHighStamina; ++i)
      traitMatchList.push(76);
  else
    for (var i = 0; i < numBurstPower; ++i)
      traitMatchList.push(77);
  var traitMatch = traitMatchList.length; // race included
  for (var i = 0; i < numEpicMount; ++i)
    traitMatchList.push(221);
  /* Dancer: if more than two Dancer matched, only 3*P rate will provide. (assumption)*/
  for (var i = 0; i < numDancer; ++i)
    traitMatchList.push(232);
  numDancer = (numDancer > 1) ? 1.5 : numDancer;

  matchInfo.traitMatchList = traitMatchList;
  matchInfo.questTime = qTime;
  matchInfo.qILV = needILV;
  
  return (matchInfo.rate = (followerP + traitMatch + raceMatch * 0.5 + numDancer * 2 + numMasterAssassin * 2) / base);
}

function matchEncounter(threats, f)
{
  var matched = 0;
  for (var i in f.abilities)
  {
    var abi = f.abilities[i];
    for (var j in threats)
      if (threats[j].abi == abi && threats[j].countered == 0)
      {
        threats[j].countered = f.id;
        matched |= (1 << i); // bit1:abi[0] bit2:abi[1]
        break;
      }
  }
  return matched;
}

function doMatchMissionRec(idx, start, quest, threshold, match, tmpData)
{
  for (var me = start; me < FOLLOWERDB.length; ++me)
  {
    if (Options.only100 && FOLLOWERDB[me].level < 100) continue;
    tmpData.matchFlags[idx] = matchEncounter(tmpData.encounter, FOLLOWERDB[me]);
    tmpData.team.push(FOLLOWERDB[me]);

    if (idx < quest.numFollowers - 1)
      doMatchMissionRec(idx + 1, me + 1, quest, threshold, match, tmpData);
    else
    {        
      var matchInfo = {team:tmpData.team.slice(0), 
        matchedFlag:tmpData.matchFlags.slice(0),
        unMatchList:[]};
      for (var i in tmpData.encounter) 
        if (tmpData.encounter[i].countered == 0) 
          matchInfo.unMatchList.push(tmpData.encounter[i].abi);
      var rate = successRate(quest, matchInfo);

      if (rate >= threshold)
        match.push(matchInfo);
    }

    tmpData.team.pop();
    for (var i in tmpData.encounter)
      if (FOLLOWERDB[me].id == tmpData.encounter[i].countered)
        tmpData.encounter[i].countered = 0;
  }
}

function doMatchMission(quest, threshold)
{
  var match = [];
  var tmpData = { team:[], encounter:[], matchFlags:[] };

  for (var i in quest.threats)
  {
    tmpData.encounter.push({abi:quest.threats[i], countered:0}); // countered by follower's id, 0 if not countered
  }

  doMatchMissionRec(0, 0, quest, threshold, match, tmpData);
  
  return match;
}

function getTraits(team)
{
  var trais = {
    numEpicMount:0, numHighStamina:0, 
    numBurstPower:0, numDancer:0,
    numMasterAssassin:0,
    numCombatExperience:0,
    numEnvironment:0,
    env:[],race:[]
  }

  for (var f in team)
  {
    var personalNumDancer = 0;
    for (var t in team[f].traits)
    {
      var trait = team[f].traits[t];
      switch (trait)
      {
        case 45:case 8:case 46:case 48:case 7:case 44:case 49:case 9: // Environment 
        case 37:case  36:case 41:case 40:case 38:case 4:case 39:case 43:case 42: // Slayer
          traits.env.push(quest.type); break;
        case 201: // Combat Experience
          trais.numCombatExperience++; break;
        case 47: // Master Assassin
          trais.numMasterAssassin++; break;
        case 221: // Epic Mount
          trais.numEpicMount++; break;
        case 76: // High Stamina
          trais.numHighStamina++; break;
        case 77: // Burst of Power
          trais.numBurstPower++; break;
        case 232:  // Dancer 
          trais.personalNumDancer++; break;
        default:
          if (isRaceMatch(trait, numF, function(i) { return  team[(f+i)%numF]; }))
            traits.race.push(trait);
      }
    }
    trais.numDancer = (personalNumDancer > trais.numDancer) ? personalNumDancer : trais.numDancer;
  }
  return traits;
}

function followerTrio()
{
  this.trio = {};

  var sortedf = [];
  $.each(FOLLOWERDB, function (key) { sortedf.push(key); });
  sortedf.sort(function(a,b) { return FOLLOWERDB[a].id - FOLLOWERDB[b].id; });
  for (var a = 0; a < sortedf.length; ++a)
    for (var b = a+1; b < sortedf.length; ++b)
      for (var c = b+1; c < sortedf.length; ++c)
      {
        var team = [FOLLOWERDB[sortedf[a]], FOLLOWERDB[sortedf[b]], FOLLOWERDB[sortedf[c]]];
        var teamTraits = getTraits(team);
        trioDB[team] = {team:team, teamTraits:teamTraits};
      }
}

var MISSIONS = [
  { type:"黑石團隊任務", list:[
      { type:7, threats:[2,6,1,3,3,10,8], time:8*60, iLevel:660, rewards:"黑石寶箱", numFollowers:3},
      { type:4, threats:[1,2,6,3,9,10,8], time:8*60, iLevel:660, rewards:"黑石寶箱", numFollowers:3},
      { type:45, threats:[4,7,6,7,4,8,3], time:8*60, iLevel:660, rewards:"黑石寶箱", numFollowers:3},
      { type:41, threats:[6,3,10,1,2,9,7], time:8*60, iLevel:660, rewards:"黑石寶箱", numFollowers:3}
    ]},
  { type:"6.1新任務(675)", list:[
      { type:36, threats:[2,2,8,10], time:10*60, iLevel:675, rewards:"600頂尖水晶", numFollowers:2},
      { type:44, threats:[4,2,8,10], time:10*60, iLevel:675, rewards:"150g", numFollowers:2},
      { type:4, threats:[1,2,3,6,10], time:6*60, iLevel:675, rewards:"訓練書箱", numFollowers:2},
      { type:39, threats:[7,7,1,10], time:8*60, iLevel:675, rewards:"30原始之魂", numFollowers:2},
      { type:9, threats:[9,7,8,9], time:8*60, iLevel:675, rewards:"600頂尖水晶", numFollowers:2},
      { type:45, threats:[2,7,3,6], time:10*60, iLevel:675, rewards:"30原始之魂", numFollowers:2},
      { type:7, threats:[10,1,2,6], time:10*60, iLevel:675, rewards:"150g", numFollowers:2}
    ]},
  { type:"6.1新任務(660)", list:[
      { type:9, threats:[8,4,2,3], time:8*60, iLevel:660, rewards:"400頂尖水晶", numFollowers:2},
      { type:41, threats:[7,3,8,6], time:8*60, iLevel:660, rewards:"20原始之魂", numFollowers:2},
      { type:8, threats:[3,6,4,8], time:8*60, iLevel:660, rewards:"400頂尖水晶", numFollowers:2},
      { type:36, threats:[9,2,8,10], time:8*60, iLevel:660, rewards:"400頂尖水晶", numFollowers:2},
      { type:37, threats:[7,1,2,10], time:8*60, iLevel:660, rewards:"20原始之魂", numFollowers:2},
      { type:46, threats:[7,1,9,2], time:8*60, iLevel:660, rewards:"20原始之魂", numFollowers:2},
      { type:41, threats:[4,6,8,6], time:8*60, iLevel:660, rewards:"20原始之魂", numFollowers:2},
      { type:44, threats:[9,2,9,4], time:8*60, iLevel:660, rewards:"400頂尖水晶", numFollowers:2}
    ]},
  { type:"天槌團隊任務", list:[
      { type:48, threats:[10,8,2,6,9,1], time:8*60, iLevel:645, rewards:"天槌寶箱", numFollowers:3},
      { type:49, threats:[1,9,6,8,9,10], time:8*60, iLevel:645, rewards:"天槌寶箱", numFollowers:3},
      { type:38, threats:[2,10,7,4,9,10], time:8*60, iLevel:645, rewards:"天槌寶箱", numFollowers:3},
      { type:40, threats:[1,3,3,6,7,4], time:8*60, iLevel:645, rewards:"天槌寶箱", numFollowers:3}
    ]},
  { type:"645紫裝任務", list:[
      { type:40, threats:[1,8,2,9], time:8*60, iLevel:630, rewards:"645武器", numFollowers:3},
      { type:4, threats:[8,10,4,8], time:8*60, iLevel:630, rewards:"645肩", numFollowers:3},
      { type:4, threats:[6,10,1,2], time:8*60, iLevel:630, rewards:"645胸", numFollowers:3},
      { type:38, threats:[8,9,1,7], time:8*60, iLevel:630, rewards:"645腳", numFollowers:3},
      { type:4, threats:[6,10,2,10], time:8*60, iLevel:630, rewards:"645項鍊", numFollowers:3},
      { type:43, threats:[8,9,9,10], time:8*60, iLevel:630, rewards:"645飾品", numFollowers:3},
      { type:39, threats:[6,3,1,10], time:8*60, iLevel:630, rewards:"645手腕", numFollowers:3},
    ]},
  { type:"橘戒一階石頭", list:[
      { type:38, threats:[6,2,8,7], time:23*60+53, iLevel:645, rewards:"阿伯加托之石", numFollowers:3},
      { type:47, threats:[2,1,10,3], time:23*60+53, iLevel:645, rewards:"阿伯加托之石", numFollowers:3},
      { type:39, threats:[4,1,2,7,9], time:23*60+53, iLevel:645, rewards:"阿伯加托之石", numFollowers:3},
      { type:47, threats:[3,7,8,6], time:23*60+53, iLevel:645, rewards:"阿伯加托之石", numFollowers:3},
      { type:42, threats:[8,4,3,6,8], time:23*60+53, iLevel:645, rewards:"阿伯加托之石", numFollowers:3}
    ]},
  { type:"橘戒二階符文", list:[
      { type:36, threats:[4,9,8,2,3], time:23*60+53, iLevel:645, rewards:"元素符文", numFollowers:3},
      { type:45, threats:[7,2,3,9,2,3], time:23*60+53, iLevel:645, rewards:"元素符文", numFollowers:3},
      { type:47, threats:[1,8,4,7,6,2], time:23*60+53, iLevel:645, rewards:"元素符文", numFollowers:3},
      { type:49, threats:[8,6,3,9,2,3], time:23*60+53, iLevel:645, rewards:"元素符文", numFollowers:3},
      { type:9, threats:[9,6,1,9,3,2], time:23*60+53, iLevel:645, rewards:"元素符文", numFollowers:3},
      { type:4, threats:[7,3,1,2,10,6], time:23*60+53, iLevel:645, rewards:"元素符文", numFollowers:3}
    ]}
];

var QUALITY = [
  "",
  "",
  "#1eff00",
  "#0070dd",
  "#a335ee",
  "#ff8000"
];

var RACE_SAMPLE_ID = {
  a:{ 63:455, 64:177, 65:382, 66:217, 67:459, 68:250, 69:436 },
  h:{ 69:429, 70:382, 71:345, 72:333, 73:351, 74:207, 75:406 },
  u:{ 252:[32, 189, 193], 253:[168, 171], 254:[224, 462, 218], 255:[170, 219, 203] } 
}; 

var RACE_MATCH = {}; 

