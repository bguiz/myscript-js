/* globals console, angular */
'use strict';

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('myscript-writing', [
      'handwriting'
      ], factory);
  }
  else if (typeof exports === 'object') {
    module.exports = factory(
      require('handwriting')
      );
  }
  else {
    root.MyscriptWriting = factory(
      root.Handwriting
      );
  }
})(this, MyscriptWritingSetup);

function MyscriptWritingSetup(Handwriting) {
  return MyscriptWriting;

  function MyscriptWriting(context) {
    validateContext(context);

    var recogniseType;
    var currentStroke;
    var currentSvgPathElement;
    var strokes;
    var undoStrokes;

    // Intialise dependencies
    var handwriting;
    if (typeof Handwriting === 'function') {
      handwriting = Handwriting();
    }

    // initialise listeners
    disableBounce(true);
    enableButtonListeners(true);
    enableStrokeListeners(true, false, false);

    // intialise state
    strokes = [];
    undoStrokes = [];
    resetStrokes();
    resetCurrentStroke();

    function resetStrokes() {
      // Clear the array without using a new object
      strokes.length = 0;
      while (!!context.elements.svg.firstChild) {
        context.elements.svg.removeChild(context.elements.svg.firstChild);
      }
    }

    function resetCurrentStroke() {
      currentStroke = {
        xs: [],
        ys: [],
        path: '',
      };

      currentSvgPathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      currentSvgPathElement.setAttribute('class', context.options.stroke.attributes.class);
      currentSvgPathElement.setAttribute('style', context.options.stroke.attributes.style);
    }

    function addCurrentPos(lineType, evt) {
      var point = (!!evt.touches && !!evt.touches[0]) ? evt.touches[0] : evt;

      var x = 0;
      var y = 0;

      // When using `position: absolute`, we cannot rely on
      // `context.elements.svg.ownerDocument.{offsetLeft,offsetTop}`
      // properties to be set correctly,
      // so we have to compute it in full each time
      var rect = context.elements.svg.getBoundingClientRect();
      if (rect.width || rect.height || context.elements.svg.getClientRects().length) {
        var doc = context.elements.svg.ownerDocument;
        var docElement = doc.documentElement;

        //TODO investigate whether `window` could be something else
        x -= (rect.left + window.pageXOffset + docElement.clientLeft);
        y -= (rect.top  + window.pageYOffset +  docElement.clientTop);
      }

      // Next get the X, Y coordinates of the point clicked on within the page
      // and subtract the coordinates opf the SVG element from it.
      if (point.pageX || point.pageY)   {
        x += point.pageX;
        y += point.pageY;
      }
      else if (point.clientX || point.clientY)  {
        x +=
          point.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        y +=
          point.clientY + document.body.scrollTop + document.documentElement.scrollTop;
      }

      // Huzzah!
      // We have fought the good fight battling various cross browser issues,
      // and have finally arrived at a consistent result!
      // We can now add the computed coordinates to the current stroke data,
      // and append tio the SVG path.
      x = parseInt(x, 10);
      y = parseInt(y, 10);
      currentStroke.xs.push(x);
      currentStroke.ys.push(y);
      currentStroke.path += lineType+' '+x+' '+y+' ';
      currentSvgPathElement.setAttribute('d', currentStroke.path);
    }

    function enableStrokeListeners(start, move, end) {
      var method;

      method = (!!start) ? 'addEventListener' : 'removeEventListener';
      context.elements.svg[method]('mousedown', startStroke, false);
      context.elements.svg[method]('touchstart', startStroke, false);

      method = (!!move) ? 'addEventListener' : 'removeEventListener';
      context.elements.svg[method]('mousemove', moveStroke, false);
      context.elements.svg[method]('touchmove', moveStroke, false);

      method = (!!end) ? 'addEventListener' : 'removeEventListener';
      context.elements.svg[method]('mouseup', endStroke, false);
      context.elements.svg[method]('touchend', endStroke, false);
      context.elements.svg[method]('mouseout', endStroke, false);
      context.elements.svg[method]('touchleave', endStroke, false);
    }

    function enableButtonListeners(listen) {
      var method = (!!listen) ? 'addEventListener' : 'removeEventListener';

      context.elements.doneButton[method]('mouseup', onDone, false);
      context.elements.doneButton[method]('touchend', onDone, false);
      context.elements.cancelButton[method]('mouseup', onCancel, false);
      context.elements.cancelButton[method]('touchend', onCancel, false);
      context.elements.undoButton[method]('mouseup', onUndo, false);
      context.elements.undoButton[method]('touchend', onUndo, false);
      context.elements.redoButton[method]('mouseup', onRedo, false);
      context.elements.redoButton[method]('touchend', onRedo, false);
    }

    function disableBounce(listen) {
      // Do this to disable "bounce" - dragging the page down on a touch device
      // beyond  its actual min top coordinate in order to refresh it -
      // by killing all `touchmove` events pre-emptively.
      // This should be conditionally re-enabled if necessary.
      // Also, in IE, this fails to have the intended effect,
      // and a CSS property is necessary in its place:
      //
      // ```
      // .myscript-writing-svg-container {
      //   -ms-touch-action: none;
      //   touch-action: none;
      // }
      // ```

      var method = (!!listen) ? 'addEventListener' : 'removeEventListener';

      //NOTE consider adding a conditional check around this such as `if (!evt.target.hasClass('draggable')) { ... }`
      context.elements.svgContainer[method]('touchmove', disableEventPropagation);
    }

    function disableEventPropagation(evt) {
      evt.preventDefault();
      evt.stopImmediatePropagation();
      evt.stopPropagation();
    }

    function startStroke(evt) {
      disableEventPropagation(evt);

      // Start a new stroke
      resetCurrentStroke();
      addCurrentPos('M', evt);
      strokes.push(currentStroke);
      context.elements.svg.appendChild(currentSvgPathElement);

      // Once a new stroke has begun, wipe the undo stack
      undoStrokes.length = 0;

      // Next: only allow move stroke and end stroke
      enableStrokeListeners(false, true, true);
    }

    function moveStroke(evt) {
      disableEventPropagation(evt);

      //append to current stroke
      addCurrentPos('L', evt);
      if (currentStroke.xs.length % context.options.simplify.onMoveInterval === 0) {
        // When there
        simplifyCurrentStroke(false);
      }

      // Next: continue with move stroke and end stroke (no change required)
    }

    function simplifyCurrentStroke(isHighQuality) {
      if (!!context.options.simplify.skip) {
        return; // Skip simplification step
      }
      var pointsCount = currentStroke.xs.length;
      if (pointsCount > context.options.simplify.minimumPointsCount &&
          typeof window.simplify === 'function') {
        var points = [];
        for (var i = 0; i < pointsCount; ++i) {
          points.push({
            x: currentStroke.xs[i],
            y: currentStroke.ys[i],
          });
        }
        try {
          var newPoints = window.simplify(points, context.options.simplify.tolerance, isHighQuality);
          currentStroke.simplified = {
            xs: new Array(newPoints.length),
            ys: new Array(newPoints.length),
          };
          var newSvgPathString = 'M '+newPoints[0].x+' '+newPoints[0].y+' ';
          currentStroke.simplified.xs[0] = newPoints[0].x;
          currentStroke.simplified.ys[0] = newPoints[0].y;
          for (var j = 1; j < newPoints.length; ++j) {
            newSvgPathString += 'L '+newPoints[j].x+' '+newPoints[j].y+' ';
            currentStroke.simplified.xs[j] = newPoints[j].x;
            currentStroke.simplified.ys[j] = newPoints[j].y;
          }
          currentStroke.path = newSvgPathString;
          currentSvgPathElement.setAttribute('d', currentStroke.path);
        }
        catch (ex) {
          console.log(ex);
        }
      }
    }

    function recognisePreemptive() {
      if (!handwriting) {
        return;
      }

      //TODO pass in most recent few strokes based on time lapsed -
      // strokes that are close tgether are likely to belong to the same character.
      // For now, we only send the most recent stroke,
      // since we only care about scribbles for now.
      var inputStrokes;
      if (currentStroke.simplified) {
        inputStrokes = [currentStroke.simplified];
      }
      else {
        inputStrokes = [currentStroke];
      }

      var recognisedWriting;
      try {
        recognisedWriting = handwriting.recognisePoints(inputStrokes);
        console.log('recognisedWriting', recognisedWriting);
      }
      catch (ex) {
        console.log(ex, ex.stack);
      }

      return recognisedWriting;
    }

    /**
     * Finds any recent strokes that intersect a minimum number of times with the current stroke,
     * and remove them.
     *
     * Assumes that the current stroke is a cancellation scribble.
     */
    function scribbleOutFromCurrentStroke() {
      var scribbleRect = currentSvgPathElement.getBBox();
      onUndo();
      var didIntersect = true;
      var idx = context.elements.svg.children.length - 1;
      while (didIntersect && idx >= 0) {
        var pathElement = context.elements.svg.children[idx];
        var pathRect = pathElement.getBBox();

        var areaIntersect =
          Math.max(0, Math.max(scribbleRect.x + scribbleRect.width, pathRect.x + pathRect.width) -
            Math.min(scribbleRect.x, pathRect.x)) *
          Math.max(0, Math.max(scribbleRect.y + scribbleRect.height, pathRect.y + pathRect.height) -
            Math.min(scribbleRect.y, pathRect.y));

        var percentageIntersect =
          areaIntersect / (pathRect.width * pathRect.height);
        didIntersect = percentageIntersect >= 0.5;
        if (didIntersect) {
          onUndo();
        }
        --idx;
      }
      // Once we find the first one that does not intersect, we stop looking -
      // scribbling only works for recent most strokes
    }

    function endStroke(evt) {
      disableEventPropagation(evt);

      //end the current stroke
      simplifyCurrentStroke(true);

      //attempt to recognise certain strokes pre-emptively
      var recognisedCharacter = recognisePreemptive();
      if ( !!recognisedCharacter && !!recognisedCharacter.character &&
        ( /^scribble-\d+/ ).test(recognisedCharacter.character.name) ) {
        //recognised a scribble, work out if we can delete other characters underneath this one
        scribbleOutFromCurrentStroke();
      }

      // Next: only allow start stroke
      enableStrokeListeners(true, false, false);
    }

    function onDone() {
      console.log('onDone');
      //clean up all strokes and submit them
      enableStrokeListeners(false);
      enableButtonListeners(false);
      context.callbacks.recognise(context.recogniseType, strokes, function onRecognise(err, data) {
        enableStrokeListeners(true);
        enableButtonListeners(true);
        if (!err) {
          resetStrokes();
        }
        else {
          context.callbacks.onRecogniseFailure(err);
        }
      });
    }

    function onCancel() {
      console.log('onCancel');
      //clean up all strokes discard them
      resetStrokes();

      context.callbacks.onCancel();
    }

    function onDestroy() {
      resetStrokes();

      strokes = undefined;
      currentStroke = undefined;
      currentSvgPathElement = undefined;

      disableBounce(false);
      enableButtonListeners(false);
      enableStrokeListeners(false, false, false);
    }

    function onUndo() {
      console.log('onUndo');
      if (strokes.length > 0) {
        var undoneStroke = strokes.pop();
        undoStrokes.push(undoneStroke);
        resetCurrentStroke();
        context.elements.svg.removeChild(context.elements.svg.lastChild);
      }
    }

    function onRedo() {
      console.log('onRedo');
      if (undoStrokes.length > 0) {
        var redoneStroke = undoStrokes.pop();
        resetCurrentStroke();
        currentStroke = redoneStroke;
        strokes.push(currentStroke);
        currentSvgPathElement.setAttribute('d', currentStroke.path);
        context.elements.svg.appendChild(currentSvgPathElement);
      }
    }

    return {
      hooks: {
        onDestroy: onDestroy,
      },
    };
  }

  function validateContext(context) {
    if (!context) {
      throw new Error('Must supply context');
    }
    if (!context.elements) {
      // Construct elements from default class name, and throw if not found
      context.elements = {};
    }
    [
      'svg',
      'svgContainer',
      'doneButton',
      'cancelButton',
      'undoButton',
      'redoButton'
    ].forEach(function(name) {
      if (isUndefined(context.elements[name])) {
        throw new Error('Must supply context.elements.'+name);
      }
    });
    if (!context.options) {
      // Use default elements
      context.options = {};
    }
    if (!context.options.pad) {
      context.options.pad = {};
    }
    if (!context.options.pad.animation) {
      context.options.pad.animation = {};
    }
    [
      'appear',
      'disappear'
    ].forEach(function(name) {
      if (isUndefined(context.options.pad.animation[name])) {
        throw new Error('Must supply context.options.pad.animation.'+name);
      }
    });
    if (!context.options.stroke) {
      context.options.stroke = {};
    }
    if (!context.options.simplify) {
      context.options.simplify = {};
    }
    [
      'skip',
      'tolerance',
      'onMoveInterval',
      'minimumPointsCount'
    ].forEach(function(name) {
      if (isUndefined(context.options.simplify[name])) {
        throw new Error('Must supply context.options.simplify.'+name);
      }
    });
    [
      'attributes'
    ].forEach(function(name) {
      if (isUndefined(context.options.stroke[name])) {
        throw new Error('Must supply context.options.stroke.'+name);
      }
    });
    if (!context.callbacks) {
      // Simply use no-op callbacks
      context.callbacks = {};
    }
    [
      'recognise',
      'onRecogniseSuccess',
      'onRecogniseFailure'
    ].forEach(function(name) {
      if (isUndefined(context.callbacks[name])) {
        throw new Error('Must supply context.callbacks.'+name);
      }
    });
  }

  function isUndefined(thing) {
    return (typeof thing === 'undefined');
  }
}
