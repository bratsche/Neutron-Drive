jQuery(document).ajaxSend(function(event, xhr, settings) {
    function getCookie(name) {
        var cookieValue = null;
        if (document.cookie && document.cookie != '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = jQuery.trim(cookies[i]);
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) == (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    function sameOrigin(url) {
        // url could be relative or scheme relative or absolute
        var host = document.location.host; // host + port
        var protocol = document.location.protocol;
        var sr_origin = '//' + host;
        var origin = protocol + sr_origin;
        // Allow absolute or scheme relative URLs to same origin
        return (url == origin || url.slice(0, origin.length + 1) == origin + '/') ||
            (url == sr_origin || url.slice(0, sr_origin.length + 1) == sr_origin + '/') ||
            // or any other URL that isn't scheme relative or absolute i.e relative.
            !(/^(\/\/|http:|https:).*/.test(url));
    }
    function safeMethod(method) {
        return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
    }

    if (!safeMethod(settings.type) && sameOrigin(settings.url)) {
        xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
    }
});

var FILE_EXTS = {
  'clj': 'clojure',
  
  'c': 'c_cpp', 'cpp': 'c_cpp',
  
  'cfm': 'coldfusion', 'cfc': 'coldfusion', 'cfml': 'coldfusion',
  
  'cof': 'coffee',
  
  'cs': 'csharp',
  
  'css': 'css',
  
  'diff': 'diff',
  
  'go': 'go',
  
  'hx': 'haxe',
  
  'htm': 'html', 'html': 'html',
  
  'java': 'java', 'class': 'java', 'jsp': 'java',
  
  'js': 'javascript',
  
  'json': 'json',
  
  'jsx': 'jsx',
  
  'tex': 'latex', 'latex': 'latex',
  
  'less': 'less',
  
  'liquid': 'liquid',
  
  'lua': 'lua',
  
  'md': 'markdown',
  
  'pgsql': 'pgsql',
  
  'php': 'php',
  
  'pl': 'perl', 'pm': 'perl',
  
  'ps1': 'powershell',
  
  'py': 'python',
  
  'rb': 'ruby', 'rbx': 'ruby',
  
  'sass': 'scss', 'scss': 'scss',
  
  'sh': 'sh',
  
  'sql': 'sql',
  
  'svg': 'svg',
  
  'txt': 'text', 'text': 'text',
  
  'xml': 'xml', 'rss': 'xml', 'atom': 'xml',
  
  'xquery': 'xquery',
  
  'yml': 'yaml', 'yaml': 'yaml',
  
  'groovy': 'groovy',
  
  'ml': 'ocaml', 'mli': 'ocaml', 'mll': 'ocaml',
  
  'scad': 'scad',
  
  'scala': 'scala', 
  
  'textile': 'textile'
};
