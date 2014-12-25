Tab = function(container, tabClickCallback)
{
  var ul = document.createElement("UL"); 
  ul.setAttribute("class", "tabs");
  container.appendChild(ul);
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
  if (id)
  {
    this.selectedID = id;
  }

  var nodes = this.ul.childNodes;
  for (var i = 0; i < nodes.length; ++i)
  {
    var node = nodes[i];
    if (this.selectedID == node.id) 
    {
      node.setAttribute("class", "selected");
    }
    else
    {
      node.removeAttribute("class");
    }
  }
  this.tabClickCallback(this.selectedID);
}

Tab.prototype.clearTabs = function ()
{
  var nodes = this.ul.childNodes;
  for (var i = nodes.length - 1; i >= 0 ; --i)
  {
    this.ul.removeChild(nodes[i]);
  }
}

Tab.prototype.createTab = function (tabList)
{
  this.clearTabs();

  var generateTab = function (tabInstance, id, name, title)
  {
    var li = document.createElement("LI");
    li.id = id;
    if (title) { li.title = title; }
    li.appendChild(document.createTextNode(name))
    li.addEventListener('click', function (e) {
      tabInstance.tabClicked(e.currentTarget.id);
    });
    tabInstance.ul.appendChild(li);
  }

  for (var i in tabList)
  {
    var tab = tabList[i];
    generateTab(this, i, tab.name, tab.title);
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

Tab.prototype.show = function ()
{
  this.ul.parentNode.removeAttribute("hidden");
}


Tab.prototype.hide = function ()
{
  this.ul.parentNode.setAttribute("hidden", true);
}
