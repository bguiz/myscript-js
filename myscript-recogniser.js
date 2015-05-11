(function MyscriptRecogniserSetup() {
  'use strict';

  // Export as AMD/ CommonJs/ `window` variable
  if (typeof define === 'function' && define.amd) {
    define(function() { return MyscriptRecogniser; });
  }
  else if (typeof module !== 'undefined') {
    module.exports = MyscriptRecogniser;
  }
  else if (typeof self !== 'undefined') {
    self.MyscriptRecogniser = MyscriptRecogniser;
  }
  else {
    window.MyscriptRecogniser = MyscriptRecogniser;
  }

  function MyscriptRecogniser() {

    function getApiUrl(inputType) {
      return 'https://myscript-webservices.visionobjects.com/api/myscript/v2.0/'+inputType+'/doSimpleRecognition.json';
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
        apiKey: getApiKey(),
        equationInput: JSON.stringify({
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
      var strokeData =
        transformObjectToWwwFormUrlEncoded( processStrokesForEquation(strokes) );

      var request = new XMLHttpRequest();
      request.open('POST', getApiUrl('equation'), true);
      request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');

      request.onload = function() {
        if (request.status >= 200 && request.status < 400) {
          // Success!
          var data = JSON.parse(request.responseText);
          callback(undefined, {
            data: data,
            request: request,
          });
        } else {
          // We reached our target server, but it returned an error
          callback(request);
        }
      };

      request.onerror = function(err) {
        // There was a connection error of some sort
        err = err || request;
        callback(err);
      };

      request.send(strokeData);

      // //NOTE myscript does not currently accept `application/json`,
      // //only `application/x-www-form-urlencoded`
      // return $http({
      //     method: 'POST',
      //     url: getApiUrl('equation'),
      //     headers: {
      //       'Content-Type': 'application/x-www-form-urlencoded'
      //     },
      //     data: strokeData,
      //   })
      //   .then(function(result) {
      //     //TODO process the result
      //     console.log(result);
      //     return result;
      //   });
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
})();
