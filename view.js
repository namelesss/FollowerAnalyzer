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
    {key:"possible",title:"可期望名單", style:nameStyle+";min-width:110px"},
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
  traitStatistics = new AbiTraStat();
});

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
        return traitStatistics.statistic[title].tooltip;
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
    Options.ilv = $("input[name=ilv]:checked").val();
    MATCHDB = {};
    selectMission(curMission.type);
  });

  $("#leastButton").click(function() { $("#leastTeam").toggle();});
  $("#leastTeam").draggable({ containment: "parent" });
  $("#leastClose").click(function() { $("#leastTeam").hide();});

  $("#missionType").change(function() { selectMission($("#missionType").val())});
});

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

function genFollowerTooltip(f)
{
  var wrapper = $("<div></div>");
  wrapper.append($("<div></div>").css("display", "flex").css("font-size", "10pt")
      .append(genText(f.name, {color:f.nameColor}, true).css("flex", "1").css("margin-right", "5px"))
      .append(genText("(" + ((f.level == 100) ? f.iLevel : f.level) + ")", 0, true))
      ).append($("<div></div>").css("display", "flex").css("margin-bottom", "5px")
        .css("font-size", "9pt").css("color", "#bbb")
        .append(genText(f.specName, 0, true).css("flex", "1").css("margin-right", "5px"))
        .append(genText(f.raceName, 0, true)));
  $.each(f.abilities, function() { wrapper.append(genImg(ABILITY[this], {inList:true}, true).css("width", "16px"))});
  $.each(f.traits, function() { wrapper.append(genImg(TRAIT[this], {inList:true}, true).css("width", "16px"))});

  return wrapper;
}

function showCoverMsg()
{
  $("#coverMsg").show();
}

function hideCoverMsg()
{
  $("#coverMsg").hide();
}
