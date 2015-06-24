/* globals console, angular */
'use strict';

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('myscript-writing', [
      ], factory);
  }
  else if (typeof exports === 'object') {
    module.exports = factory(
      );
  }
  else {
    root.MyscriptRecogniser = factory(
      );
  }
})(this, MyscriptRecogniserSetup);

function MyscriptRecogniserSetup() {
  return MyscriptRecogniser;

  function MyscriptRecogniser() {

    function getApiUrl(inputType) {
      // TODO switch to new input types
      return 'https://cloud.myscript.com/api/v3.0/recognition/rest/'+
        // inputType+ //TODO re-enable this
        'math'+
        '/doSimpleRecognition.json';
    }

    function getApiKey() {
      // Get your own API key from https://cloud.myscript.com/
      return window.MYSCRIPT_API_KEY || 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    }

    function processStrokeList(strokes) {
      return strokes.map(function(stroke, idx) {
        return {
          type: 'stroke',
          x: stroke.xs,
          y: stroke.ys,
        };
      });
    }

    function processStrokesForEquation(strokes) {
      return {
        applicationKey: getApiKey(),
        mathInput: JSON.stringify({
          resultTypes:['LATEX', 'MATHML'],
          components: processStrokeList(strokes),
        }),
      };
    }

    function transformObjectToWwwFormUrlEncoded(data) {
      var keyVals = [];
      for (var key in data) {
        keyVals.push(encodeURIComponent(key)+'='+encodeURIComponent(data[key]));
      }
      return keyVals.join('&');
    }

    function recogniseEquation(strokes, callback) {
      var data = transformObjectToWwwFormUrlEncoded(processStrokesForEquation(strokes));
      var xhr = new XMLHttpRequest();
      xhr.open('POST', getApiUrl('equation'), true);
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.withCredentials = true;
      xhr.onreadystatechange = onXhrStateChange;
      xhr.msCaching = 'disabled';
      xhr.send(data);
      console.log('recogniseEquation sent', data);

      function onXhrStateChange() {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            var data;
            if (typeof xhr.response === 'string') {
              data = JSON.parse(xhr.response);
            }
            else {
              data = xhr.response;
            }
            callback(undefined, {
              data: data,
              request: xhr,
            });
          }
          else {
            callback(xhr);
          }
        }
      }
    }

    function recognise(recogniseType, strokes, callback) {
      switch (recogniseType) {
        case 'equation':
          return recogniseEquation(strokes, callback);
        default:
          // Return a promise that rejects immediately
          return callback('Recognise type unsupported: '+recogniseType);
      }
    }

    return {
      recognise: recognise,
    };
  }
}
