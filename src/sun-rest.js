/**
 * Created by root on 1/25/14.
 */
'use strict';
/**
 * @name sunRest
 */
var sunRest = angular.module('sun.rest', ['sun.utils']);
var isDefined = angular.isDefined,
  isFunction = angular.isFunction,
  isString = angular.isString,
  isObject = angular.isObject,
  isArray = angular.isArray,
  forEach = angular.forEach,
  extend = angular.extend,
  copy = angular.copy;
function isWindow(obj) {
  return obj && obj.document && obj.location && obj.alert && obj.setInterval;
}
function isArrayLike(obj) {
  if (obj == null || isWindow(obj)) {
    return false;
  }

  var length = obj.length;

  if (obj.nodeType === 1 && length) {
    return true;
  }

  return isString(obj) || isArray(obj) || length === 0 ||
    typeof length === 'number' && length > 0 && (length - 1) in obj;
}

function $watchCollection(objGetter, listener) {
  var self = this;
  // the current value, updated on each dirty-check run
  var newValue;
  // a shallow copy of the newValue from the last dirty-check run,
  // updated to match newValue during dirty-check run
  var oldValue;
  // a shallow copy of the newValue from when the last change happened
  var veryOldValue;
  // only track veryOldValue if the listener is asking for it
  var trackVeryOldValue = (listener.length > 1);
  var changeDetected = 0;
  //  var objGetter = $parse(obj);
  var internalArray = [];
  var internalObject = {};
  var initRun = true;
  var oldLength = 0;

  function $watchCollectionWatch() {
    newValue = objGetter(self);
    var newLength, key;

    if (!isObject(newValue)) { // if primitive
      if (oldValue !== newValue) {
        oldValue = newValue;
        changeDetected++;
      }
    } else if (isArrayLike(newValue)) {
      if (oldValue !== internalArray) {
        // we are transitioning from something which was not an array into array.
        oldValue = internalArray;
        oldLength = oldValue.length = 0;
        changeDetected++;
      }

      newLength = newValue.length;

      if (oldLength !== newLength) {
        // if lengths do not match we need to trigger change notification
        changeDetected++;
        oldValue.length = oldLength = newLength;
      }
      // copy the items to oldValue and look for changes.
      for (var i = 0; i < newLength; i++) {
        var bothNaN = (oldValue[i] !== oldValue[i]) &&
          (newValue[i] !== newValue[i]);
        if (!bothNaN && (oldValue[i] !== newValue[i])) {
          changeDetected++;
          oldValue[i] = newValue[i];
        }
      }
    } else {
      if (oldValue !== internalObject) {
        // we are transitioning from something which was not an object into object.
        oldValue = internalObject = {};
        oldLength = 0;
        changeDetected++;
      }
      // copy the items to oldValue and look for changes.
      newLength = 0;
      for (key in newValue) {
        if (newValue.hasOwnProperty(key)) {
          newLength++;
          if (oldValue.hasOwnProperty(key)) {
            if (oldValue[key] !== newValue[key]) {
              changeDetected++;
              oldValue[key] = newValue[key];
            }
          } else {
            oldLength++;
            oldValue[key] = newValue[key];
            changeDetected++;
          }
        }
      }
      if (oldLength > newLength) {
        // we used to have more keys, need to find them and destroy them.
        changeDetected++;
        for (key in oldValue) {
          if (oldValue.hasOwnProperty(key) && !newValue.hasOwnProperty(key)) {
            oldLength--;
            delete oldValue[key];
          }
        }
      }
    }
    return changeDetected;
  }

  function $watchCollectionAction() {
    if (initRun) {
      initRun = false;
      listener(newValue, newValue, self);
    } else {
      listener(newValue, veryOldValue, self);
    }

    // make a copy for the next time a collection is changed
    if (trackVeryOldValue) {
      if (!isObject(newValue)) {
        //primitive
        veryOldValue = newValue;
      } else if (isArrayLike(newValue)) {
        veryOldValue = new Array(newValue.length);
        for (var i = 0; i < newValue.length; i++) {
          veryOldValue[i] = newValue[i];
        }
      } else { // if object
        veryOldValue = {};
        for (var key in newValue) {
          if (hasOwnProperty.call(newValue, key)) {
            veryOldValue[key] = newValue[key];
          }
        }
      }
    }
  }

  return this.$watch($watchCollectionWatch, $watchCollectionAction);
}


