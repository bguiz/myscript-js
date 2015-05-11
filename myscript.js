(function MyscriptJsSetup() {
  'use strict';

  // Export as AMD/ CommonJs
  if (typeof define === 'function' && define.amd) {
    define(
      ['./myscript-writing', './myscript-recogniser'],
      function(writing, recogniser) {
        var MyscriptJs = {
          writing: writing,
          recogniser: recogniser,
        };
        return MyscriptJs;
      });
  }
  else if (typeof module !== 'undefined') {
    var MyscriptJs = {
      writing: require('./myscript-writing'),
      recogniser: require('./myscript-recogniser'),
    };
    module.exports = MyscriptJs;
  }
  else {
    // Do nothing, each file exports individually, thus each must be added
  }
})();
