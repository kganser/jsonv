// Copyright 2014, Klaus Ganser <http://kganser.com>
// MIT Licensed, with this copyright and permission notice
// <http://opensource.org/licenses/MIT>

(window.kernel || {add: function(name, module) { window[name] = module(); }}).add('jsonv', function() {
  var html = function(data) {
    var type = Array.isArray(data) ? 'array' : typeof data == 'object' ? data ? 'object' : 'null' : typeof data;
    return '<span class="jsonv-'+type+'">'+(type == 'array'
      ? '<ol>'+data.map(function(e) { return '<li>'+html(e)+'</li>'; }).join('')+'</ol>'
      : type == 'object'
        ? '<ul>'+Object.keys(data).map(function(key) { return '<li><span class="jsonv-key">'+key.replace(/&/g, '&amp;').replace(/</g, '&lt;')+'</span>: '+html(data[key])+'</li>'; }).join('')+'</ul>'
        : String(data).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/^(https?:\/\/[^\s]+)$/, '<a href="$1">$1</a>')
    )+'</span>';
  };
  var listener = function(e) {
    var t = e.target, c = t.className;
    if (c == 'jsonv-object' || c == 'jsonv-array')
      t.className += ' closed';
    else if (c == 'jsonv-object closed' || c == 'jsonv-array closed')
      t.className = c.split(' ')[0];
  };
  var jsonv = function(elem) {
    elem.innerHTML = jsonv(JSON.parse(elem.textContent));
    elem.addEventListener('click', listener);
  };
  Array.prototype.forEach.call(document.getElementsByClassName('jsonv'), function(elem) {
    try { jsonv(elem); } catch (e) {}
  });
  return jsonv;
});
