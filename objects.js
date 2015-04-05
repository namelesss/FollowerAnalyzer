
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
  for (var i in ABILITY)
    $("#statistic").append(genStatisticIcon(ABILITY[i]));
  $.each([76, 77, 221, 79], function() { $("#statistic").append(genStatisticIcon(TRAIT[this]))});
  $("#statistic").append(genStatisticBarIcon(TRAIT[69].img, RACE_MATCH));

  this.reset();
}

AbiTraStat.prototype.reset = function()
{
  var that = this;
  this.raceList = {};
  this.statistic = {};
  $.each(ABILITY, function (key) { that.statistic[this.name] = []; that.statistic[this.name].abiID = key; });
  $.each(TRAIT, function (key) { that.statistic[this.name] = []; that.statistic[this.name].matchedRace = RACE_MATCH[key]; });
  $.each(RACE_MATCH, function() { that.raceList[this] = []; });
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

AbiTraStat.prototype.genStatisticData = function()
{
  var that = this;
  // Race bar
  $(".statisticBarIcon").find("#count").text("");
  $(".statisticIcon").each(function () 
  { 
    var title = this.title.slice(1);
    var count = that.statistic[title].length;
    $(this).text(count || "");
    var ele = $(this).parents(".statisticBarIcon").find("#count");
    if (ele) ele.text(parseInt(ele.text() || 0) + count);
  });
  this.genTooltip();
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

