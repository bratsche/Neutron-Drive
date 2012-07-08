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

var EditSession = require('ace/edit_session').EditSession;
var UndoManager = require("ace/undomanager").UndoManager;
var Editor = ace.edit("ace_div");

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
    //todo: load ace editor
    console.log(data);
    
    var sess = new EditSession(data.content); 
    sess.setUndoManager(new UndoManager());
    Editor.setSession(sess);
    
    var mode = 'html';
    var Mode = require("ace/mode/" + mode).Mode;
    sess.setMode(new Mode());
  }
}
