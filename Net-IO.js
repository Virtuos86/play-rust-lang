/*
    All net I/O is here.
*/

// API for a result of `execute/format` commands:
// {
//     "success": true/false,
//     "code": "...", // (only for `format`)
//     "stderr": "...", // technical details of a compilation
//     "stdout": "..." // output of a programm
// }

const SUCCESS = 0;
const ERROR = 1 + SUCCESS;
const WARNING = 1 + ERROR;

const PREFIX = "http://play.integer32.com";
const EXECUTE_URL = "http://play.integer32.com/execute";
const FORMAT_URL = "http://play.integer32.com/format";
const GIST_URL = "https://api.github.com/gists";

// Regex for finding new lines
const newLineRegex = /(?:\r\n|\r|\n)/g;

function escapeHTML(unsafe) {// return unsafe;
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(newLineRegex, '<br>');
};

const exec_request = {
    "channel":   "stable", 
    "mode":      "debug",
    "crateType": "bin",
    "tests":      false,
    "code":       ""
};

/* API:
const result = {
    "success": true / false,
    "stdout": "out" / "",
    "stderr": "" / "err"
};
*/

const gist_request = {
    "description": "Rust code shared from the playground",
    "public": true,
    "files": {
        "playground.rs": {
            "content": ""
        }
    }
};

function clearResultDiv() {
};

function execute( program, callback ) {
    var req = new XMLHttpRequest();
    var data =  new Object(exec_request);
    data.mode = settings.mode;
    data.channel = settings.channel;
    data.code = program;
    data = JSON.stringify(data);
    //alert(data);
    req.timeout = 30000;

    console.log("Sending", data);
    req.open('POST', EXECUTE_URL, true );
    req.setRequestHeader( "Access-Control-Allow-Origin", '"*"' );
    req.setRequestHeader( "Access-Control-Allow-Headers", '"origin,x-requested-with,content-type"' );
    //req.setRequestHeader( "Origin", "https://play.rust-lang.org" );
    //req.setRequestHeader( "Referer", "https://play.rust-lang.org/?code=" + encodeURIComponent( data ) + "&version=stable&backtrace=0" );
    req.onload = function(e) {
        var statusCode = false;
        var result = null;
        if (req.readyState === 4 && req.status === 200) {
            result = JSON.parse(req.response);
            //alert(JSON.stringify(result));
            // handle application errors from playpen
            if( !result.success ) {
                statusCode = ERROR;
                result = 'Playpen Error: ' + result.stderr;
            } else {
                statusCode = SUCCESS;

                // handle rustc errors/warnings
                // Need server support to get an accurate version of this.
                if (result.stderr.indexOf("error:") !== -1) {
                    statusCode = ERROR;
                } else if (result.stderr.indexOf("warning:") !== -1) {
                    statusCode = WARNING;
                };
                
                result = result.stdout;
            };
        } else {
            result = req.response;
        };

        callback(statusCode, result);
    };

    req.onerror = function(e) {
        callback(false, null);
    };

    req.ontimeout = function(e) {
        var statusCode = ERROR;
        var result = "play.rust-lang.org not responding, please check back later";

        callback(statusCode, result);
    };

    req.setRequestHeader( "Content-Type", "application/json" );
    req.send( data );
};

// The callback to execute
function handleResult( statusCode, message ) {//alert("result: "+statusCode);
    // Dispatch depending on result type
    if (message == null) {
        clearResultDiv();
        //resultDiv.style.backgroundColor = errorColor;
        //resultDiv.innerHTML = errMsg;
    } else if (statusCode === SUCCESS) {
        handleSuccess(message);
    } else if (statusCode === WARNING) {
        handleWarning(message);
    } else {
        handleError(message);
    };
};

// Called on successful program run: display output and playground icon
function handleSuccess( message ) {
    displayOutput(escapeHTML(message), txtSourceBuffer.GetText());
};

// Called when program run results in warning(s)
function handleWarning( message ) {
    handleProblem(message, "warning");
};

// Called when program run results in error(s)
function handleError( message ) {
    handleProblem(message, "error");
};

// Called on unsuccessful program run. Detects and prints problems (either
// warnings or errors) in program output and highlights relevant lines and text
// in the code.
function handleProblem( message, problem ) {
    if( typeof message == "undefined" ) return;
    // Getting list of ranges with problems
    var lines = message.split(newLineRegex);

    // Cleaning up the message: keeps only relevant problem output.
    var cleanMessage = lines.filter(function(line) {
        line = line.trim();
        return !(line.slice(0, 11) == "--> <anon>")
        && !(line.slice(0, 9) == "playpen:")
        && !(line.slice(0, 16) == "error: aborting");
    }).map(function(line) {
        return escapeHTML(line);
    }).filter(function(line) {
        return line != "";
    }).map(function(line) {
        return line.replace(/  /g, '\u00a0\u00a0');
    }).join("<br>\n<p>");

    // Get all of the row:col in the message.
    var errorLines = lines.filter(function(line) {
        return line.indexOf("--> <anon>") !== -1;
    }).map(function(line) {
        var lineIndex = line.indexOf(":");
        if (lineIndex !== -1) {
            return line.slice(lineIndex);
        };

        return "";
    }).filter(function(line) {
        return line != "";
    });

    // Setting message
    displayOutput(cleanMessage, txtSourceBuffer.GetText());

    // Highlighting the lines
   // var ranges = parseProblems(errorLines);
   // markers = ranges.map(function(range) {
   //    return editor.getSession().addMarker(range, "ace-" + problem + "-line",
   //     "fullLine", false);
    //});

    // Highlighting the specific text
    //markers = markers.concat(ranges.map(function(range) {
   //     return editor.getSession().addMarker(range, "ace-" + problem + "-text",
    //    "text", false);
   // }));
};

// Parses a problem message returning a list of ranges (row:col, row:col) where
// problems in the code have occured.
function parseProblems( lines ) {
    var ranges = [];
    for (var i in lines) {
        var line = lines[i];
        var parts = line.split(/:\s?|\s+/, 5).slice(1, 5);
        var ip = parts.map(function(p) { return parseInt(p, 10) - 1; });
        console.log("line:", line, parts, ip);
        ranges.push(new Range(ip[0], ip[1], ip[2], ip[3]));
    };

    return ranges;
};

// Display an output message and a link to the Rust playground
function displayOutput( message, program ) {
    var gistUrl = getGist( program );
    bodyScroll.ScrollTo( 0, bodyHeight );
    txtOutputBuffer.SetHtml( message +"<br>============================<br>" + gistUrl );
};

function getGist( program ) {
    var data = new Object(gist_request);
    data.files["playground.rs"].content = program;
    var request = new XMLHttpRequest();
    request.open( "POST", GIST_URL, false );
    request.setRequestHeader( "Content-Type", "application/json" );
    request.onreadystatechange = function() {
        if( request.readyState == 4 ) {
            var json;
            try {
                json = JSON.parse( request.response );
            } catch (e) {
                console.log( "JSON.parse(): " + e );
            };

            if( request.status == 201 ) {
                return json;
            } else if( request.status === 0 ) {
                app.ShowPopup( "Connection failure.\nAre you connected to the Internet?" );
            } else {
                app.ShowPopup( "Something went wrong.\nThe HTTP request produced a response with status code " + request.status + ".");
            };
        } else {
            
        };
    };
    try {
        request.send( JSON.stringify( data ) );
        var res = JSON.parse( request.response );
        res = ( "<br>Permalink to the playground:<br>    " + PREFIX + "/?gist=" + res.id
              + "&version=" + settings.version );
        return res;
    } catch (e) {
        app.ShowPopup( e );
        return data.code;
    };
};

function format( source, version, optimize ) {
    var res = send( {"code": source} );
    return res;
};

function send( data ) {
    var request = new XMLHttpRequest();
    request.open( "POST", FORMAT_URL, false );
    request.setRequestHeader( "Content-Type", "application/json" );
    request.onreadystatechange = function() {
        if( request.readyState == 4 ) {
            var json;
            try {
                json = JSON.parse( request.response );
            } catch (e) {
                console.log( "JSON.parse(): " + e );
            };

            if( request.status == 200 ) {
                return json;
            } else if( request.status === 0 ) {
                app.ShowPopup( "Connection failure.\nAre you connected to the Internet?" );
            } else {
                app.ShowPopup( "Something went wrong.\nThe HTTP request produced a response with status code " + request.status + ".");
            };
        } else {
            
        };
    };
    //request.timeout = 10000;
    //request.ontimeout = function() {
    //    app.ShowPopup( "Connection timed out.\nAre you connected to the Internet?" );
    //};
    try {//alert(JSON.stringify( data ) + typeof data);
        request.send( JSON.stringify( data ) );
        var res = JSON.parse( request.response );
        return res;
    } catch (e) {
        app.ShowPopup( e );
        return data.code;
    };
};
