'use strict';
/* global sunRest */
sunRest.factory('sunRestRouter', function (sunRestConfig) {
  /**
   * This method is intended for encoding *key* or *value* parts of query component. We need a
   * custom method because encodeURIComponent is too aggressive and encodes stuff that doesn't
   * have to be encoded per http://tools.ietf.org/html/rfc3986:
   *    query       = *( pchar / '/' / '?' )
   *    pchar         = unreserved / pct-encoded / sub-delims / ':' / '@'
   *    unreserved    = ALPHA / DIGIT / '-' / '.' / '_' / '~'
   *    pct-encoded   = '%' HEXDIG HEXDIG
   *    sub-delims    = '!' / '$' / '&' / ''' / '(' / ')'
   *                     / '*' / '+' / ',' / ';' / '='
   */
  function encodeUriQuery(val, pctEncodeSpaces) {
    return encodeURIComponent(val).
      replace(/%40/gi, '@').
      replace(/%3A/gi, ':').
      replace(/%24/g, '$').
      replace(/%2C/gi, ',').
      replace(/%20/g, (pctEncodeSpaces ? '%20' : '+'));
  }

  /**
   * We need our custom method because encodeURIComponent is too aggressive and doesn't follow
   * http://www.ietf.org/rfc/rfc3986.txt with regards to the character set (pchar) allowed in path
   * segments:
   *    segment       = *pchar
   *    pchar         = unreserved / pct-encoded / sub-delims / ':' / '@'
   *    pct-encoded   = '%' HEXDIG HEXDIG
   *    unreserved    = ALPHA / DIGIT / '-' / '.' / '_' / '~'
   *    sub-delims    = '!' / '$' / '&' / ''' / '(' / ')'
   *                     / '*' / '+' / ',' / ';' / '='
   */
  function encodeUriSegment(val) {
    return encodeUriQuery(val, true).
      replace(/%26/gi, '&').
      replace(/%3D/gi, '=').
      replace(/%2B/gi, '+');
  }

  /**
   * @class sunRestRouter
   * @name sunRest.sunRestRouter
   * @param template
   * @param defaults
   */
  function sunRestRouter(template, defaults) {
    if (template) {
      if (template[template.length - 1] === '/')
        template = template.slice(0, -1);
    }
    this.template = template;
    this.defaults = defaults || {};
    this.urlParams = {};
  }

  sunRestRouter.prototype.buildConfig = function (config, params, actionUrl) {
    params = params || {};
    var url,
      urlParams;
    url = this._normalizeUrl(actionUrl || params.url);
    url = this._injectParams(url, params);


    // strip trailing slashes and set the url
    if (sunRestConfig.trailingSlashes === false) {
      url = url.slice(0, url.length - 1) || '/';
    }

    // then replace collapse `/.` if found in the last URL path segment before the query
    // E.g. `http://url.com/id./format?q=x` becomes `http://url.com/id.format?q=x`
    url = url.replace(/\/\.(?=\w+($|\?))/, '.');
    // replace escaped `/\.` with `/.`
    config.url = url.replace(/\/\\\./, '/.');


    // set params - delegate param encoding to $http
    angular.forEach(params, function (value, key) {
      if (!urlParams[key]) {
        config.params = config.params || {};
        config.params[key] = value;
      }
    });
    return config;
  };

  sunRestRouter.prototype._extractUrlParams = function _extractUrlParams(url) {
    var urlParams = {};

    angular.forEach(url.split(/\W/), function (param) {
      if (param === 'hasOwnProperty') {
        throw new Error('hasOwnProperty is not a valid parameter name.');
      }
      if (!(new RegExp('^\\d+$').test(param)) && param && (new RegExp('(^|[^\\\\]):' + param + '(\\W|$)').test(url))) {
        urlParams[param] = true;
      }
    });
    return urlParams;
  };

  sunRestRouter.prototype._prependBaseUrl = function (url) {
    if (url[0] === '/') {
      url = sunRestConfig.baseUrl + url + '/';
    }
    else {
      url = url + '/';
    }
    return url;
  };

  sunRestRouter.prototype._normalizeUrl = function _normalizeUrl(actionUrl) {
    var url;
    if (actionUrl && actionUrl.indexOf('^') === 0) {
      url = actionUrl.slice(1);
    } else {
      url = this.template;
      if (actionUrl) {
        if (actionUrl[actionUrl.length - 1] === '/' && actionUrl.length !== 1) {
          actionUrl = actionUrl.slice(0, -1);
        }
        if (actionUrl[0] === '/') {
          url = actionUrl;
        } else {
          url = this.template + '/' + actionUrl;
        }
      }
      url = this._prependBaseUrl(url);
    }
    return url;
  };

  sunRestRouter.prototype._injectParams = function _injectParams(url, params) {
    var val, encodedVal,
      urlParams = this._extractUrlParams(url);

    angular.forEach(urlParams, function (_, urlParam) {
      val = params.hasOwnProperty(urlParam) ? params[urlParam] : this.defaults[urlParam];
      if (angular.isDefined(val) && val !== null) {
        encodedVal = encodeUriSegment(val);
        url = url.replace(new RegExp(':' + urlParam + '(\\W|$)', 'g'), encodedVal + '$1');
      } else {
        url = url.replace(new RegExp('(\/?):' + urlParam + '(\\W|$)', 'g'),
          function (match, leadingSlashes, tail) {
            if (tail.charAt(0) === '/') {
              return tail;
            }
            return leadingSlashes + tail;
          });
      }
    }, this);
    return url;
  };


  return sunRestRouter;
});
sunRest.factory('sunRestRouterNested', function (sunRestConfig, sunRestRouter, sunRestUtils) {
  function SunRestRouterNested(parentRouter, parentDefaults, template, defaults) {
    this.$super.constructor.call(this, template, defaults);
    this.parentRouter = Object.create(parentRouter);
    this.parentRouter.defaults = parentDefaults;
    this.parentRouter._prependBaseUrl = _.identity;
  }

  sunRestUtils.inherit(SunRestRouterNested, sunRestRouter);

  SunRestRouterNested.prototype._prependBaseUrl = function (url) {
    var parentUrl = this.parentRouter.buildConfig();
    var fullUrl = parentUrl + "/" + url

  };


  return SunRestRouterNested;

});



