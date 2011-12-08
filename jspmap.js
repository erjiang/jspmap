var map = function(fun, ls) {
    var i = ls.length;
    var newarr = [];
    while(i--) {
        newarr[i] = fun(ls[i]);
    }
    return newarr;
}
var MAX_WORKERS = 4;
var BlobBuilder = window.WebKitBlobBuilder ||
                  window.MozBlobBuilder;
window.URL = window.URL || window.webkitURL;
var parallelmap = function(fun, tasks, callback) {
    var ls = [];
    var i = 0;
    while(i < tasks.length) {
        ls.push(tasks[i]);
        i++;
    }
    var max_workers = (tasks.length < MAX_WORKERS) ? tasks.length : MAX_WORKERS;
    var code;
    if (typeof(fun) != "string")
        code = fun.toString();
    else
        code = fun;

    code =  "var fun = " + code + "; self.onmessage = "+
            "function(event) { self.postMessage([fun(event.data[0]), event.data[1]]); }";
    //console.log("kernel is: "+code);
    var bb = new BlobBuilder();
    bb.append(code);
    //var code_encoded = "data:text/javascript,"+encodeURIComponent(code);
    var code_encoded = window.URL.createObjectURL(bb.getBlob());
    //console.log("encoded is "+code_encoded);

    var remaining = ls.length;
    var workers = [];
    var workersOut = 0;
    var w;
    var results = [];
    for(w = 0; w < max_workers; w++) {
        workers[w] = new Worker(code_encoded);
        //console.log("Spawning "+w);
        workers[w].onmessage = (function () {
            var myId = w;
            return function(event) {
                var result = event.data[0];
                var id = event.data[1];
                //console.log(myId + ": "+event.data.toString());
                results[id] = result;
                if(remaining > 0) {
                    workers[myId].postMessage([ls.pop(), --remaining]);
                }
                else if(remaining === 0 && workersOut === 1) {
                    callback(results);
                } else {
                    workersOut --;
                }
            }
        })();
    }
    for(w = 0; w < max_workers; w++) {
        workersOut++;
        workers[w].postMessage([ls.pop(), --remaining]);
    }
}
