// Copyright 2014, Klaus Ganser <http://kganser.com>
// MIT Licensed, with this copyright and permission notice
// <http://opensource.org/licenses/MIT>

if (location.protocol == 'chrome-extension:') {
  chrome.runtime.onConnect.addListener(function(client) {
    client.onMessage.addListener(function(json) {
      try {
        client.postMessage(function html(data) {
          var type = Array.isArray(data) ? 'array' : typeof data == 'object' ? data ? 'object' : 'null' : typeof data;
          return '<span class="jsonv-'+type+'">'+(type == 'array'
            ? '<ol><li class="jsonv-count">'+data.length+'</li>'+data.map(function(e) { return '<li>'+html(e)+'</li>'; }).join('')+'</ol>'
            : type == 'object'
              ? '<ul>'+Object.keys(data).map(function(key) { return '<li><span class="jsonv-key">'+key.replace(/&/g, '&amp;').replace(/</g, '&lt;')+'</span>: '+html(data[key])+'</li>'; }).join('')+'</ul>'
              : String(data).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/^(https?:\/\/[^\s]+)$/, '<a href="$1">$1</a>')
          )+'</span>';
        }(JSON.parse(json)));
      } catch (e) {}
    });
  });
} else {
  var background = chrome.runtime.connect(),
      json = document.body.textContent;
  //var start = Date.now();
  background.onMessage.addListener(function(html) {
    document.body.innerHTML = '<link rel="stylesheet" href="'+chrome.runtime.getURL('jsonv.css')+'"><div class="jsonv">'+html+'</div>';
    //console.log('time', Date.now()-start);
    document.body.appendChild(document.createElement('script')).textContent = 'json = '+json+';';
    document.onclick = function(e) {
      var t = e.target, c = t.className;
      if (c == 'jsonv-object' || c == 'jsonv-array')
        t.className += ' closed';
      else if (c == 'jsonv-object closed' || c == 'jsonv-array closed')
        t.className = c.split(' ')[0];
    };
    json = null;
  });
  background.postMessage(json);
}