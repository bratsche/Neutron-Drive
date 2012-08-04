var Tabs = {
  files: [],
  data: {}
};

Tabs.add_file = function (file_id, name, mime, session) {
  Tabs.files.push(file_id);
  Tabs.data[file_id] = {
    name: name,
    mime: mime,
    session: session,
    md5hash: md5(session.getValue()),
    undos: 0,
    saved_once: false
  };
  
  var l = (Tabs.files.length - 1) * 130;
  $("#tab_bar span.current").removeClass('current');
  var html = '<span class="current" id="' + file_id + '" style="left: ' + l + 'px;">';
  html = html + '<a href="javascript: void(0)" title="' + name + '">' + name + '</a>';
  html = html + '<button type="button" class="close">×</button>';
  
  $("#tab_bar").append(html);
  $("#tab_bar span#" + file_id + ' a').click(function () { Tabs.switch_tab(file_id, true); });
  $("#tab_bar span#" + file_id + ' button').click(function () { Tabs.remove_tab(file_id); });
  
  $("#tab_bar").animate({scrollLeft: l}, 500);
  
  var html2 = '<li><a id="tabsel_' + file_id + '" href="javascript: void(0);" onclick="Tabs.switch_tab(\'' + file_id + '\')">' + name + '</a></li>';
  $("#tab_drop").append(html2);
};

Tabs.switch_tab = function (file_id, noscroll) {
  $("#tab_bar span.current").removeClass('current');
  $("#tab_bar span#" + file_id).addClass('current');
  Editor.setSession(Tabs.data[file_id].session);
  
  if (noscroll) {}
  else {
    var l = Tabs.files.indexOf(file_id) * 130;
    $("#tab_bar").animate({scrollLeft: l}, 500);
  }
};

Tabs.current_tab = function () {
  return $("#tab_bar span.current").get(0).id;
}

Tabs.remove_tab = function (file_id) {
  var f = Tabs.files.indexOf(file_id);
  var sel = "#tab_bar span#" + file_id;
  var tab_switch = false;
  
  if (Tabs.files.length > 1) {
    if ($(sel).hasClass('current')) {
      var c = f + 1;
      if (c >= Tabs.files.length) {
        c = f - 1;
      }
      
      tab_switch = Tabs.files[c];
    }
  }
  
  else {
    Editor.setValue("Open A File to Continue");
  }
  
  delete Tabs.data[file_id].session;
  delete Tabs.data[file_id];
  
  Tabs.files.splice(f, 1);
  
  $(sel).remove();
  $('#tabsel_' + file_id).remove();
  for (i in Tabs.files) {
    var l = i * 130;
    $("#" + Tabs.files[i]).css('left', l + 'px');
  }
  
  if (tab_switch) {
    Tabs.switch_tab(tab_switch);
  }
};
