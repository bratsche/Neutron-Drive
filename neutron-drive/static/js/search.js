var currentSearch;
var Search = require('ace/search').Search;
var Range = require("ace/range").Range;

function do_search () {
  var sr = $("#s_sr").get(0).checked;
  var sterm = $("#s_search").val();
  var rterm = $("#s_replace").val();
  var all = $("#s_tabs").get(0).checked;
  
  $("#search_form .init").addClass('hide');
  $("#s_newsearch").removeClass('hide');
  $("#search_form input").attr('disabled', 'disabled');
  
  if (all) {
    if (sr) {
      $("#s_replaceall").removeClass('hide');
    }
  }
  
  else {
    $("#s_prev").removeClass('hide');
    $("#s_next").removeClass('hide');
    
    if (sr) {
      $("#s_rnext").removeClass('hide');
    }
    
    else {
      $("#s_next").focus();
    }
  }
  
  var opts = {
    needle: sterm,
    backwards: false,
    wrap: true,
    caseSensitive: $("#s_opt_case").get(0).checked,
    wholeWord: $("#s_opt_word").get(0).checked,
    scope: Search.ALL,
    regExp: $("#s_opt_regex").get(0).checked
  };
  
  currentSearch = new Search().set(opts);
  
  if (all) {
    
  }
  
  else {
    var ranges = currentSearch.findAll(Editor.getSession());
    if (ranges.length > 0) {
      var html = '<table class="table table-striped"><tbody>';
      for (i in ranges) {
        var row = ranges[i].start.row + 1;
        var col = ranges[i].start.column + 1;
        var fid = $("#tab_bar .current").get(0).id;
        
        var goto = 'go_to_line(\'' + fid + '\', ' + ranges[i].start.row + ', ' + ranges[i].start.column + ', ' + ranges[i].end.column +')';
        html = html + '<tr><td><a href="javascript: void(0);" onclick="' + goto + '">Line ' + row + ', Column ' + col +'</td></tr>';
      }
      
      html = html + '</tbody></table>';
      $('#search_results').html(html);
      search_next();
    }
    
    else {
      $('#search_results').html('<em>Nothing found, better luck next time</em>');
      currentSearch = null;
    }
  }
  
  return false;
}

function reset_search () {
  var sr = $("#s_sr").get(0).checked;
  
  $("#search_form input").removeAttr('disabled');
  if (!sr) {
    $("#s_replace").attr('disabled', 'disabled');
  }
  
  $("#search_form .init").removeClass('hide');
  $("#search_form .next").addClass('hide');
  
  $('#search_results').html('<em>Search Not Started</em>');
  
  $("#s_search").focus();
}

function go_to_line (fid, line, start, end) {
  var range = new Range(line, start, line, end);
  Tabs.switch_tab(fid);
  
  currentSearch.findAll(Tabs.data[fid].session);
  Tabs.data[fid].session.getSelection().setSelectionRange(range, false);
}

function search_next () {
  if (currentSearch) {
    var session = Editor.getSession();
    var range = currentSearch.find(session);
    
    if (range) {
      session.getSelection().setSelectionRange(range, false);
    }
  }
}
