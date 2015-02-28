Tab = function(containerSelector, tabClickCallback)
{
  var ul = $("<UL></UL>"); 
  ul.addClass("tabs");
  $(containerSelector).append(ul);
  this.ul = ul;

  this.selectedID = "";
  this.tabClickCallback = tabClickCallback;
}

Tab.prototype.getSelectedID = function ()
{
  return this.selectedID;
}

Tab.prototype.tabClicked = function (id)
{
  var that = this;
  if (id)
    this.selectedID = id;

  $.each(this.ul.children(), function()
  { 
    if (that.selectedID == this.id) 
      $(this).addClass("selected");
    else
      $(this).removeClass("selected");
  });

  this.tabClickCallback(this.selectedID);
}

Tab.prototype.clearTabs = function ()
{
  this.ul.empty();
}

Tab.prototype.createTab = function (tabList)
{
  this.clearTabs();

  var generateTab = function (tabInstance, id, name, title, red)
  {
    var li = $("<LI></LI>");
    li.attr("id", id);
    li.text(name);
    if (title) { li.attr("title", title); }
    if (red) { li.addClass("red"); }
    tabInstance.ul.append(li);
    li.click(function () {
      tabInstance.tabClicked(this.id);
    });
  }

  for (var i in tabList)
  {
    var tab = tabList[i];
    generateTab(this, i, tab.name, tab.title, tab.red);
  }

  if (this.selectedID == "" || !(this.selectedID in tabList))
  {
    this.tabClicked(Object.keys(tabList)[0]);
  }
  else
  {
    this.tabClicked();
  }
}

