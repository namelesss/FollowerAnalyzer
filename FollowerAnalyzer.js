var menuC = new Tab('#menuC', menuClickCallback);
var tabC = new Tab('#tabC', tabClickCallback);
var mainTabs = {
  followerMenu: {name:"追隨者", selector:"#followerListC"},
  missionMenu: {name:"任務", selector:"#mission-wrapper"}, 
  abilityMenu:{name:"技能組", selector:"#abilityListC"},
  raceMenu:{name:"親合", selector:"#raceC"}
};

var nameStyle = "text-align: left;padding-left: 10px";
var missionListC = new List($('#missionListC'),
    [{key: "successRate", title:"成功率", style:"width:64px!important"},
    {key: "matchComp", title:"配隊組合", style:"padding-left:10px"},
    {key: "unMatch", title:"未反制", style:nameStyle + "min-width:30px!important"},
    {key: "matchTrait", title:"特長", style:nameStyle + "min-width:30px!important"},
    {key: "qTime", title:"任務時間", style:"min-width:64px!important"}
    ]);

var followerListTable = [
    {key: "name", title: "名稱", style:nameStyle, color:"nameColor",width:"140px",
      titleClicked:sortFDB, sortSeq:["quality", "average", "id"]},
    {key: "raceName", title: "種族", style:nameStyle, width:"100px", 
      titleClicked:sortFDB, sortSeq:["raceName", "average", "id"]},
    {key: "specName", title: "職業", style:nameStyle, width:"100px", 
      titleClicked:sortFDB, sortSeq:["spec", "average", "id"]},
    {key: "inactive", title: "停用", width:"50px", 
      titleClicked:sortFDB, sortSeq:["active", "average", "id"]},
    {key: "level", title: "等級",  width:"50px",
      titleClicked:sortFDB, sortSeq:["level", "iLevel", "average", "id"]},
    {key: "iLevel", title: "裝等",  width:"50px",
      titleClicked:sortFDB, sortSeq:["level", "iLevel", "average", "id"]},
    {key: "ability1", title: "技能1",  width:"50px"},
    {key: "ability2", title: "技能2",  width:"50px"},
//    {key: "ability3", title: "技能3",  width:"50px"},
    {key: "trait1", title: "特長1",  width:"50px"},
    {key: "trait2", title: "特長2",  width:"50px"},
    {key: "trait3", title: "特長3",  width:"50px"},
    {key: "countOutput", title: "出場率", style:nameStyle+";white-space: nowrap;overflow:hidden",
      titleClicked:sortFDB, sortSeq:["average", "id"]}
    ];
var followerListC = new List($('#followerListC'), followerListTable);
var abilityListC = new List($('#abilityListC'),
    [{key: "abiComp", title:"技能組", style:"width:80px"},
    {key: "followers", title:"追隨者", style:nameStyle},
    {key:"possible",title:"可期望名單", style:nameStyle},
    {key:"needByMissions",title:"滿足六反制", style:nameStyle+";min-width:110px"},
    {key:"spec",title:"可能職業", style:nameStyle}
    ]);

var RaceMatchSubTable = [
    {key: "nameInactive", title:"名稱", style:nameStyle},
    {key: "raceName", title: "種族", style:nameStyle}, 
    {key: "trait1", title: "",  style:"max-width:50px"},
    {key: "trait2", title: "",  style:"max-width:50px"},
    {key: "trait3", title: "",  style:"max-width:50px"}
    ];

var RaceMatchTable = [
    {key: "team", title:"組合", style:nameStyle},
    {key: "match", title:"親合", style:nameStyle}
];

var Options = {
  faction:"a"
};
var ABIDB;
var traitStatistics;
var raceMatchList;
var FOLLOWERDB = [];
var MATCHDB = {};
var followerTooltip = {};
var curMission;

function tabClickCallback(tab)
{
  var idx = parseInt(tab);

  var h = ((curMission.list[idx].type != 0) ? (genImg(TRAIT[curMission.list[idx].type]) + " + ") : "");
  for (var e in curMission.list[idx].threats)
    h += genImg(ABILITY[curMission.list[idx].threats[e]], {inList:true});
  $("#missionC").html(h);
  $("#missionC").append($("<span></span>").css("float", "right").text(curMission.list[idx].rewards));
  missionListC.createList(MATCHDB[curMission.type][idx]);
}

function menuClickCallback(menu)
{
  $.each(mainTabs, function () { $(this.selector).hide(); }); 
  $(mainTabs[menu].selector).show();
}

function fetchData(dataString)
{
  var result = ("" + dataString).split("\n");

  // Fetch Data
  if (result.length < 2) return;
  $("#coverMsg").show(); // Additional Show far before selectMission()
  MATCHDB = {};
  ABIDB.reset();
  traitStatistics = new AbiTraStat();
  raceMatchList = new RaceMatchList();
  followerTooltip = {};
  genFollowerList(result);
  genStatisticData();
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

var ilvOption = "required";
$(function() { 
  // $xxx = name
  // %xxx = trait
  $( document ).tooltip({
    track: true,
    content: function () 
    {
      var title = $(this).attr("title");
      var code = title.charAt(0);
      if (code == '%' && (title = title.slice(1)) in traitStatistics.statistic)
        return traitStatistics.get(title).tooltip;
      else if (code == '$' && (title = title.slice(1)) in followerTooltip)
        return followerTooltip[title];
      else
        return title;
    }  
  }); 
  
  $("#refresh").click(function(e){ loadFileFromStorageEntry(); });

  $("#choose_file").click(function(e) 
  {
    chrome.fileSystem.chooseEntry({type: 'openFile', 
                                   accepts: [{extensions: ["csv"]}],
                                   acceptsAllTypes: true }, function(theEntry) 
    {
      // No file selected
      if (chrome.runtime.lastError || !theEntry) 
        return;

      // use local storage to retain access to this file
      chrome.storage.local.set({'chosenFile': chrome.fileSystem.retainEntry(theEntry)});
      loadFileEntry(theEntry);
    });
  });

  $('#open').click(function()
  {
    $("#cover").show();
    $("#input").val("").focus();
  });

  $("#close").click(function() { $("#cover").hide();});

  $("#from_string").click(function()
  {
    $("#cover").hide();
    fetchData($("#input").val());
    $('#file_path').val("字串輸入");
  });

  $("#option").click(function() { $("#optionPanel").show(); });

  $("#optionPanel").mouseleave(function() { $("#optionPanel").hide(); });

  $("input[name=ilv]").change(function() 
  {
    ilvOption = $("input[name=ilv]:checked").val();
    MATCHDB = {};
    selectMission(curMission.type);
  });

  $("#leastButton").click(function() { $("#leastTeam").toggle();});
  $("#leastTeam").draggable({ containment: "parent" });
  $("#leastClose").click(function() { $("#leastTeam").hide();});
});

function selectMission(type)
{
  for (var i = 0; i < MISSIONS.length; ++i)
  {
    var m = MISSIONS[i];
    if (m.type == type)
    {
      curMission = m;
      $("#coverMsg").show();
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
        $("#coverMsg").hide();
      }, 10);

      return;
    }
  }
}
var body = document.getElementById("body-for-padding");

$("#missionType").change(function() { selectMission($("#missionType").val())});
$(document).ready(function() {
  if (launchData && launchData.items && launchData.items[0]) 
    loadFileEntry(launchData.items[0].entry);
  else 
    loadFileFromStorageEntry();

  // Init RACE_MATCH array
  $.each(RACE_SAMPLE_ID[Options.faction], function(trait, id) { RACE_MATCH[trait] = RACE[id][Options.faction].race; });

  //
  for (var i in MISSIONS)
    $("#missionType").append($('<option></option>').text(MISSIONS[i].type));
  curMission = MISSIONS[0]
  menuC.createTab(mainTabs);
  ABIDB = new AbiList();

  // Init statistic bar
  for (var i in ABILITY)
    $("#statistic").append(genStatisticIcon(ABILITY[i]));
  $.each([76, 77, 221, 79], function() { $("#statistic").append(genStatisticIcon(TRAIT[this]))});
  $("#statistic").append(genStatisticBarIcon(TRAIT[69].img, RACE_MATCH));
});

function genStatisticBarIcon(img, list)
{
  var bar = $("<div></div>").addClass("statisticBar");
  $.each(list, function(index) { bar.append(genStatisticIcon(TRAIT[index]))});
  var icon = $("<div></div>")
    .addClass("statisticBarIcon")
    .css("background-image", "url('img/" + img + ".jpg')")
    .append($("<span></span>").attr("id", "count"))
    .append(bar);
  icon.mouseenter(function () { $(this).find(".statisticBar").show(); });
  icon.mouseleave(function () { $(this).find(".statisticBar").hide(); });
  
  return icon;
}

function genStatisticIcon(obj)
{
  return $("<div></div>")
    .addClass("statisticIcon")
    .css("background-image", "url('img/" + obj.img + ".jpg')")
    .attr("title", "%" + obj.name);
}

// HTML Generation Functions
function genImg(obj, opt, jquery) 
{ 
  var img = $("<img>");
  img.attr("src", "img/" + obj.img + ".jpg");
  if (obj.name) img.attr("title", "%" + obj.name);
  if (typeof opt == "object")
  {
    if (opt.inList) img.css("margin", "0 2");
  }

  return ((jquery) ? img : img[0].outerHTML); 
}

function genText(text, opt, jquery)
{
  var t = $("<span>"+text+"</span>");
  if (typeof opt == "object")
  {
    if (opt.color) t.css("color", opt.color);
    if (opt.nowrap)
    {
      t.css("whiteSpace", "nowrap");
      t.css("overflow", "hidden");
    }
    if (opt.title) t.attr("title", opt.title);
  }

  return ((jquery) ? t : t[0].outerHTML);
}

function genFollowerName(f, specColor, jquery)
{
  return genText(f.name, {color:f.nameColor, nowrap:true, title:"$"+f.name}, jquery);
}

function genMacthTable_follower_abi_img(abi, countered)
{
  var abiImg = $("<div></div").addClass("follower abi");
  if (abi)
    abiImg.append($("<ins></ins>").css("background-image", "url('img/" + ABILITY[abi].img + ".jpg')").attr("title", "%" + ABILITY[abi].name));

  if (countered)
    abiImg.append($("<del></del>").addClass("follower countered").attr("title", "%"+ABILITY[abi].name));
        

  return abiImg[0].outerHTML;
}

function genFollower(f, qILV)
{
  var lowILV = f.iLevel < qILV;
  return followerName = $("<div></div").html(
      genFollowerName(f)
      + genText("("+f.iLevel+")", {color:((lowILV) ? "Brown" : ""), nowrap:true})
      + (f.active ? "" : "*"));
}

function genMacthTable_follower(f, qILV, matchedFlag)
{
  var follower = $("<div></div").addClass("follower");

  var followerAbis = $("<div></div").addClass("follower abis" + f.abilities.length);
  for(var i = 0; i < f.abilities.length; ++i)
    followerAbis.append(genMacthTable_follower_abi_img(f.abilities[i], matchedFlag & Math.pow(2,i)));
  

  follower.append(followerAbis);
  follower.append(genFollower(f, qILV).addClass("follower name"));

  return follower;
}

function genMatchTable(matchData)
{
  var fTable = $("<div></div").addClass("followers");
  for (var i = 0; i < matchData.team.length; ++i)
    fTable.append(genMacthTable_follower(matchData.team[i], matchData.qILV, matchData.matchedFlag[i]));

  return fTable[0].outerHTML;
}

function genTime(time, green)
{
  var h = parseInt(time / 60);
  var m = parseInt(time % 60);
  var timeStr = "";
  if (h > 0) timeStr += h + "小時";
  if (m > 0) timeStr += m + "分鐘";
  return genText(timeStr, {color:(green ? "Lime" : "")});
}

// Follower Sorting Functions
var sortFlag = 0;
var sortTitleIdx = -1;
function sortFDB (ele) 
{
  sortTitleIdx = -1;
  $(ele).parents("thead").find(".th-inner").each(function(i)
  {
    if ($(ele).text().match(followerListTable[i].title))
    {
      sortTitleIdx = i;
      sortFlag = (Math.abs(sortFlag) == (i + 1)) ? - sortFlag : (- (i + 1));
      $(ele).text(followerListTable[i].title + ((sortFlag > 0) ? "△" : "▽"));
      FOLLOWERDB.sort(function(a, b) { return sortFunc(a, b, sortFlag, followerListTable[i].sortSeq); });
    }
    else
      $(this).text(followerListTable[i].title);
  });

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
    var wrapper = $("<div></div>");
    wrapper.append($("<div></div>").css("display", "flex").css("font-size", "10pt")
        .append(genText(follower.name, {color:follower.nameColor}, true).css("flex", "1").css("margin-right", "5px"))
        .append(genText("(" + ((follower.level == 100) ? follower.iLevel : follower.level) + ")", 0, true))
        ).append($("<div></div>").css("display", "flex").css("margin-bottom", "5px")
          .css("font-size", "9pt").css("color", "#bbb")
        .append(genText(follower.specName, 0, true).css("flex", "1").css("margin-right", "5px"))
        .append(genText(follower.raceName, 0, true)));
    $.each(abi, function() { wrapper.append(genImg(ABILITY[this], {inList:true}, true).css("width", "16px"))});
    $.each(tra, function() { wrapper.append(genImg(TRAIT[this], {inList:true}, true).css("width", "16px"))});
    followerTooltip[follower.name] = wrapper.html();
  }
}

function genStatisticData()
{
  // Race bar
  $(".statisticBarIcon").find("#count").text("");
  $(".statisticIcon").each(function () 
  { 
    var title = this.title.slice(1);
    var count = traitStatistics.get(title).length;
    $(this).text(count || "");
    var ele = $(this).parents(".statisticBarIcon").find("#count");
    if (ele) ele.text(parseInt(ele.text() || 0) + count);
  });
  traitStatistics.genTooltip();
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

  var raceMatch = 0;
  var followerP = 0;
  var followers = matchInfo.team;
  for (var f = 0; f < followers.length; ++f)
  {
    // Follower Contribute
    var calILV = needILV;
    if (ilvOption == "current") calILV = followers[f].iLevel;
    if (ilvOption == "highest") calILV = 675;
    var olv = (calILV > needILV) ? 1 + Math.min(calILV - needILV, 15)/30 : 1;
    var llv = (calILV < needILV) ? 1 - Math.min(needILV - calILV, 30)/15 : 1;
    var abiMatch = parseInt((matchInfo.matchedFlag[f] + 1) / 2);
    followerP += 3 * abiMatch * llv + olv;
    // Normal Trait Match
    var personalNumDancer = 0;
    for (var t in followers[f].traits)
    {
      var trait = followers[f].traits[t];
      if (trait == quest.type) // Encounter Type Match
        traitMatchList.push(quest.type);
      else if (trait == 201) // Combat Experience
        traitMatchList.push(201);
      else if (trait == 221) // Epic Mount
        numEpicMount++;
      else if (trait == 76) // High Stamina
        numHighStamina++;
      else if (trait == 77) // Burst of Power
        numBurstPower++;
      else if (trait == 232 && matchInfo.unMatchList.indexOf(6) >= 0) // Dancer
        personalNumDancer++;
      else if (isRaceMatch(trait, numF, function(i) { return  followers[(f+i)%numF]; }))
      {
        raceMatch++;
        traitMatchList.push(trait);
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
  
  return (matchInfo.rate = (followerP + traitMatch + raceMatch * 0.5 + numDancer * 2) / base);
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

var only100 = true;
function doMatchMissionRec(idx, start, quest, threshold, match, tmpData)
{
  for (var me = start; me < FOLLOWERDB.length; ++me)
  {
    if (only100 && FOLLOWERDB[me].level < 100) continue;
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

// Object of AbiList
function AbiList()
{
  var that = this;
  var list = this.list = [];
  var abiLookup = {};

  for (var a1 = 1; a1 <= 10; a1 += (a1 == 4 ? 2 : 1))
  {
    for (var a2 = (a1==4?6:a1+1); a2 <= 10; a2 += (a2 == 4 ? 2 : 1))
    {
      var wrapper = $("<div></div>");
      var row = "";
      for (var i in SPEC)
        if ((SPEC[i].counters.indexOf(a1) >= 0) && (SPEC[i].counters.indexOf(a2) >= 0))
        {
          if (!row || row.children().length >= 7)
            wrapper.append(row = $("<div></div>").css("font-size", "20%"));

          row.append($("<div></div>").addClass("spec").attr("id",SPEC[i].name).text(SPEC[i].name));
        }
      list.push({abis:[a1,a2],abiComp:genImg(ABILITY[a1])+"+"+genImg(ABILITY[a2]),
        followers:"", possible:"", needByMissions:"",spec:wrapper.html()});
    }
  }
  // 10 + 10
  var tmpDiv = $("<div></div>").css("font-size", "20%");
  $.each([33, 34, 5, 7, 14], function () { tmpDiv.append($("<div></div>").addClass("spec")
        .attr("id",SPEC[this].name).text(SPEC[this].name)); });
  list.push({abis:[10,10],abiComp:genImg(ABILITY[10])+"+"+genImg(ABILITY[10]),
    followers:"", possible:"", needByMissions:"", spec: tmpDiv[0].outerHTML});
  
  $("#abilityListC").on("click", ".spec", function()
  {
    $("#abilityListC").find(".spec").css("color", "#ccc");
    $("#abilityListC").find("#"+$(this).text()).css("color", "red");
  })
  list.sort(function(a,b){return a.spec.length - b.spec.length;});
  $.each(list, function(index) { 
      abiLookup[this.abis[0] + "+" + this.abis[1]] = index; 
      });

  this.getInstance = function (abi)
  {
    if (abi.constructor != Array || abi.length < 2) return null;
    var abis = (abi[0] < abi[1]) ? abi: [abi[1], abi[0]];
    return list[abiLookup[abis[0] + "+" +abis[1]]];
  }
}

AbiList.prototype.addFollower = function(follower)
{
  function appenedFollower(item, key, follower)
  {
    if (item[key])
      item[key] += "<br>";
    item[key] += genFollowerName(follower) + (follower.active ? "" : "*");
  }

  if (follower.abilities.length == 2)
    appenedFollower(this.getInstance(follower.abilities), "followers", follower);
  else // ==1
  {
    var that = this;
    var abi1 = follower.abilities[0];
    $.each(SPEC[follower.spec].counters, function (idx, abi2) {
      if (abi1 != abi2 || (abi1 == 10 && SPEC[follower.spec].counters.length == 4)) 
        appenedFollower(that.getInstance([abi1, abi2]), "possible", follower);
    });
  }
}

AbiList.prototype.addNeededAbi = function (abis, type, mission)
{
  if (this.getInstance(abis))
  {
    var wrapper = $("<div></div>").html(this.getInstance(abis).needByMissions);
    var text = type + " - " + mission;
    var finded = false;
    wrapper.children().each(function() { 
        if ($(this).text() == text) finded = true; 
        });
    if (! finded)
      wrapper.append($("<div></div>").text(text));
    this.getInstance(abis).needByMissions = wrapper.html();
  }
}

AbiList.prototype.reset = function()
{
  for (var i in this.list)
    this.list[i].followers = this.list[i].possible = this.list[i].needByMissions = "";
}

// Object of Trait and Ability Statistic
function AbiTraStat()
{
  var that = this;
  this.raceList = {};
  this.statistic = {};
  $.each(ABILITY, function (key) { that.statistic[this.name] = []; that.statistic[this.name].abiID = key; });
  $.each(TRAIT, function (key) { that.statistic[this.name] = []; that.statistic[this.name].matchedRace = RACE_MATCH[key]; });
  $.each(RACE_MATCH, function() { that.raceList[this] = []; });

  this.get = function(id) { return this.statistic[id] };
}

AbiTraStat.prototype.addFollower = function (f)
{
  var that = this;
  $.each(f.abilities, function () { that.statistic[ABILITY[this].name].push(f); });
  $.each(f.traits, function () { that.statistic[TRAIT[this].name].push(f); });
  if (f.raceName in this.raceList)
    this.raceList[f.raceName].push(f);
}

AbiTraStat.prototype.genTooltip = function ()
{
  var that = this;
  var genList = function (f) 
  {
    var level = (f.level == 100) ? f.iLevel : " "+f.level+" ";
    return $("<div></div>")
      .css("font-size", "11pt")
      .append($("<span></span>")
          .css("color", f.nameColor)
          .css("padding-left", "10px")
          .text("["+level+"]"))
      .append($("<span></span>")
          .css("color", (f.active ? "" : "Tomato"))
          .text(" " + f.name + (f.active ? "" : " *")));
  };

  $.each(this.statistic, function (key) {
    var abiId = this.abiID;
    var wrapper = $("<div></div>");
    wrapper.append($("<div></div>").css("color", "gold").text(key));
    this.sort(function (a,b) { return sortFunc(a, b, -1, ["active", "level", "iLevel", "quality"]); });
    $.each(this, function () {
      var followerHtml = genList(this);
      if (abiId)
      {
        var abiIcons = $("<span></span>").css("float", "right");
        if (this.abilities.length == 2)
        {
          var abi2 = (this.abilities[0] == abiId) ? this.abilities[1]: this.abilities[0];
          abiIcons.append(genImg(ABILITY[abi2], {inList:true}, true).css("width", "16px"));          
        }          
        abiIcons.append(genImg(ABILITY[abiId], {inList:true}, true).css("width", "16px"));
        followerHtml.append(abiIcons);
      }
      wrapper.append(followerHtml);
    });

    if (this.matchedRace && that.raceList[this.matchedRace].length > 0)
    {
      wrapper.append($("<div></div>").css("color", "gold").text(that.raceList[this.matchedRace][0].raceName+":"));
      $.each(that.raceList[this.matchedRace], function() { wrapper.append(genList(this)); });
    }
    this.tooltip = wrapper.html();
  });
}

// Object of RaceMatchList
function RaceMatchList()
{
  var that = this;
  this.data = {raceMatch:{}, followerList:[]};
  $.each(RACE_MATCH, function(key) { that.data.raceMatch[key] = []; });
}

RaceMatchList.prototype.addFollower = function(f)
{
  var that = this;
  var followerInList = function(who, list)
  {
    for (var x in list)
      if (list[x].id == who.id)
        return true;
    return false;
  }

  var flag = {};
  $.each(f.traits, function(key, curTrait) 
  { 
    if (curTrait in RACE_MATCH && ! followerInList(f, that.data.raceMatch[curTrait]))
    {
      var t = [];
      $.each(f.traits, function(k, v) { if (v in RACE_MATCH) t[(v == curTrait)? "unshift":"push"](v); });
      var followerData = {
        id:f.id,
        count:0,
        name:genFollowerName(f),
        nameInactive:genFollowerName(f) + (f.active ? "" : "*"),
        raceName:f.raceName,
        trait1:genImg(TRAIT[t[0]]),
        trait2:((1 in t) ? genImg(TRAIT[t[1]]) : ""),
        trait3:((2 in t) ? genImg(TRAIT[t[2]]) : ""),
        traits:t
      };
      that.data.raceMatch[curTrait].push(followerData);

      if (!followerInList(f, that.data.followerList))
        that.data.followerList.push(followerData);
    }
  });
}

RaceMatchList.prototype.genCloseMatchTable = function()
{
  var teams = [];
  var followers = this.data.followerList;
  for (var a = 0; a < followers.length; ++a)
    for (var b = a+1; b < followers.length; ++b)
      for (var c = b+1; c < followers.length; ++c)
      {
        var tmpF = [followers[a], followers[b], followers[c]];
        var numF = tmpF.length;
        var raceMatched = {};
        var raceMatchedCount = 0;
        $.each(tmpF, function(k) 
        {
          var id = this.id;
          raceMatched[id] = [];
          $.each(this.traits, function(k2, trait)
          {
            if (isRaceMatch(trait, numF, function(i) { return tmpF[(k+i)%numF]; }))
            {
              raceMatched[id].push(trait);
              raceMatchedCount++;
            }
          });
        });
        if (raceMatchedCount > 4)
        {
          $.each(tmpF, function(){ this.count++; });
          teams.push({teamF:tmpF.slice(0), mask:[1,1,1], raceMatched:raceMatched, matchCount:raceMatchedCount});
        }
      }
  // sort match List
  $.each(teams, function(){ this.teamF.sort(function(a,b) { return  (a.count == b.count) ? b.idx - a.idx : b.count - a.count;}); });
  teams.sort(function(a,b) 
  {
    if (a.matchCount != b.matchCount)
      return b.matchCount - a.matchCount;
    else if (a.teamF[0].count != b.teamF[0].count)
      return b.teamF[0].count - a.teamF[0].count;
    else if (a.teamF[0].id != b.teamF[0].id)
      return b.teamF[0].id - a.teamF[0].id;
    else if (a.teamF[1].count != b.teamF[1].count)
      return b.teamF[1].count - a.teamF[1].count;
    else if (a.teamF[1].id != b.teamF[1].id)
      return b.teamF[1].id - a.teamF[1].id;
  });
  
  var cur = [];
  $.each(teams, function()
  {
    var raceMatched = this.raceMatched;
    var raceMatchedHtml = "";
    $.each(this.teamF, function ()
    {
      if (raceMatchedHtml != "")
        raceMatchedHtml += " | ";
      $.each(raceMatched[this.id], function(k, trait)
      {
        raceMatchedHtml += genImg(TRAIT[this], {inList:true});
      });
    });
    this.match = raceMatchedHtml;

    // calculate rowspan
    for (var i = 0; i < 2; ++i)
    {
      if (cur[i] && cur[i].teamF[i].id == this.teamF[i].id)
      {
        cur[i].mask[i] += 1;
        this.mask[i] = 0;
      }
      else
          cur[i] = this;
    }
  });

  var table = $("<table></table>").addClass("raceMatch");
  $.each(teams, function()
  {
    var mask = this.mask;
    var tr = $("<tr></tr>");
    $.each(this.teamF, function(idx)
    {
      var td = $("<td></td>").html(this.name + "(" + this.count + ")");
      if (mask[idx] > 1)
        td.attr("rowspan", mask[idx]);
      if (mask[idx] > 0)
        tr.append(td); 
    });
    tr.append($("<td></td>").html(this.match));
    table.append(tr);
  });
  return table;
}

RaceMatchList.prototype.genList = function()
{
  raceMatch = this.data.raceMatch;
  keysSorted = Object.keys(raceMatch).sort(function(a,b) { return raceMatch[b].length - raceMatch[a].length });
  var wrapper = $("<div></div>");
  $.each(keysSorted, function()
  {
    raceMatch[this].sort(function(a,b) { return b.traits.length - a.traits.length;  });
    var list = $("<div></div>").addClass("race-block");
    var table = $("<div></div>").addClass("list-container");
    new List(table, RaceMatchSubTable).createList(raceMatch[this]);
    list.append($("<div></div").text(TRAIT[this].name+" (" + raceMatch[this].length + ")"));
    list.append(table);
    wrapper.append(list);
  });
  $("#raceC").empty()
    .append(this.genCloseMatchTable())
    .append($("<hr>"))
    .append(wrapper);
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
254:{name:"賞鳥客", img:"inv_tabard_a_76arakkoaoutcast"},
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
29:{name:"快速上手", img:"ability_mage_studentofthemind"},
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
47:{name:"頂尖刺客", img:"ability_rogue_deadliness"},
253:{name:"機械狂", img:"achievement_boss_xt002deconstructor_01"},
248:{name:"導師", img:"trade_archaeology_draenei_tome"},
52:{name:"採礦", img:"trade_mining"},
7:{name:"登山客", img:"achievement_zone_thousandneedles_01"},
44:{name:"自然學家", img:"achievement_zone_silverpine_01"},
252:{name:"巨魔好夥伴", img:"achievement_boss_highmaul_king"},
38:{name:"巨魔殺手", img:"achievement_reputation_ogre"},
4:{name:"獸人殺手", img:"achievement_boss_general_nazgrim"},
49:{name:"曠野奔馳者", img:"achievement_zone_arathihighlands_01"},
39:{name:"源生者殺手", img:"achievement_boss_yoggsaron_01"},
79:{name:"拾荒者", img:"achievement_guildperk_bountifulbags"},
62:{name:"剝皮", img:"inv_misc_pelt_wolf_01"},
250:{name:"Speed of Light", img:"ability_priest_angelicfeather"},
61:{name:"裁縫", img:"trade_tailoring"},
43:{name:"鳥爪殺手", img:"inv_ravenlordpet"},
72:{name:"圖騰師", img:"achievement_character_tauren_male"},
256:{name:"寶藏獵人", img:"ability_racial_packhobgoblin"},
42:{name:"虛空殺手", img:"achievement_boss_zuramat"},
73:{name:"巫毒狂熱者", img:"achievement_character_troll_male"},
9:{name:"荒地居民", img:"achievement_zone_tanaris_01"},
255:{name:"與獸同行", img:"inv_misc_head_tiger_01"}
};
var RACE = {
225:{a:{name:"阿克諾爾‧鋼鐵使者", race:"獸人"}, h:{name:"阿克諾爾‧鋼鐵使者", race:"獸人"}},
177:{a:{name:"克羅曼", race:"人類"}, h:{name:"克羅曼", race:"人類"}},
178:{a:{name:"李洛伊‧詹金斯", race:"人類"}, h:{name:"李洛伊‧詹金斯", race:"人類"}},
203:{a:{name:"肉糰", race:"豺狼人"}, h:{name:"肉糰", race:"豺狼人"}},
455:{a:{name:"米歐浩斯‧曼納斯頓", race:"地精"}, h:{name:"米歐浩斯‧曼納斯頓", race:"地精"}},
406:{a:{name:"埃里克‧馬修斯", race:"狼人"}, h:{name:"奇里斯‧札博斯基", race:"哥布林"}},
382:{a:{name:"艾爾莎‧雷歌", race:"矮人"}, h:{name:"烏恩卡菈‧風研者", race:"獸人"}},
351:{a:{name:"亞拉斯岱‧白峰", race:"矮人"}, h:{name:"塔克莫亞", race:"食人妖"}},
285:{a:{name:"安奈麗", race:"德萊尼"}, h:{name:"露梅妲‧血漬", race:"獸人"}},
363:{a:{name:"安東‧蘇拉", race:"人類"}, h:{name:"歐里爾‧銳緣", race:"獸人"}},
237:{a:{name:"艾芮碧雅‧冬喚", race:"夜精靈"}, h:{name:"托爾娃‧霜心", race:"獸人"}},
429:{a:{name:"奧德菈‧石盾", race:"矮人"}, h:{name:"刃織者璇恩", race:"熊貓人"}},
280:{a:{name:"貝絲蒂娜‧莫朗", race:"狼人"}, h:{name:"蔻格艾‧瞄準", race:"哥布林"}},
279:{a:{name:"布倫‧速擊", race:"矮人"}, h:{name:"朗基羅", race:"食人妖"}},
417:{a:{name:"布莉姬特‧希克斯", race:"人類"}, h:{name:"茉蒂娜", race:"獸人"}},
364:{a:{name:"凱爾娃娜‧暮行者", race:"夜精靈"}, h:{name:"珂薇菈‧血緣", race:"獸人"}},
400:{a:{name:"卡雷柏‧韋伯", race:"人類"}, h:{name:"諾格魯克‧朽顱", race:"獸人"}},
345:{a:{name:"席雅菈‧尼爾", race:"人類"}, h:{name:"亞芮安妮‧布萊克", race:"不死族"}},
459:{a:{name:"教士馬魯夫", race:"德萊尼"}, h:{name:"卡格‧血怒", race:"獸人"}},
394:{a:{name:"柯納爾‧詠雨者", race:"矮人"}, h:{name:"隆加爾", race:"獸人"}},
297:{a:{name:"丹妮莉絲‧珀星", race:"夜精靈"}, h:{name:"佩樂佐", race:"食人妖"}},
462:{a:{name:"曦尋者盧卡瑞斯", race:"阿拉卡"}, h:{name:"曦尋者盧卡瑞斯", race:"阿拉卡"}},
207:{a:{name:"防衛者伊蘿娜", race:"德萊尼"}, h:{name:"愛伊達‧明曦", race:"血精靈"}},
333:{a:{name:"黛爾瑪‧鐵穩", race:"矮人"}, h:{name:"法菈", race:"牛頭人"}},
216:{a:{name:"德爾瓦‧鐵拳", race:"矮人"}, h:{name:"薇薇安妮", race:"不死族"}},
387:{a:{name:"艾芭‧暴風拳", race:"矮人"}, h:{name:"蘇茲", race:"哥布林"}},
250:{a:{name:"埃靈頓‧月心", race:"狼人"}, h:{name:"塔瑪‧天蹄", race:"牛頭人"}},
424:{a:{name:"優娜‧楊格", race:"狼人"}, h:{name:"莉薩‧布萊洛奇", race:"哥布林"}},
357:{a:{name:"法薩妮", race:"夜精靈"}, h:{name:"可妮茲‧索洛", race:"哥布林"}},
298:{a:{name:"芬恩‧燼爪", race:"熊貓人"}, h:{name:"辛格‧火擊", race:"哥布林"}},
231:{a:{name:"菲爾莫‧派崔克", race:"人類"}, h:{name:"歐林‧厲刃", race:"血精靈"}},
388:{a:{name:"芬格爾‧焰錘", race:"矮人"}, h:{name:"洛南", race:"牛頭人"}},
327:{a:{name:"哈吉歐斯", race:"德萊尼"}, h:{name:"奧莉爾‧光歌", race:"血精靈"}},
430:{a:{name:"霍斯泰茲‧鴉木", race:"夜精靈"}, h:{name:"卡恩‧鋼蹄", race:"牛頭人"}},
334:{a:{name:"赫瑞瓦德‧石斬", race:"矮人"}, h:{name:"塔瓦", race:"牛頭人"}},
346:{a:{name:"赫拉索斯‧星杖", race:"夜精靈"}, h:{name:"阿哈薩", race:"食人妖"}},
255:{a:{name:"赫絲蒂亞‧鴉木", race:"夜精靈"}, h:{name:"贊奇里", race:"食人妖"}},
274:{a:{name:"伊蓮娜‧爪握", race:"夜精靈"}, h:{name:"庫瓦胡‧馴魔者", race:"牛頭人"}},
412:{a:{name:"伊莎貝拉‧琴恩", race:"人類"}, h:{name:"娜蒂亞‧暗日", race:"血精靈"}},
370:{a:{name:"傑菲特‧夜嗥", race:"狼人"}, h:{name:"斯卡利茲‧裂顱", race:"哥布林"}},
260:{a:{name:"奇蘭卓斯‧風心", race:"夜精靈"}, h:{name:"守護者阿托希", race:"牛頭人"}},
376:{a:{name:"琪姆芭‧疾械", race:"地精"}, h:{name:"艾拉‧厲刃", race:"血精靈"}},
273:{a:{name:"李‧歐勒斯基", race:"人類"}, h:{name:"卡爾珈‧迅擊", race:"獸人"}},
286:{a:{name:"萊納德‧施里克", race:"人類"}, h:{name:"卡馬‧箭泉", race:"牛頭人"}},
219:{a:{name:"雷歐拉杰", race:"劍齒人"}, h:{name:"雷歐拉杰", race:"劍齒人"}},
352:{a:{name:"琳達‧梅爾", race:"狼人"}, h:{name:"普莉希菈‧影日", race:"不死族"}},
244:{a:{name:"莉琳雅‧晨歌", race:"夜精靈"}, h:{name:"卡莎‧荒蹄", race:"牛頭人"}},
375:{a:{name:"洛坎‧燧緣", race:"矮人"}, h:{name:"特馬努", race:"食人妖"}},
238:{a:{name:"魯坎‧奇爾柏恩", race:"狼人"}, h:{name:"丹尼佐‧雹擊", race:"哥布林"}},
445:{a:{name:"藤擺大師", race:"熊貓人"}, h:{name:"法芙菈‧熊皮", race:"獸人"}},
399:{a:{name:"米雅‧琳妮", race:"人類"}, h:{name:"愛爾佳‧破魔", race:"獸人"}},
439:{a:{name:"米娜‧庫妮絲", race:"人類"}, h:{name:"玉恩‧虎噬", race:"獸人"}},
405:{a:{name:"蜜希‧巴伯", race:"矮人"}, h:{name:"蒂娜‧魔語者", race:"哥布林"}},
292:{a:{name:"彌珊德拉‧迅弧", race:"夜精靈"}, h:{name:"克菈格茲", race:"獸人"}},
202:{a:{name:"納特‧帕格", race:"人類"}, h:{name:"納特‧帕格", race:"人類"}},
393:{a:{name:"『淨化者』娜薇亞", race:"德萊尼"}, h:{name:"烏托娜‧狼眼", race:"獸人"}},
340:{a:{name:"妮薇‧斧擊", race:"矮人"}, h:{name:"涵妮雅", race:"牛頭人"}},
303:{a:{name:"尼爾‧霜原", race:"矮人"}, h:{name:"加基茲‧咆擊", race:"哥布林"}},
328:{a:{name:"諾亞‧孟克", race:"人類"}, h:{name:"薩哈勒", race:"牛頭人"}},
440:{a:{name:"歐林迪斯‧飲雨者", race:"夜精靈"}, h:{name:"澤恩‧麥擊", race:"熊貓人"}},
267:{a:{name:"佩米莉亞", race:"狼人"}, h:{name:"珈卡菈", race:"食人妖"}},
194:{a:{name:"『萬年青』菲拉爾克", race:"波塔尼"}, h:{name:"『萬年青』菲拉爾克", race:"波塔尼"}},
460:{a:{name:"魔擊教授", race:"哥布林"}, h:{name:"魔擊教授", race:"哥布林"}},
232:{a:{name:"蕾雯‧哀刃", race:"夜精靈"}, h:{name:"琪爾佳‧晨歌", race:"牛頭人"}},
411:{a:{name:"雷尼‧旗浸", race:"地精"}, h:{name:"莫伊提", race:"食人妖"}},
304:{a:{name:"蕾娜‧晨寒", race:"夜精靈"}, h:{name:"泰菈‧裂裔", race:"血精靈"}},
358:{a:{name:"蘿琳‧河影", race:"夜精靈"}, h:{name:"涵蒂‧奪蔭者", race:"血精靈"}},
452:{a:{name:"絲芙琳‧火突", race:"地精"}, h:{name:"卡納汀", race:"食人妖"}},
381:{a:{name:"風詠者泰洛斯", race:"德萊尼"}, h:{name:"夏帕", race:"牛頭人"}},
249:{a:{name:"席薇蘭汀‧紫杉影", race:"夜精靈"}, h:{name:"瑪托克勞", race:"牛頭人"}},
224:{a:{name:"爪衛庫瑞克", race:"鴉人"}, h:{name:"爪衛庫瑞克", race:"鴉人"}},
218:{a:{name:"魔爪祭司艾夏歐", race:"鴉人"}, h:{name:"魔爪祭司艾夏歐", race:"鴉人"}},
423:{a:{name:"泰爾馬齊‧風警", race:"夜精靈"}, h:{name:"勒斯特‧怒碎", race:"獸人"}},
291:{a:{name:"泰莎‧溫博芙", race:"人類"}, h:{name:"秘法師祖克羅格", race:"獸人"}},
266:{a:{name:"薩爾科斯‧雷歌", race:"夜精靈"}, h:{name:"艾耶", race:"牛頭人"}},
446:{a:{name:"瑟曼‧貝爾瓦", race:"人類"}, h:{name:"托加", race:"牛頭人"}},
193:{a:{name:"托爾瑪克", race:"巨魔"}, h:{name:"托爾瑪克", race:"巨魔"}},
451:{a:{name:"泰莉‧斬泉", race:"地精"}, h:{name:"努安‧天夢", race:"熊貓人"}},
243:{a:{name:"烏爾坦‧黑谷", race:"矮人"}, h:{name:"羅諾泰", race:"食人妖"}},
261:{a:{name:"烏爾席菈‧哈德森", race:"狼人"}, h:{name:"霍梅珈", race:"食人妖"}},
256:{a:{name:"韋洛克‧綠心", race:"狼人"}, h:{name:"贊提奇", race:"食人妖"}},
458:{a:{name:"復仇者荷露恩", race:"德萊尼"}, h:{name:"咯骨", race:"獸人"}},
339:{a:{name:"『賜福者』沃拉修斯", race:"德萊尼"}, h:{name:"亞戈尼斯‧日心", race:"血精靈"}},
418:{a:{name:"尤馬尼斯‧橡握", race:"夜精靈"}, h:{name:"馬斯卡", race:"牛頭人"}},
369:{a:{name:"澤莉娜‧碎月", race:"夜精靈"}, h:{name:"品琪‧利佐", race:"哥布林"}},
342:{a:{name:"『博士』史懷哲", race:"人類"}, h:{name:"『博士』史懷哲", race:"人類"}},
209:{a:{name:"阿布加爾", race:"食人妖"}, h:{name:"阿布加爾", race:"食人妖"}},
227:{a:{name:"艾達蕾德‧凱恩", race:"人類"}, h:{name:"萊珂‧靜息", race:"獸人"}},
204:{a:{name:"泰勒上將", race:"人類"}, h:{name:"班傑明‧吉布", race:"不死族"}},
208:{a:{name:"阿哈姆", race:"德萊尼"}, h:{name:"阿哈姆", race:"德萊尼"}},
91:{a:{name:"艾蕾莎‧德娜拉", race:"德萊尼"}, h:{name:"格林菲爾‧霜指", race:"不死族"}},
395:{a:{name:"艾米‧錢柏", race:"人類"}, h:{name:"梅姬翠絲‧魂刃", race:"血精靈"}},
184:{a:{name:"見習工藝師安德倫", race:"德萊尼"}, h:{name:"『尊榮者』卡爾戈", race:"獸人"}},
92:{a:{name:"艾拉絲佩茲", race:"人類"}, h:{name:"秀卡", race:"獸人"}},
341:{a:{name:"亞奇伯德‧亞里森", race:"人類"}, h:{name:"羅賓‧菲德里克森", race:"不死族"}},
347:{a:{name:"阿克提克‧懷特邁斯", race:"人類"}, h:{name:"菲德菈‧哈特邦德", race:"不死族"}},
179:{a:{name:"工藝師羅穆爾", race:"德萊尼"}, h:{name:"武器鍛造師奈許菈", race:"獸人"}},
87:{a:{name:"艾絲倫‧斯沃布雷克", race:"人類"}, h:{name:"珈茲菈", race:"獸人"}},
287:{a:{name:"蓓琪‧道森", race:"人類"}, h:{name:"茱珂‧亡禦", race:"獸人"}},
390:{a:{name:"貝洛朗", race:"德萊尼"}, h:{name:"拉卡哈", race:"食人妖"}},
107:{a:{name:"貝茉拉", race:"德萊尼"}, h:{name:"瑟蕾莉亞‧喚曦", race:"血精靈"}},
326:{a:{name:"伯恩納德‧落錘", race:"矮人"}, h:{name:"斯卡", race:"牛頭人"}},
235:{a:{name:"苦行者琵克蕾", race:"德萊尼"}, h:{name:"希爾薇‧墮歌", race:"血精靈"}},
288:{a:{name:"血薔薇", race:"地精"}, h:{name:"諾薇‧哈里森", race:"不死族"}},
189:{a:{name:"布魯克", race:"歐格隆"}, h:{name:"布魯克", race:"歐格隆"}},
230:{a:{name:"波德林‧布拉德霍", race:"狼人"}, h:{name:"穆克拉爾‧黑脈", race:"獸人"}},
447:{a:{name:"布洛甘‧三品脫", race:"矮人"}, h:{name:"查爾斯‧諾里司", race:"不死族"}},
444:{a:{name:"波希兄弟", race:"地精"}, h:{name:"沃爾莫圖", race:"食人妖"}},
371:{a:{name:"貝露菈‧酒桶", race:"矮人"}, h:{name:"艾菈‧德萊弗", race:"不死族"}},
153:{a:{name:"貝露瑪‧迅石", race:"矮人"}, h:{name:"卡菈", race:"獸人"}},
254:{a:{name:"布萊恩‧史諾", race:"狼人"}, h:{name:"贊塔奇", race:"食人妖"}},
365:{a:{name:"伯菲‧黑心", race:"地精"}, h:{name:"倫卓爾‧血擊", race:"獸人"}},
295:{a:{name:"『淬煉者』熙蘭妮亞", race:"血精靈"}, h:{name:"朵恩‧莫庫瑞斯", race:"血精靈"}},
408:{a:{name:"凱莉絲‧魔行者", race:"狼人"}, h:{name:"娜塔莉‧斯巴克斯", race:"不死族"}},
271:{a:{name:"凱瑟琳‧瑪格路德", race:"矮人"}, h:{name:"艾碧珈爾‧威爾森", race:"不死族"}},
262:{a:{name:"瑟拉蒂娜", race:"夜精靈"}, h:{name:"卡蒂‧草蹄", race:"牛頭人"}},
401:{a:{name:"希納德‧暗峰", race:"矮人"}, h:{name:"洛克里格‧魔奴", race:"獸人"}},
360:{a:{name:"『狐狸』克萊兒", race:"狼人"}, h:{name:"艾麗雅‧日血", race:"血精靈"}},
434:{a:{name:"聰明的艾須歐", race:"錦魚人"}, h:{name:"聰明的艾須歐", race:"錦魚人"}},
385:{a:{name:"寇姆‧破風", race:"矮人"}, h:{name:"葛瑞敏", race:"食人妖"}},
368:{a:{name:"珂蕾妮‧寇德威", race:"人類"}, h:{name:"薇娃莉亞‧日匕", race:"血精靈"}},
377:{a:{name:"達戈‧石環", race:"矮人"}, h:{name:"莫格拉", race:"獸人"}},
32:{a:{name:"達戈", race:"巨魔"}, h:{name:"達戈", race:"巨魔"}},
463:{a:{name:"達莉菈‧月牙", race:"夜精靈"}, h:{name:"烏娜‧崔許爾", race:"不死族"}},
276:{a:{name:"達娜‧克羅科特", race:"人類"}, h:{name:"茉庫珈", race:"食人妖"}},
413:{a:{name:"丹尼爾‧蒙托伊", race:"人類"}, h:{name:"歐羅格", race:"獸人"}},
258:{a:{name:"達文‧凱斯勒", race:"狼人"}, h:{name:"索羅‧白蹄", race:"牛頭人"}},
265:{a:{name:"德克蘭‧史傳吉", race:"狼人"}, h:{name:"蘇提拉", race:"食人妖"}},
96:{a:{name:"德拉雷斯‧月影", race:"夜精靈"}, h:{name:"蘇爾亞卡", race:"食人妖"}},
427:{a:{name:"黛西‧碎軸", race:"地精"}, h:{name:"卡努亞瑪", race:"牛頭人"}},
431:{a:{name:"迪本‧鐵擊", race:"矮人"}, h:{name:"洛克塔", race:"獸人"}},
350:{a:{name:"多克‧輕鉗", race:"地精"}, h:{name:"亞洛", race:"牛頭人"}},
301:{a:{name:"多納爾‧冰壁", race:"矮人"}, h:{name:"妮庫特", race:"食人妖"}},
379:{a:{name:"朵德菈‧落石", race:"矮人"}, h:{name:"琪悠", race:"熊貓人"}},
354:{a:{name:"德雷肯‧夜矛", race:"夜精靈"}, h:{name:"考德爾‧葛雷", race:"不死族"}},
115:{a:{name:"德蘭努爾‧滅眉", race:"矮人"}, h:{name:"愛拉琪妮‧覓血者", race:"血精靈"}},
441:{a:{name:"伊蒂絲‧分壺", race:"矮人"}, h:{name:"伊絲卡", race:"牛頭人"}},
410:{a:{name:"艾德蒙‧達斯倫德", race:"狼人"}, h:{name:"約翰‧格里爾", race:"不死族"}},
398:{a:{name:"艾里‧坎農", race:"人類"}, h:{name:"克瑞隆‧日飢", race:"血精靈"}},
323:{a:{name:"艾娃‧石堂", race:"矮人"}, h:{name:"蕾拉", race:"牛頭人"}},
277:{a:{name:"艾洛翰", race:"德萊尼"}, h:{name:"埃辛‧日巡者", race:"血精靈"}},
289:{a:{name:"埃斯蒙‧亮盾", race:"矮人"}, h:{name:"赫施爾‧威爾士", race:"不死族"}},
450:{a:{name:"伊凡菈‧雲頌", race:"夜精靈"}, h:{name:"露西‧凱勒", race:"不死族"}},
335:{a:{name:"菲兒", race:"德萊尼"}, h:{name:"貝珊德蘭‧碎怒", race:"血精靈"}},
426:{a:{name:"法戈‧燧鎖", race:"矮人"}, h:{name:"布拉克‧碎盾", race:"獸人"}},
384:{a:{name:"芬恩‧綠足", race:"矮人"}, h:{name:"葉帕", race:"牛頭人"}},
93:{a:{name:"芬克‧快針", race:"地精"}, h:{name:"潔菈薩", race:"食人妖"}},
180:{a:{name:"菲歐娜", race:"狼人"}, h:{name:"暗影獵手雷拉", race:"食人妖"}},
89:{a:{name:"弗勒加", race:"矮人"}, h:{name:"彌菈‧斬擊", race:"哥布林"}},
436:{a:{name:"佛手‧擊拳", race:"熊貓人"}, h:{name:"佛手‧擊拳", race:"熊貓人"}},
299:{a:{name:"燃霜者哈娜", race:"德萊尼"}, h:{name:"博學者寒息", race:"血精靈"}},
270:{a:{name:"蓋布瑞‧拜彼", race:"狼人"}, h:{name:"納桑尼爾‧降獸者", race:"不死族"}},
330:{a:{name:"賈拉德蘭‧加斯", race:"人類"}, h:{name:"撒拉納‧晨日", race:"血精靈"}},
383:{a:{name:"風擊者海蘭奈", race:"德萊尼"}, h:{name:"法潔菈", race:"食人妖"}},
397:{a:{name:"蓋文‧苦石", race:"矮人"}, h:{name:"傑拉德‧魯姆", race:"不死族"}},
88:{a:{name:"金雯‧磨織", race:"地精"}, h:{name:"拉茲雷克", race:"獸人"}},
211:{a:{name:"葛里林", race:"矮人"}, h:{name:"佩妮‧捶底", race:"哥布林"}},
170:{a:{name:"『剝皮者』金毛", race:"劍齒人"}, h:{name:"『剝皮者』金毛", race:"劍齒人"}},
245:{a:{name:"格蘭迪爾‧野歌", race:"夜精靈"}, h:{name:"戈恩", race:"牛頭人"}},
113:{a:{name:"格魯姆‧野豬剋星", race:"矮人"}, h:{name:"比佐‧火槍", race:"哥布林"}},
110:{a:{name:"葛雯諾琳‧風握", race:"矮人"}, h:{name:"里傑‧風暴之蹄", race:"牛頭人"}},
449:{a:{name:"歌妮蘭‧雨光", race:"夜精靈"}, h:{name:"雪兒姐妹", race:"熊貓人"}},
119:{a:{name:"皓咪", race:"熊貓人"}, h:{name:"皓咪", race:"熊貓人"}},
294:{a:{name:"哈利‧羅森", race:"狼人"}, h:{name:"提格瓦", race:"食人妖"}},
403:{a:{name:"赫絲特‧黑燼", race:"矮人"}, h:{name:"雪莉", race:"血精靈"}},
236:{a:{name:"希爾妲‧獄錘", race:"矮人"}, h:{name:"緹帕‧霜角", race:"牛頭人"}},
343:{a:{name:"荷諾菈‧鑰石", race:"矮人"}, h:{name:"艾諾菈", race:"牛頭人"}},
453:{a:{name:"荷爾達‧影刃", race:"矮人"}, h:{name:"黑暗遊俠薇蘿娜拉", race:"不死族"}},
402:{a:{name:"韓伯特‧黑叢", race:"地精"}, h:{name:"奇爾威", race:"食人妖"}},
263:{a:{name:"伊蘭妮爾‧松木", race:"夜精靈"}, h:{name:"贊緹珈", race:"食人妖"}},
331:{a:{name:"伊露米娜", race:"德萊尼"}, h:{name:"莫西昂‧落日", race:"血精靈"}},
248:{a:{name:"伊絲佩茨‧霍蘭德", race:"狼人"}, h:{name:"妮珈拉", race:"食人妖"}},
190:{a:{name:"大法師瓦戈斯的影像", race:"人類"}, h:{name:"大法師瓦戈斯的影像", race:"人類"}},
97:{a:{name:"茵默‧鐵心", race:"矮人"}, h:{name:"海莉‧哈洛森", race:"不死族"}},
355:{a:{name:"英格麗‧暗褶", race:"矮人"}, h:{name:"瑪菈菈", race:"食人妖"}},
419:{a:{name:"茵妮絲‧裂盾", race:"矮人"}, h:{name:"艾莉森‧卡拉", race:"不死族"}},
396:{a:{name:"伊雯‧佩琪", race:"人類"}, h:{name:"奈絲菈札‧滅裂", race:"獸人"}},
374:{a:{name:"傑瑟爾‧暗篷", race:"夜精靈"}, h:{name:"澤拉茲洛", race:"食人妖"}},
105:{a:{name:"尤坎姆‧德蒙斯班", race:"人類"}, h:{name:"贊斯‧銀怒", race:"血精靈"}},
359:{a:{name:"喬絲婷‧德格露特", race:"人類"}, h:{name:"格蕾娃‧赤刀", race:"獸人"}},
253:{a:{name:"卡格‧薩茲克", race:"夜精靈"}, h:{name:"塔帕‧迅掌", race:"牛頭人"}},
386:{a:{name:"凱爾‧地語", race:"熊貓人"}, h:{name:"凱爾瑞寇", race:"獸人"}},
416:{a:{name:"卡蘭德菈‧星盔", race:"夜精靈"}, h:{name:"安妮絲‧爭鏈", race:"哥布林"}},
432:{a:{name:"康恩‧藤杖", race:"熊貓人"}, h:{name:"康恩‧藤杖", race:"熊貓人"}},
112:{a:{name:"凱芮爾‧語風", race:"夜精靈"}, h:{name:"蔚拉‧卡麗蘭", race:"血精靈"}},
414:{a:{name:"卡倫‧惠特莫", race:"狼人"}, h:{name:"歐瑞里昂‧灼擊", race:"血精靈"}},
284:{a:{name:"卡絲蕊娜‧冬幽", race:"夜精靈"}, h:{name:"珊曼莎‧索頓", race:"不死族"}},
407:{a:{name:"凱特‧米寇茨", race:"地精"}, h:{name:"西蒙妮‧巴洛伊", race:"不死族"}},
392:{a:{name:"吉瑪", race:"德萊尼"}, h:{name:"蕊娜‧水祭", race:"哥布林"}},
448:{a:{name:"肯‧肯", race:"猴人"}, h:{name:"肯‧肯", race:"猴人"}},
283:{a:{name:"坎妲爾‧柯文頓", race:"人類"}, h:{name:"米雪兒‧晨歌", race:"血精靈"}},
247:{a:{name:"琪菈", race:"夜精靈"}, h:{name:"", race:""}},
361:{a:{name:"奇藍崔克‧鷹擊", race:"夜精靈"}, h:{name:"瓦爾凱索斯‧悲曦", race:"血精靈"}},
192:{a:{name:"金茲‧急嘯", race:"哥布林"}, h:{name:"金茲‧急嘯", race:"哥布林"}},
348:{a:{name:"琪恩蒂‧亮槽", race:"地精"}, h:{name:"『不潔者』璐西亞", race:"血精靈"}},
421:{a:{name:"『無情的』克魯德", race:"德萊尼"}, h:{name:"萊納瑞斯‧日狂", race:"血精靈"}},
442:{a:{name:"琪塔菈‧梅伊", race:"地精"}, h:{name:"蒂札蕾", race:"食人妖"}},
269:{a:{name:"克里斯‧雷伊", race:"人類"}, h:{name:"歐格里茲‧鉤喉", race:"獸人"}},
373:{a:{name:"克里斯提安‧奈恩", race:"人類"}, h:{name:"亨利‧沃爾", race:"不死族"}},
102:{a:{name:"拉蒙塔格‧弗德", race:"人類"}, h:{name:"拉蒙塔格‧弗德", race:"不死族"}},
157:{a:{name:"『劍刃』蘭崔索", race:"獸人"}, h:{name:"『劍刃』蘭崔索", race:"獸人"}},
422:{a:{name:"萊瑞‧柯普蘭", race:"人類"}, h:{name:"賈赫", race:"牛頭人"}},
391:{a:{name:"麗娜", race:"德萊尼"}, h:{name:"茉克希‧霧契", race:"哥布林"}},
356:{a:{name:"麗娜‧廣特", race:"狼人"}, h:{name:"哈爾莉‧侍女", race:"血精靈"}},
118:{a:{name:"任書", race:"熊貓人"}, h:{name:"任書", race:"熊貓人"}},
332:{a:{name:"輕盾兵碧翠絲", race:"德萊尼"}, h:{name:"娜娜", race:"牛頭人"}},
437:{a:{name:"林‧嫩爪", race:"熊貓人"}, h:{name:"林‧嫩爪", race:"熊貓人"}},
338:{a:{name:"蘿拉妮雅", race:"德萊尼"}, h:{name:"蘭維洛斯‧怒印", race:"血精靈"}},
362:{a:{name:"羅平", race:"地精"}, h:{name:"勞倫斯‧夏普", race:"不死族"}},
106:{a:{name:"露西亞‧奈特班", race:"人類"}, h:{name:"艾緹米希雅‧蒼凝", race:"血精靈"}},
103:{a:{name:"露葵莎‧埃斯沃茲", race:"人類"}, h:{name:"雪德‧疫心", race:"不死族"}},
272:{a:{name:"琳莉絲‧羽足", race:"夜精靈"}, h:{name:"可悠‧野心", race:"熊貓人"}},
438:{a:{name:"梅芙‧躍浴", race:"矮人"}, h:{name:"萊菈‧佩爾森", race:"不死族"}},
154:{a:{name:"博學者塞瑞娜", race:"高等精靈"}, h:{name:"博學者克雷拉斯", race:"高等精靈"}},
239:{a:{name:"『受詛咒的』瑪凱莉雅", race:"德萊尼"}, h:{name:"『墓行者』姬兒", race:"熊貓人"}},
329:{a:{name:"莫登", race:"人類"}, h:{name:"凱伊爾", race:"牛頭人"}},
372:{a:{name:"瑪歌‧鋼指", race:"矮人"}, h:{name:"薇菈‧海琳", race:"不死族"}},
114:{a:{name:"馬爾昆", race:"德萊尼"}, h:{name:"巴倫‧亡擊", race:"不死族"}},
302:{a:{name:"馬修‧戴靈", race:"人類"}, h:{name:"馬里斯‧日碎", race:"血精靈"}},
94:{a:{name:"馬修‧稚愛", race:"人類"}, h:{name:"馬修‧稚愛", race:"不死族"}},
233:{a:{name:"摩爾‧深械", race:"地精"}, h:{name:"泰加‧霜蹄", race:"牛頭人"}},
155:{a:{name:"米歐", race:"德萊尼"}, h:{name:"摩克斯‧刃嚎", race:"獸人"}},
443:{a:{name:"『更新者』莫拉薩", race:"德萊尼"}, h:{name:"維蘭卓斯‧日祝", race:"血精靈"}},
228:{a:{name:"米娜‧哈肯", race:"狼人"}, h:{name:"海茲爾‧裂脈", race:"哥布林"}},
117:{a:{name:"莫朗‧利區班", race:"人類"}, h:{name:"茉蒂希亞‧克羅雷", race:"不死族"}},
415:{a:{name:"南絲‧雙刃", race:"矮人"}, h:{name:"奧莉薇亞‧羅根", race:"不死族"}},
409:{a:{name:"奈維爾‧暗行", race:"狼人"}, h:{name:"沃札庫", race:"食人妖"}},
337:{a:{name:"尼可拉斯‧迪維德", race:"人類"}, h:{name:"塔里爾‧英圖馬崔", race:"血精靈"}},
95:{a:{name:"妮希爾‧泰亞拉雷", race:"夜精靈"}, h:{name:"獨眼卡波露", race:"哥布林"}},
290:{a:{name:"諾德林‧銀光", race:"夜精靈"}, h:{name:"博學者圖安", race:"熊貓人"}},
275:{a:{name:"諾琳‧實燧", race:"矮人"}, h:{name:"菲妮", race:"牛頭人"}},
349:{a:{name:"諾希雅‧亞托", race:"德萊尼"}, h:{name:"祖歐兄弟", race:"熊貓人"}},
109:{a:{name:"努丹", race:"德萊尼"}, h:{name:"葛拉格‧地舌", race:"獸人"}},
98:{a:{name:"紐芮雅‧棘風", race:"夜精靈"}, h:{name:"潔娜‧韌蹄", race:"牛頭人"}},
111:{a:{name:"歐倫‧厲鬚", race:"矮人"}, h:{name:"盲眼的希奧卓許", race:"獸人"}},
378:{a:{name:"歐爾瓦", race:"矮人"}, h:{name:"塔迪", race:"牛頭人"}},
325:{a:{name:"歐斯加‧錘擊", race:"矮人"}, h:{name:"路希奧", race:"牛頭人"}},
366:{a:{name:"彭‧潛爪", race:"熊貓人"}, h:{name:"瓦茲瑞克", race:"食人妖"}},
242:{a:{name:"彼得‧圖里歐斯", race:"人類"}, h:{name:"歐拉夫‧布萊貝瑞", race:"不死族"}},
176:{a:{name:"鬥士范達姆", race:"德萊尼"}, h:{name:"布魯多", race:"獸人"}},
171:{a:{name:"快樂機器人8000", race:"機械"}, h:{name:"快樂機器人8000", race:"機械"}},
34:{a:{name:"琪安娜‧月影", race:"夜精靈"}, h:{name:"歐林‧棕皮", race:"牛頭人"}},
264:{a:{name:"拉馬爾‧實橡", race:"夜精靈"}, h:{name:"『綠衣人』胡馬克", race:"牛頭人"}},
252:{a:{name:"蘭蒂‧沃利斯", race:"狼人"}, h:{name:"蘇拉卡", race:"食人妖"}},
185:{a:{name:"遊俠雪兒", race:"德萊尼"}, h:{name:"羅克拉", race:"獸人"}},
212:{a:{name:"遊俠厄達妮", race:"德萊尼"}, h:{name:"骸骨蘇克之魂", race:"獸人"}},
159:{a:{name:"遊俠凱爾雅", race:"德萊尼"}, h:{name:"『尖嘯者』卡茲", race:"獸人"}},
324:{a:{name:"蕾切爾‧戴靈", race:"人類"}, h:{name:"艾蕾亞", race:"牛頭人"}},
300:{a:{name:"蕾貝卡‧斯特靈", race:"人類"}, h:{name:"坎蒂絲‧莫雷", race:"不死族"}},
99:{a:{name:"藍薩爾‧血牙", race:"狼人"}, h:{name:"瓦茲克", race:"食人妖"}},
101:{a:{name:"琳恩‧星歌", race:"夜精靈"}, h:{name:"薩薇", race:"食人妖"}},
380:{a:{name:"蘿詩妮‧石語", race:"矮人"}, h:{name:"芮緹雅", race:"食人妖"}},
183:{a:{name:"蘿坎", race:"獸人"}, h:{name:"古羅巡者洛卡什", race:"獸人"}},
246:{a:{name:"魯凡‧霍斯彼", race:"狼人"}, h:{name:"莫裘凱", race:"食人妖"}},
404:{a:{name:"萊琪‧林加弗", race:"地精"}, h:{name:"薇卡凱", race:"食人妖"}},
259:{a:{name:"莎拉‧史諾", race:"狼人"}, h:{name:"贊騰碧", race:"食人妖"}},
435:{a:{name:"梭爾‧李伊", race:"人類"}, h:{name:"圖爾格茲‧酒拳", race:"獸人"}},
268:{a:{name:"紅葉", race:"夜精靈"}, h:{name:"庫瑪‧雷革", race:"牛頭人"}},
90:{a:{name:"史瑞希‧猛爆", race:"地精"}, h:{name:"薇菈‧亞納爾", race:"血精靈"}},
251:{a:{name:"瑟琳妮‧奇爾", race:"狼人"}, h:{name:"珈卡瑪", race:"食人妖"}},
428:{a:{name:"瑟麗絲", race:"人類"}, h:{name:"優菈‧克雷", race:"不死族"}},
296:{a:{name:"席歐娜‧火織者", race:"矮人"}, h:{name:"亞娃莉‧炎喚", race:"獸人"}},
234:{a:{name:"席佛‧霜鏈", race:"地精"}, h:{name:"唐拉羅", race:"食人妖"}},
182:{a:{name:"雪莉‧漢彼", race:"人類"}, h:{name:"穆維里克", race:"獸人"}},
425:{a:{name:"護盾大師戴倫", race:"德萊尼"}, h:{name:"瓦爾許‧阿特肯斯", race:"不死族"}},
293:{a:{name:"史吉普‧燃亮", race:"地精"}, h:{name:"卡茲希琪", race:"食人妖"}},
344:{a:{name:"松菈", race:"熊貓人"}, h:{name:"琵卡可", race:"食人妖"}},
172:{a:{name:"安多哈爾的索拉雷", race:"人類"}, h:{name:"安多哈爾的索拉雷", race:"人類"}},
205:{a:{name:"縛魂者圖菈妮", race:"德萊尼"}, h:{name:"縛魂者圖菈妮", race:"德萊尼"}},
281:{a:{name:"史提岡德‧鐵陷", race:"矮人"}, h:{name:"莫格塔", race:"獸人"}},
120:{a:{name:"蘇萊‧雪瓣", race:"熊貓人"}, h:{name:"蘇萊‧雪瓣", race:"熊貓人"}},
420:{a:{name:"『小太陽』蘇娜‧鋼爪", race:"熊貓人"}, h:{name:"冰伊妮", race:"食人妖"}},
116:{a:{name:"席菈蕊絲‧霜風", race:"夜精靈"}, h:{name:"艾澤瑞奇‧灰刃", race:"血精靈"}},
108:{a:{name:"希爾娃‧暗吼", race:"狼人"}, h:{name:"薇絲‧金加拉", race:"食人妖"}},
367:{a:{name:"辛蒂‧炫刃", race:"地精"}, h:{name:"萊兒", race:"熊貓人"}},
241:{a:{name:"塔維‧荒鋼", race:"矮人"}, h:{name:"艾諾克‧弗勒", race:"不死族"}},
336:{a:{name:"特慕菈‧恩斯", race:"人類"}, h:{name:"歐菲柔", race:"血精靈"}},
217:{a:{name:"黎沙莉‧烏鴉", race:"夜精靈"}, h:{name:"克魯娜", race:"牛頭人"}},
229:{a:{name:"托林‧煤心", race:"矮人"}, h:{name:"席瑞‧佛格斯", race:"不死族"}},
282:{a:{name:"陷捕者霍恩", race:"熊貓人"}, h:{name:"札普‧陷嘶", race:"哥布林"}},
353:{a:{name:"楚曼‧維弗", race:"人類"}, h:{name:"阿赫特", race:"牛頭人"}},
278:{a:{name:"維達‧金標", race:"矮人"}, h:{name:"赫拉倫", race:"牛頭人"}},
186:{a:{name:"復仇者歐納拉", race:"德萊尼"}, h:{name:"主母吉雅", race:"獸人"}},
100:{a:{name:"沃里克‧范伯恩", race:"狼人"}, h:{name:"馬格倫‧迷霧行者", race:"牛頭人"}},
195:{a:{name:"維爾頓‧巴羅夫", race:"人類"}, h:{name:"阿萊克斯‧巴羅夫", race:"不死族"}},
104:{a:{name:"沃夫格林‧布萊克曼托", race:"狼人"}, h:{name:"薇拉‧虛無之心", race:"血精靈"}},
257:{a:{name:"澤拉尼塔斯", race:"夜精靈"}, h:{name:"穆哈‧石皮", race:"牛頭人"}},
433:{a:{name:"曉", race:"熊貓人"}, h:{name:"曉", race:"熊貓人"}},
240:{a:{name:"伊薇特‧黑心", race:"人類"}, h:{name:"奈娃菈‧惡言", race:"獸人"}},
389:{a:{name:"濟恩", race:"德萊尼"}, h:{name:"赫里斯‧裂風", race:"哥布林"}},
168:{a:{name:"澤利亞克", race:"埃匹希斯衛士"}, h:{name:"澤利亞克", race:"埃匹希斯衛士"}},
465:{a:{name:"哈里遜‧瓊斯", race:"人類"}, h:{name:"哈里遜‧瓊斯", race:"人類"}},
466:{a:{name:"迦羅娜‧半血", race:"獸人"}, h:{name:"迦羅娜‧半血", race:"獸人"}},
467:{a:{name:"風濤", race:"熊貓人"}, h:{name:"風濤", race:"熊貓人"}}
};

