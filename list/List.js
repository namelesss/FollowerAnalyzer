List = function(containerJQuery, header) 
{
  var thead = $("<thead></thead>");
  var tbody = $("<tbody></tbody>");

  containerJQuery.append($("<div></div>").addClass("list-table-header"))
    .append($("<div></div>").addClass("list-table-container").append(
          $("<table></table>").append(thead).append(tbody)));
  
  this.thead = thead;
  this.tbody = tbody.get(0);

  this.header = header;
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
      if (title.width)
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
  this.currentList = dataList;
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

    this.tbody.appendChild(tr);
  }

  // reset thead
  var tr = $("<tr></tr>");
  var header = this.header;
  for (var i = 0; i < header.length; ++i)
  {
    var th = $("<div></div>").addClass("th-inner").html(header[i].title);
    if (header[i].style) 
      th.attr("style", header[i].style);
    if (header[i].titleClicked)
    {
      th.on("click", header[i].titleClicked, function(event){
        $(".th-inner").removeAttr("selected");
        $(this).attr("selected", "");
        event.data(this);
      });
    }
    if (header[i].width)
      th.css("width", header[i].width);
    tr.append($("<th></th>").append(th));
  }
  this.thead.empty().append(tr);
  
  this.updateList();
}

