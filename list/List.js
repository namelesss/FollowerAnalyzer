List = function(container, header, staticHeader) 
{
  var thead = document.createElement("THEAD");
  var table = document.createElement("TABLE");
  var tbody = document.createElement("TBODY");
  var tableD = document.createElement("DIV");
  tableD.className = "list-table-container";
  table.appendChild(tbody);
  tableD.appendChild(table);

  if (staticHeader)
  {
    var tableH = document.createElement("TABLE");
    tableH.appendChild(thead);
    container.appendChild(tableH);
  }
  else
    table.appendChild(thead);
  container.appendChild(tableD);
  
  this.thead = thead;
  this.tbody = tbody;

  this.container = container;
  this.header = header;
  this.staticHeader = staticHeader;
  this.currentList;
}

List.prototype.updateList = function ()
{
  var nodes = this.tbody.childNodes;
  for (var j = 0; j < nodes.length; ++j)
  {
    var data = this.currentList[j];
    var tr = nodes[j];

    for (var i = 0; i < this.header.length; ++i)
    {
      var title = this.header[i];
      var td = tr.childNodes[i];
      td.innerHTML = data[title.key];

      if (title.style) 
        td.setAttribute("style", title.style); 
      if (title.color)
        td.style.color = data[title.color] || title.color;
      if (this.titleKey)
        td.setAttribute("title", data[this.titleKey]); 
      if (this.staticHeader && title.width)
        td.style.width = title.width;
    }
  }
}

List.prototype.clearList = function ()
{
  // Not implement and not used yet
}

List.prototype.createList = function (dataList, titleKey)
{
  this.currentList = dataList
  this.titleKey = (titleKey) ? titleKey : "";

  var nodes = this.tbody.childNodes;
  var numCurrentList = nodes.length;
  var numNeededList = dataList.length;
  // clear extra tr
  for (var i = numCurrentList - 1; i >= numNeededList ; --i)
  {
    this.tbody.removeChild(nodes[i]);
  }
  // create insufficient tr
  for (var j = numCurrentList; j < numNeededList; ++j)
  {
    var tr = document.createElement("TR");
    
    for (var i = 0; i < this.header.length; ++i)
    {
      var td = document.createElement("TD");
      tr.appendChild(td);
    }
    tr.appendChild(td);

    this.tbody.appendChild(tr);
  }

  // reset thead
  var tr = document.createElement("TR");
  var header = this.header;
  for (var i = 0; i < header.length; ++i)
  {
    var th = document.createElement("TH");
    th.innerHTML = header[i].title;
    if (header[i].style) 
      th.setAttribute("style", header[i].style);
    if (header[i].titleClicked)
    {
      th.titleClicked = header[i].titleClicked;
      th.onclick = function(){
        var brothers = this.parentNode.childNodes;
        for (var i = 0; i < brothers.length; ++i)
          brothers[i].removeAttribute("selected");
        this.setAttribute("selected", "");
        this.titleClicked(this)
      }
    }
    if (this.staticHeader && header[i].width)
      th.style.width = header[i].width;
    tr.appendChild(th);
  }
  if (this.thead.firstChild)
    this.thead.removeChild(this.thead.firstChild);
  this.thead.appendChild(tr);
  
  this.updateList();
}

List.prototype.show = function ()
{
  this.container.removeAttribute("hidden");
}

List.prototype.hide = function ()
{
  this.container.setAttribute("hidden", true);
}
