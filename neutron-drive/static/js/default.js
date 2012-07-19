window.onbeforeunload = function() {
  return 'Leaving so soon!';
}

var pickerView = new google.picker.View(google.picker.ViewId.DOCS);
pickerView.setMimeTypes('text/plain,text/html');

function open_picker () {
  picker = new google.picker.PickerBuilder().
    setAppId(ndrive.CLIENT_ID).
    addView(pickerView).
    setCallback(pickerCallback).
    enableFeature(google.picker.Feature.MULTISELECT_ENABLED).
    build();
  picker.setVisible(true);
}

function pickerCallback (data) {
  if (data.action == google.picker.Action.PICKED) {
    for (i in data.docs) {
      var file_id = data.docs[i].id;
      var name = data.docs[i].name;
      
      if (Tabs.files.indexOf(file_id) < 0) {
        $.ajax({
          type: 'POST',
          url: ndrive.negotiator,
          data: {'file_id': file_id, 'task': 'open'},
          success: add_tab,
          error: function () { alert('Error opening file ' + name); }
        });
      }
      
      else {
        Tabs.switch_tab(file_id);
      }
    }
  }
}

function clear_message () {
  $('#message_center').html('');
}

function close_all () {
  if (confirm('Are you sure you wish to close all tabs?')) {
    while (Tabs.files.length > 0) {
      Tabs.remove_tab(Tabs.files[0]);
    }
  }
}

function save_current () {
  var content = Editor.getSession().getValue();
  var name;
  var mimetype;
  
  //todo: get current tab
  for (file_id in Tabs.files) {
    name = Tabs.data[file_id].name;
    mimetype = Tabs.data[file_id].mime;
  }
  //
  
  $('#message_center').html('Saving ' + name + ' ... ');
  
  $.ajax({
    type: 'POST',
    url: ndrive.negotiator,
    data: {
      file_id: file_id,
      task: 'save',
      content: content,
      new_file: 'false',
      name: name,
      mimetype: mimetype
    },
    success: response_ok,
    error: function () { alert('Error saving file ' + name); },
    complete: clear_message
  });
}

var EditSession = require('ace/edit_session').EditSession;
var UndoManager = require("ace/undomanager").UndoManager;
var Editor = ace.edit("ace_div");
set_prefs(null);

$(document).ready(function () {
  set_sizes();
  $(window).resize(function() {
    set_sizes();
  });
  
  
  var resize = $("#resize").get(0);
  
  resize.addEventListener('dragend', function(event) {
    var x = event.x;
    if (x < 1) {
      x = 1;
    }
    
    $("#box_wrapper > div:first-child").width(x);
    var m = x + 9;
    $("#box_wrapper > div:last-child").css('margin-left', m + 'px');
    event.stopPropagation();
    $("#dragger").css('display', 'none');
    $('#collapse_tools').html('&#9666');
    
    setTimeout(function(){ set_sizes(); }, 0);
    setTimeout(function(){ set_sizes(); }, 100);
  }, false);
  
  resize.addEventListener('drag', function(event) {
    $("#dragger").css('display', 'block');
    $("#dragger").offset({ top: 0, left: event.x - 3});
  }, false);
});

function response_ok (data) {
  if (data.status == 'ok') { return true; }
  else if (data.status == 'no_service') { alert('Google Drive service has been interrupted.  Please try again later.'); }
  else if (data.status == 'auth_needed') { todo_something_to_reauth() }
  else {
    alert(data.status);
  }
  return false;
}

function add_tab (data, textStatus, jqXHR) {
  if (response_ok(data)) {
    //console.log(data);
    var session = new EditSession(data.file.content); 
    session.setUndoManager(new UndoManager());
    Editor.setSession(session);
    
    var mode = 'text';
    for (ext in FILE_EXTS) {
      if (ext == data.file.fileExtension) {
        mode = FILE_EXTS[ext];
      }
    }
    
    var Mode = require("ace/mode/" + mode).Mode;
    session.setMode(new Mode());
    set_sizes();
    set_prefs(session);
    Editor.focus();
    $("#emode_" + mode).get(0).checked = true;
    
    Tabs.add_file(data.file.id, data.file.title, data.file.mimeType, session);
  }
}

function set_sizes () {
  var winh = $(window).height();
  var winw = $(window).width();
  var toph = $("#top_wrapper").height();
  var toolw = $("#box_wrapper > div:first-child").width();
  var tabh = $("#tab_bar").height();
  
  var h = toph + 1 + tabh;
  $('#ace_div').width(winw - (toolw + 9));
  $('#box_wrapper > div').height(winh - (toph + 1));
  $('#ace_div').height(winh - h);
  $("#box_wrapper > div:last-child").css('margin-left', (toolw + 9) + 'px');
  
  Editor.resize();
}

function set_editor_mode (mode) {
  var sess = Editor.getSession();
  var Mode = require("ace/mode/" + mode).Mode;
  sess.setMode(new Mode());
  
  $('#modeModal').modal('hide');
  Editor.focus();
}

function update_prefs () {
  $('#prefModal').modal('hide');
  
  PREFS.theme = $("#id_theme").val();
  PREFS.fontsize = $("#id_fontsize").val();
  PREFS.keybind = $("#id_keybind").val();
  PREFS.swrap = $("#id_swrap").val();
  PREFS.tabsize = $("#id_tabsize").val();
  
  PREFS.hactive = $("#id_hactive").get(0).checked;
  PREFS.hword = $("#id_hword").get(0).checked;
  PREFS.invisibles = $("#id_invisibles").get(0).checked;
  PREFS.gutter = $("#id_gutter").get(0).checked;
  PREFS.pmargin = $("#id_pmargin").get(0).checked;
  PREFS.softab = $("#id_softab").get(0).checked;
  PREFS.behave = $("#id_behave").get(0).checked;
  
  PREFS.save_session = $("#id_save_session").get(0).checked;
  
  set_prefs(null);
  Editor.focus();
  
  
  $.ajax({
    type: 'POST',
    url: ndrive.prefs,
    data: PREFS,
    error: function () { alert('Error saving preferences'); }
  });
  
  return false;
}

function set_prefs (session) {
  if (!session) {
    session = Editor.getSession();
  }
  
  load_theme = true;
  for (i in LOADED_THEMES) {
    if (LOADED_THEMES[i] == PREFS.theme) {
      load_theme = false;
      break;
    }
  }
  
  if (load_theme) {
    $.ajax({
      url: STATIC_URL + 'ace/src-min/theme-' + PREFS.theme + '.js',
      dataType: "script",
      async: false,
    });
    LOADED_THEMES.push(PREFS.theme);
  }
  
  Editor.setTheme("ace/theme/" + PREFS.theme);
  
  var handler = null;
  if (PREFS.keybind == 'emacs') {
    handler = require("ace/keyboard/emacs").handler;
  }
  
  else if (PREFS.keybind == 'vim') {
    handler = require("ace/keyboard/vim").handler;
  }
  
  Editor.setKeyboardHandler(handler);
  
  Editor.setHighlightActiveLine(PREFS.hactive);
  Editor.setHighlightSelectedWord(PREFS.hword);
  Editor.setShowInvisibles(PREFS.invisibles);
  Editor.setBehavioursEnabled(PREFS.behave);
  
  Editor.renderer.setFadeFoldWidgets(false);
  Editor.renderer.setShowGutter(PREFS.gutter);
  Editor.renderer.setShowPrintMargin(PREFS.pmargin);
  
  session.setTabSize(PREFS.tabsize);
  session.setUseSoftTabs(PREFS.softab);
  
  switch (PREFS.swrap) {
    case "off":
      session.setUseWrapMode(false);
      Editor.renderer.setPrintMarginColumn(80);
      break;
      
    case "40":
      session.setUseWrapMode(true);
      session.setWrapLimitRange(40, 40);
      Editor.renderer.setPrintMarginColumn(40);
      break;
      
    case "80":
      session.setUseWrapMode(true);
      session.setWrapLimitRange(80, 80);
      Editor.renderer.setPrintMarginColumn(80);
      break;
      
    case "free":
      session.setUseWrapMode(true);
      session.setWrapLimitRange(null, null);
      Editor.renderer.setPrintMarginColumn(80);
      break;
  }
  
  $("#ace_wrapper #ace_div").css('font-size', PREFS.fontsize);
}

var last_width = 300;
function collapse_tools () {
  var sel = '#box_wrapper > div:first-child';
  
  if ($(sel).width() == 0) {
    $(sel).width(last_width);
    $('#collapse_tools').html('&#9666');
  }
  
  else {
    last_width = $(sel).width();
    $(sel).width(0);
    $('#collapse_tools').html('&#9656');
  }
  
  setTimeout(function(){ set_sizes(); }, 0);
  setTimeout(function(){ set_sizes(); }, 100);
}
