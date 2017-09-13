/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _constantsConstants = require('../constants/Constants');

var _constantsConstants2 = _interopRequireDefault(_constantsConstants);

var _constantsMetricsConstants = require('../constants/MetricsConstants');

var _constantsMetricsConstants2 = _interopRequireDefault(_constantsMetricsConstants);

var _voMetricsList = require('../vo/MetricsList');

var _voMetricsList2 = _interopRequireDefault(_voMetricsList);

var _voMetricsTCPConnection = require('../vo/metrics/TCPConnection');

var _voMetricsTCPConnection2 = _interopRequireDefault(_voMetricsTCPConnection);

var _voMetricsHTTPRequest = require('../vo/metrics/HTTPRequest');

var _voMetricsRepresentationSwitch = require('../vo/metrics/RepresentationSwitch');

var _voMetricsRepresentationSwitch2 = _interopRequireDefault(_voMetricsRepresentationSwitch);

var _voMetricsBufferLevel = require('../vo/metrics/BufferLevel');

var _voMetricsBufferLevel2 = _interopRequireDefault(_voMetricsBufferLevel);

var _voMetricsBufferState = require('../vo/metrics/BufferState');

var _voMetricsBufferState2 = _interopRequireDefault(_voMetricsBufferState);

var _voMetricsDVRInfo = require('../vo/metrics/DVRInfo');

var _voMetricsDVRInfo2 = _interopRequireDefault(_voMetricsDVRInfo);

var _voMetricsDroppedFrames = require('../vo/metrics/DroppedFrames');

var _voMetricsDroppedFrames2 = _interopRequireDefault(_voMetricsDroppedFrames);

var _voMetricsManifestUpdate = require('../vo/metrics/ManifestUpdate');

var _voMetricsSchedulingInfo = require('../vo/metrics/SchedulingInfo');

var _voMetricsSchedulingInfo2 = _interopRequireDefault(_voMetricsSchedulingInfo);

var _coreEventBus = require('../../core/EventBus');

var _coreEventBus2 = _interopRequireDefault(_coreEventBus);

var _voMetricsRequestsQueue = require('../vo/metrics/RequestsQueue');

var _voMetricsRequestsQueue2 = _interopRequireDefault(_voMetricsRequestsQueue);

var _coreEventsEvents = require('../../core/events/Events');

var _coreEventsEvents2 = _interopRequireDefault(_coreEventsEvents);

var _coreFactoryMaker = require('../../core/FactoryMaker');

var _coreFactoryMaker2 = _interopRequireDefault(_coreFactoryMaker);

function MetricsModel() {

    var MAXIMUM_LIST_DEPTH = 1000;

    var context = this.context;
    var eventBus = (0, _coreEventBus2['default'])(context).getInstance();

    var instance = undefined,
        adapter = undefined,
        streamMetrics = undefined;

    function setup() {
        streamMetrics = {};
    }

    function setConfig(config) {
        if (!config) return;

        if (config.adapter) {
            adapter = config.adapter;
        }
    }

    function metricsChanged() {
        eventBus.trigger(_coreEventsEvents2['default'].METRICS_CHANGED);
    }

    function metricChanged(mediaType) {
        eventBus.trigger(_coreEventsEvents2['default'].METRIC_CHANGED, { mediaType: mediaType });
        metricsChanged();
    }

    function metricUpdated(mediaType, metricType, vo) {
        eventBus.trigger(_coreEventsEvents2['default'].METRIC_UPDATED, { mediaType: mediaType, metric: metricType, value: vo });
        metricChanged(mediaType);
    }

    function metricAdded(mediaType, metricType, vo) {
        eventBus.trigger(_coreEventsEvents2['default'].METRIC_ADDED, { mediaType: mediaType, metric: metricType, value: vo });
        metricChanged(mediaType);
    }

    function clearCurrentMetricsForType(type) {
        delete streamMetrics[type];
        metricChanged(type);
    }

    function clearAllCurrentMetrics() {
        streamMetrics = {};
        metricsChanged();
    }

    function getReadOnlyMetricsFor(type) {
        if (streamMetrics.hasOwnProperty(type)) {
            return streamMetrics[type];
        }

        return null;
    }

    function getMetricsFor(type) {
        var metrics = undefined;

        if (streamMetrics.hasOwnProperty(type)) {
            metrics = streamMetrics[type];
        } else {
            metrics = new _voMetricsList2['default']();
            streamMetrics[type] = metrics;
        }

        return metrics;
    }

    function pushMetrics(type, list, value) {
        var metrics = getMetricsFor(type);
        metrics[list].push(value);
        if (metrics[list].length > MAXIMUM_LIST_DEPTH) {
            metrics[list].shift();
        }
    }

    function addTcpConnection(mediaType, tcpid, dest, topen, tclose, tconnect) {
        var vo = new _voMetricsTCPConnection2['default']();

        vo.tcpid = tcpid;
        vo.dest = dest;
        vo.topen = topen;
        vo.tclose = tclose;
        vo.tconnect = tconnect;

        pushAndNotify(mediaType, _constantsMetricsConstants2['default'].TCP_CONNECTION, vo);

        return vo;
    }

    function appendHttpTrace(httpRequest, s, d, b) {
        var vo = new _voMetricsHTTPRequest.HTTPRequestTrace();

        vo.s = s;
        vo.d = d;
        vo.b = b;

        httpRequest.trace.push(vo);

        if (!httpRequest.interval) {
            httpRequest.interval = 0;
        }

        httpRequest.interval += d;

        return vo;
    }

    function addHttpRequest(mediaType, tcpid, type, url, actualurl, serviceLocation, range, trequest, tresponse, tfinish, responsecode, mediaduration, responseHeaders, traces) {
        var vo = new _voMetricsHTTPRequest.HTTPRequest();

        // ISO 23009-1 D.4.3 NOTE 2:
        // All entries for a given object will have the same URL and range
        // and so can easily be correlated. If there were redirects or
        // failures there will be one entry for each redirect/failure.
        // The redirect-to URL or alternative url (where multiple have been
        // provided in the MPD) will appear as the actualurl of the next
        // entry with the same url value.
        if (actualurl && actualurl !== url) {

            // given the above, add an entry for the original request
            addHttpRequest(mediaType, null, type, url, null, null, range, trequest, null, // unknown
            null, // unknown
            null, // unknown, probably a 302
            mediaduration, null, null);

            vo.actualurl = actualurl;
        }

        vo.tcpid = tcpid;
        vo.type = type;
        vo.url = url;
        vo.range = range;
        vo.trequest = trequest;
        vo.tresponse = tresponse;
        vo.responsecode = responsecode;

        vo._tfinish = tfinish;
        vo._stream = mediaType;
        vo._mediaduration = mediaduration;
        vo._responseHeaders = responseHeaders;
        vo._serviceLocation = serviceLocation;

        if (traces) {
            traces.forEach(function (trace) {
                appendHttpTrace(vo, trace.s, trace.d, trace.b);
            });
        } else {
            // The interval and trace shall be absent for redirect and failure records.
            delete vo.interval;
            delete vo.trace;
        }

        pushAndNotify(mediaType, _constantsMetricsConstants2['default'].HTTP_REQUEST, vo);

        return vo;
    }

    function addRepresentationSwitch(mediaType, t, mt, to, lto) {
        var vo = new _voMetricsRepresentationSwitch2['default']();

        vo.t = t;
        vo.mt = mt;
        vo.to = to;

        if (lto) {
            vo.lto = lto;
        } else {
            delete vo.lto;
        }

        pushAndNotify(mediaType, _constantsMetricsConstants2['default'].TRACK_SWITCH, vo);

        return vo;
    }

    function pushAndNotify(mediaType, metricType, metricObject) {
        pushMetrics(mediaType, metricType, metricObject);
        metricAdded(mediaType, metricType, metricObject);
    }

    function addBufferLevel(mediaType, t, level) {
        var vo = new _voMetricsBufferLevel2['default']();
        vo.t = t;
        vo.level = level;

        pushAndNotify(mediaType, _constantsMetricsConstants2['default'].BUFFER_LEVEL, vo);

        return vo;
    }

    function addBufferState(mediaType, state, target) {
        var vo = new _voMetricsBufferState2['default']();
        vo.target = target;
        vo.state = state;

        pushAndNotify(mediaType, _constantsMetricsConstants2['default'].BUFFER_STATE, vo);

        return vo;
    }

    function addDVRInfo(mediaType, currentTime, mpd, range) {
        var vo = new _voMetricsDVRInfo2['default']();
        vo.time = currentTime;
        vo.range = range;
        vo.manifestInfo = mpd;

        pushAndNotify(mediaType, _constantsMetricsConstants2['default'].DVR_INFO, vo);

        return vo;
    }

    function addDroppedFrames(mediaType, quality) {
        var vo = new _voMetricsDroppedFrames2['default']();
        var list = getMetricsFor(mediaType).DroppedFrames;

        vo.time = quality.creationTime;
        vo.droppedFrames = quality.droppedVideoFrames;

        if (list.length > 0 && list[list.length - 1] == vo) {
            return list[list.length - 1];
        }

        pushAndNotify(mediaType, _constantsMetricsConstants2['default'].DROPPED_FRAMES, vo);

        return vo;
    }

    function addSchedulingInfo(mediaType, t, type, startTime, availabilityStartTime, duration, quality, range, state) {
        var vo = new _voMetricsSchedulingInfo2['default']();

        vo.mediaType = mediaType;
        vo.t = t;

        vo.type = type;
        vo.startTime = startTime;
        vo.availabilityStartTime = availabilityStartTime;
        vo.duration = duration;
        vo.quality = quality;
        vo.range = range;

        vo.state = state;

        pushAndNotify(mediaType, _constantsMetricsConstants2['default'].SCHEDULING_INFO, vo);

        return vo;
    }

    function addRequestsQueue(mediaType, loadingRequests, executedRequests) {
        var vo = new _voMetricsRequestsQueue2['default']();
        vo.loadingRequests = loadingRequests;
        vo.executedRequests = executedRequests;

        getMetricsFor(mediaType).RequestsQueue = vo;
        metricAdded(mediaType, _constantsMetricsConstants2['default'].REQUESTS_QUEUE, vo);
    }

    function addManifestUpdate(mediaType, type, requestTime, fetchTime, availabilityStartTime, presentationStartTime, clientTimeOffset, currentTime, buffered, latency) {
        var vo = new _voMetricsManifestUpdate.ManifestUpdate();

        vo.mediaType = mediaType;
        vo.type = type;
        vo.requestTime = requestTime; // when this manifest update was requested
        vo.fetchTime = fetchTime; // when this manifest update was received
        vo.availabilityStartTime = availabilityStartTime;
        vo.presentationStartTime = presentationStartTime; // the seek point (liveEdge for dynamic, Stream[0].startTime for static)
        vo.clientTimeOffset = clientTimeOffset; // the calculated difference between the server and client wall clock time
        vo.currentTime = currentTime; // actual element.currentTime
        vo.buffered = buffered; // actual element.ranges
        vo.latency = latency; // (static is fixed value of zero. dynamic should be ((Now-@availabilityStartTime) - currentTime)

        pushMetrics(_constantsConstants2['default'].STREAM, _constantsMetricsConstants2['default'].MANIFEST_UPDATE, vo);
        metricAdded(mediaType, _constantsMetricsConstants2['default'].MANIFEST_UPDATE, vo);

        return vo;
    }

    function updateManifestUpdateInfo(manifestUpdate, updatedFields) {
        if (manifestUpdate) {
            for (var field in updatedFields) {
                manifestUpdate[field] = updatedFields[field];
            }

            metricUpdated(manifestUpdate.mediaType, _constantsMetricsConstants2['default'].MANIFEST_UPDATE, manifestUpdate);
        }
    }

    function addManifestUpdateStreamInfo(manifestUpdate, id, index, start, duration) {
        if (manifestUpdate) {
            var vo = new _voMetricsManifestUpdate.ManifestUpdateStreamInfo();

            vo.id = id;
            vo.index = index;
            vo.start = start;
            vo.duration = duration;

            manifestUpdate.streamInfo.push(vo);
            metricUpdated(manifestUpdate.mediaType, _constantsMetricsConstants2['default'].MANIFEST_UPDATE_STREAM_INFO, manifestUpdate);

            return vo;
        }
        return null;
    }

    function addManifestUpdateRepresentationInfo(manifestUpdate, id, index, streamIndex, mediaType, presentationTimeOffset, startNumber, fragmentInfoType) {
        if (manifestUpdate) {
            var vo = new _voMetricsManifestUpdate.ManifestUpdateTrackInfo();

            vo.id = id;
            vo.index = index;
            vo.streamIndex = streamIndex;
            vo.mediaType = mediaType;
            vo.startNumber = startNumber;
            vo.fragmentInfoType = fragmentInfoType;
            vo.presentationTimeOffset = presentationTimeOffset;

            manifestUpdate.trackInfo.push(vo);
            metricUpdated(manifestUpdate.mediaType, _constantsMetricsConstants2['default'].MANIFEST_UPDATE_TRACK_INFO, manifestUpdate);

            return vo;
        }
        return null;
    }

    function addPlayList(vo) {
        var type = _constantsConstants2['default'].STREAM;

        if (vo.trace && Array.isArray(vo.trace)) {
            vo.trace.forEach(function (trace) {
                if (trace.hasOwnProperty('subreplevel') && !trace.subreplevel) {
                    delete trace.subreplevel;
                }
            });
        } else {
            delete vo.trace;
        }

        pushAndNotify(type, _constantsMetricsConstants2['default'].PLAY_LIST, vo);

        return vo;
    }

    function addDVBErrors(vo) {
        var type = _constantsConstants2['default'].STREAM;

        pushAndNotify(type, _constantsMetricsConstants2['default'].DVB_ERRORS, vo);

        return vo;
    }

    instance = {
        clearCurrentMetricsForType: clearCurrentMetricsForType,
        clearAllCurrentMetrics: clearAllCurrentMetrics,
        getReadOnlyMetricsFor: getReadOnlyMetricsFor,
        getMetricsFor: getMetricsFor,
        addTcpConnection: addTcpConnection,
        addHttpRequest: addHttpRequest,
        addRepresentationSwitch: addRepresentationSwitch,
        addBufferLevel: addBufferLevel,
        addBufferState: addBufferState,
        addDVRInfo: addDVRInfo,
        addDroppedFrames: addDroppedFrames,
        addSchedulingInfo: addSchedulingInfo,
        addRequestsQueue: addRequestsQueue,
        addManifestUpdate: addManifestUpdate,
        updateManifestUpdateInfo: updateManifestUpdateInfo,
        addManifestUpdateStreamInfo: addManifestUpdateStreamInfo,
        addManifestUpdateRepresentationInfo: addManifestUpdateRepresentationInfo,
        addPlayList: addPlayList,
        addDVBErrors: addDVBErrors,
        setConfig: setConfig
    };

    setup();
    return instance;
}

MetricsModel.__dashjs_factory_name = 'MetricsModel';
exports['default'] = _coreFactoryMaker2['default'].getSingletonFactory(MetricsModel);
module.exports = exports['default'];
//# sourceMappingURL=MetricsModel.js.map
