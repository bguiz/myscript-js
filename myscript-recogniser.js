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

    var inputTypeDictionary = {
      digits: 'text',
    };

    function getApiUrl(inputType) {
      // TODO switch to new input types
      return 'https://cloud.myscript.com/api/v3.0/recognition/rest/'+
        (inputTypeDictionary[inputType] || inputType) +
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

    function processStrokesForMath(strokes) {
      return {
        mathInput: {
          resultTypes:['LATEX', 'MATHML'],
          components: processStrokeList(strokes),
        },
      };
    }

    function processStrokesForText_textInput(strokes) {
      var components = processStrokeList(strokes);
      return {
        inputUnits: [{
          textInputType: 'WORD',
          components: components,
        }],
        textParameter: {
          language: 'en_US',
        },
      };
    }

    function processStrokesForText(strokes) {
      var textInput = processStrokesForText_textInput(strokes);
      return {
        textInput: textInput,
      };
    }

    function processStrokesForDigits(strokes) {
      var textInput = processStrokesForText_textInput(strokes);
      textInput.textParameter.subsetKnowledges = ['digit'];
      return {
        textInput: textInput,
      };
    }

    var processStrokesDictionary = {
      math: processStrokesForMath,
      text: processStrokesForText,
      digits: processStrokesForDigits,
    };

    function processStrokesForAnyType(recogniseType, strokes) {
      var processFn = processStrokesDictionary[recogniseType];
      return processFn(strokes);
    }

    function transformObjectToWwwFormUrlEncoded(data) {
      data.applicationKey = getApiKey();
      var keyVals = [];
      var key, val;
      for (key in data) {
        val = data[key];
        val = typeof val === 'object' ? JSON.stringify(val) : val;
        keyVals.push(encodeURIComponent(key)+'='+encodeURIComponent(val));
      }
      return keyVals.join('&');
    }

    function recogniseEquation(strokes, callback) {
    }

    function recogniseAnyType(recogniseType, strokes, callback) {
      var data = transformObjectToWwwFormUrlEncoded(processStrokesForAnyType(recogniseType, strokes));
      var xhr = new window.XMLHttpRequest();
      xhr.open('POST', getApiUrl(recogniseType), true);
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.withCredentials = true;
      xhr.onreadystatechange = onXhrStateChange;
      xhr.msCaching = 'disabled';
      xhr.send(data);
      console.log('recognise sent', recogniseType, data);

      function onXhrStateChange() {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status <= 299) {
            var data;
            try {
              data = JSON.parse(xhr.response);
            }
            catch (ex) {
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
        case 'math':
        case 'text':
        case 'digits':
          // return recogniseEquation(strokes, callback);
          return recogniseAnyType(recogniseType, strokes, callback);
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
