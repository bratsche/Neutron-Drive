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
      
      //todo: check it already open first
      $.ajax({
        type: 'POST',
        url: ndrive.negotiator,
        data: {'file_id': file_id, 'task': 'open'},
        success: add_tab,
        error: function () { alert('Error opening file ' + name); }
      });
    }
  }
}

function clear_message () {
  $('#message_center').html('');
}

function save_current () {
  var content = Editor.getSession().getValue();
  var file_id;
  var name;
  var mimetype;
  
  //todo: get current tab
  for (id in ndrive.tabs) {
    file_id = id;
    name = ndrive.tabs[id].name;
    mimetype = ndrive.tabs[id].mimetype;
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

$(document).ready(function () {
  set_sizes();
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
    console.log(data);
    
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
    Editor.focus();
    
    ndrive.tabs[data.file.id] = {
      name: data.file.title,
      mimetype: data.file.mimeType,
      session: session
    }
    
    //todo: add tab
  }
}

function set_sizes () {
  var winh = $(window).height();
  var winw = $(window).width();
  var toph = $("#top_wrapper").height();
  
  $('#ace_div').width(winw);
  $('#ace_div').height(winh - toph);
  
  Editor.resize();
}
