var Tabs = {
  files: [],
  data: {}
};

Tabs.add_file = function (file_id, name, mime, session) {
  Tabs.files.push(file_id);
  Tabs.data[file_id] = {name: name, mime: mime, session: session};
  
  $("#tab_bar span.current").removeClass('current');
  var html = '<span class="current" id="' + file_id + '">';
  html = html + '<a href="javascript: void(0)">' + name + '</a>';
  html = html + '<button type="button" class="close">×</button>';
  
  $("#tab_bar").append(html);
  $("#tab_bar span#" + file_id + ' a').click(function () { Tabs.switch_tab(file_id); });
  $("#tab_bar span#" + file_id + ' button').click(function () { Tabs.remove_tab(file_id); });
};

Tabs.switch_tab = function (file_id) {
  $("#tab_bar span.current").removeClass('current');
  $("#tab_bar span#" + file_id).addClass('current');
  Editor.setSession(Tabs.data[file_id].session);
};

Tabs.remove_tab = function (file_id) {
  var f = Tabs.files.indexOf(file_id);
  var sel = "#tab_bar span#" + file_id;
  
  if (Tabs.files.length > 1) {
    if ($(sel).hasClass('current')) {
      var c = f + 1;
      if (c >= Tabs.files.length) {
        c = f - 1;
      }
      
      Tabs.switch_tab(Tabs.files[c]);
    }
  }
  
  else {
    Editor.setValue("Open A File to Continue");
  }
  
  delete Tabs.data[file_id].session;
  delete Tabs.data[file_id];
  
  Tabs.files.splice(f, 1);
  
  $(sel).remove();
};
