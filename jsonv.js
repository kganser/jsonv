// Copyright 2014, Klaus Ganser <http://kganser.com>
// MIT Licensed, with this copyright and permission notice
// <http://opensource.org/licenses/MIT>

var jsonv = function() {
  var jsml = function() {
    var jsml, attr = function(node, parent) {
      Object.keys(node).forEach(function(k) {
        if (k == 'children') return;
        var n = node[k];
        if (typeof parent[k] == 'undefined' || typeof n != 'object' || n == null)
          return parent[k] = n;
        attr(n, parent[k], true);
      });
      return node.children;
    };
    return jsml = function(node, parent, clear) {
      if (clear && parent) while (parent.firstChild) parent.removeChild(parent.firstChild);
      switch (typeof node) {
        case 'object': // Object, Array, or null
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
  }();
  var json = function(data) {
    var type = Array.isArray(data) ? 'array' : typeof data == 'object' ? data ? 'object' : 'null' : typeof data;
    if (type == 'object') {
      var data_ = {};
      Object.keys(data).sort().forEach(function(key) { data_[key] = data[key]; });
      data = data_;
    }
    return {span: {className: 'jsonv-'+type, children: type == 'array'
      ? {ol: data.map(function(e) { return {li: [{span: {className: 'jsonv-delete', children: '×'}}, json(e)]}; })}
      : type == 'object'
        ? {ul: Object.keys(data).map(function(key) {
            return {li: [
              {span: {className: 'jsonv-delete', children: '×'}},
              {span: {className: 'jsonv-key', children: key}}, ': ', json(data[key])
            ]};
          })}
        : String(data)}};
  };
  var scalars = {'jsonv-string': 1, 'jsonv-number': 1, 'jsonv-boolean': 1, 'jsonv-null': 1},
      compounds = {LI: 1, OL: 1, UL: 1};
  // TODO: implement sort on arrays
  // TODO: pending request indicator
  // TODO: pagination for objects, arrays
  var handler = function(listener, data, self) {
    return self = {
      data: data,
      object: function(elem) {
        return elem.parentNode.parentNode.parentNode.className == 'jsonv-object';
      },
      parent: function() {
        var parent = self.data;
        self.path.slice(0, -1).forEach(function(key) { parent = parent[key]; });
        return parent;
      },
      cancel: function(elem) {
        if (self.path && self.origType) { // revert if editing
          elem.contentEditable = false;
          elem.className = self.origType;
          elem.textContent = self.origValue;
        } else { // remove if adding
          elem.parentNode.parentNode.removeChild(elem.parentNode);
        }
        self.path = self.origType = self.origValue = null;
      },
      submit: function(elem) {
        if (!self.path) return;
        var origJson = self.origType == 'jsonv-string' ? JSON.stringify(self.origValue) : self.origValue;
        if (self.origType && elem.textContent == origJson) { // value unchanged
          elem.textContent = self.origValue;
          elem.contentEditable = false;
          self.path = self.origType = self.origValue = null;
        } else {
          var method = 'insert',
              object = self.object(elem),
              value = elem.innerHTML.replace(/<br\s*\/?>/ig, '\n').replace(/<[^>]>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'),
              item = elem.parentNode,
              parent = self.parent(),
              key = self.path.pop();
          try { value = JSON.parse(value); } catch (e) {}
          if (self.origType || object) {
            if (!self.origType) {
              key = item.children[1].textContent;
              var swap = key in parent;
            }
            method = 'put';
            parent[key] = value;
          } else {
            parent.splice(key, 0, value);
          }
          listener(method, self.path.concat([key]).map(encodeURIComponent).join('/'), value);
          // reset must be done before DOM changes (?) to prevent double-submit on keydown and blur
          self.path = self.origType = self.origValue = null;
          item.children[1].contentEditable = false;
          if (object) { // move into position alphabetically
            var list = item.parentNode,
                i = Object.keys(parent).sort().indexOf(key);
            if (swap) {
              list.removeChild(item);
              elem = list.children[i].children[2];
            } else if (item != list.children[i]) {
              list.insertBefore(list.removeChild(item), list.children[i]);
            }
          }
          elem.parentNode.replaceChild(jsml(json(value)), elem);
        }
      },
      handleEvent: function(e) {
        var t = e.target,
            c = t.className;
        switch (e.type) {
          case 'click':
            if (c == 'jsonv-object' || c == 'jsonv-array') {
              t.classList.add('closed');
            } else if (c == 'jsonv-object closed' || c == 'jsonv-array closed') {
              t.classList.remove('closed');
            } else if (listener && t.contentEditable != 'true' && (c in scalars || c == 'jsonv-delete' || t.tagName in compounds)) {
              var item = t;
              if (t.tagName in compounds) {
                if (item.tagName == 'LI') item = t.parentNode;
                if (item.parentNode.classList.contains('closed')) return;
                if (item.tagName == 'OL') {
                  item = item.insertBefore(jsml({li: [
                    {span: {className: 'jsonv-delete', children: '×'}},
                    {span: {className: 'jsonv-null'}}
                  ]}), t.tagName == 'OL' ? t.firstChild : t.nextSibling);
                } else {
                  item = jsml({li: [
                    {span: {className: 'jsonv-delete', children: '×'}},
                    {span: {className: 'jsonv-key'}}, ': ',
                    {span: {className: 'jsonv-null'}}
                  ]}, item);
                }
                t = item.children[1];
              } else {
                item = t.parentNode;
                self.origType = c;
                self.origValue = t.textContent;
                if (c == 'jsonv-string') t.textContent = JSON.stringify(t.textContent);
              }
              if (c != 'jsonv-delete') {
                t.contentEditable = true;
                t.focus();
                document.execCommand('selectAll', false, null);
              }
              self.path = [];
              while (item != e.currentTarget) {
                self.path.unshift(item.children[1].className == 'jsonv-key'
                  ? item.children[1].textContent
                  : Array.prototype.indexOf.call(item.parentNode.children, item));
                item = item.parentNode.parentNode.parentNode; // li/root > span > ul/ol > li
              }
              if (c == 'jsonv-delete') {
                listener('delete', self.path.map(encodeURIComponent).join('/'));
                var parent = self.parent(),
                    key = self.path.pop();
                if (typeof key == 'number') parent.splice(key, 1);
                else delete parent[key];
                self.path = self.origType = self.origValue = null;
                t.parentNode.parentNode.removeChild(t.parentNode);
              }
            }
            break;
          case 'keydown':
            var esc = e.keyCode == 27,
                tab = e.keyCode == 9,
                enter = e.keyCode == 13,
                colon = e.keyCode == 186 || e.keyCode == 59 && e.shiftKey,
                key = c == 'jsonv-key';
            if (esc || !t.textContent && (tab || enter || key && colon)) { // cancel
              e.preventDefault();
              self.cancel(t);
            } else if (!key && (tab || enter) && !e.shiftKey) { // submit
              e.preventDefault();
              self.submit(t);
            } else if (key && t.textContent && (tab || enter || colon)) { // move to value
              e.preventDefault();
              e.stopPropagation();
              t.contentEditable = false;
              t.parentNode.lastChild.contentEditable = true;
              t.parentNode.lastChild.focus();
            } else if (self.object(t) && !key && (tab || enter) && e.shiftKey) { // move to key
              e.preventDefault();
              if (self.origType) {
                t.blur();
              } else {
                t.contentEditable = false;
                t.parentNode.children[1].contentEditable = true;
                t.parentNode.children[1].focus();
              }
            }
            break;
          case 'blur':
            if (c in scalars || c == 'jsonv-key') {
              self.focus = null;
              setTimeout(function() {
                var parent = t.parentNode;
                if (self.focus == parent) return;
                t = parent.lastChild;
                if (parent.children[1].textContent && t.textContent)
                  return self.submit(t);
                self.cancel(t);
              }, 0);
            }
            break;
          case 'focus':
            self.focus = e.target.parentNode;
            break;
        }
      }
    };
  };
  var click = handler();
  var jsonv = function(elem, data, listener) {
    if (data === undefined) data = JSON.parse(elem.textContent);
    if (listener) {
      listener = handler(typeof listener == 'function' ? listener : function() {}, JSON.parse(JSON.stringify(data)));
      elem.classList.add('jsonv-editable');
      elem.addEventListener('keydown', listener);
      elem.addEventListener('blur', listener, true);
      elem.addEventListener('focus', listener, true);
    }
    elem.classList.add('jsonv');
    elem.addEventListener('click', listener || click);
    jsml(json(data), elem, true);
    return {
      update: function(data) {
        if (listener) listener.data = JSON.parse(JSON.stringify(data));
        jsml(json(data), elem, true);
      }
    };
  };
  Array.prototype.forEach.call(document.getElementsByClassName('jsonv'), function(elem) {
    try { jsonv(elem); } catch (e) {}
  });
  return jsonv;
}();
