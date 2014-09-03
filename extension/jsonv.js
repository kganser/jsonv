// Copyright 2014, Klaus Ganser <http://kganser.com>
// MIT Licensed, with this copyright and permission notice
// <http://opensource.org/licenses/MIT>

var jsml = (function(node, parent) {
  var attr = function(node, parent) {
    Object.keys(node).forEach(function(k) {
      if (k == 'children') return;
      var n = node[k];
      if (typeof parent[k] == 'undefined' || typeof n != 'object' || n == null)
        return parent[k] = n;
      attr(n, parent[k], true);
    });
    return node.children;
  };
  
  return function(node, parent) {
    switch (typeof node) {
      case 'object':
        if (!node) return;
        if (Array.isArray(node)) {
          node.forEach(function(node) { jsml(node, parent); });
          return parent;
        }
        var tag = Object.keys(node)[0],
            elem = document.createElement(tag);
        if (parent) parent.appendChild(elem); 
        node = node[tag];
        jsml(typeof node == 'object' && node && !Array.isArray(node) ? attr(node, elem) : node, elem);
        return elem;
      case 'function':
        return jsml(node(parent), parent);
      case 'string':
      case 'number':
        node = document.createTextNode(node);
        return parent ? parent.appendChild(node) : node;
    }
  };
})();

var jsonv = function(data) {
  var type = Array.isArray(data) ? 'array' : typeof data == 'object' ? data ? 'object' : 'null' : typeof data;
  return {span: {className: 'jsonv-'+type, children: type == 'array'
    ? {ol: data.map(function(e) { return {li: [jsonv(e)]}; })}
    : type == 'object'
      ? {ul: Object.keys(data).map(function(key) { return {li: [{span: {className: 'jsonv-key', children: key}}, jsonv(data[key])]}; })}
      : String(data)}};
};

try {
  var data = JSON.parse(document.body.textContent);
  document.body.innerHTML = '';
  jsml([
    {link: {rel: 'stylesheet', href: chrome.runtime.getURL('jsonv.css')}},
    {div: {className: 'jsonv', children: jsonv(data), onclick: function(e) {
      var t = e.target, c = t.className;
      if (c == 'jsonv-object' || c == 'jsonv-array')
        t.className += ' closed';
      else if (c == 'jsonv-object closed' || c == 'jsonv-array closed')
        t.className = c.split(' ')[0];
    }}}
  ], document.body);
} catch (e) {}