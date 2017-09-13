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

var _rulesAbrABRRulesCollection = require('../rules/abr/ABRRulesCollection');

var _rulesAbrABRRulesCollection2 = _interopRequireDefault(_rulesAbrABRRulesCollection);

var _constantsConstants = require('../constants/Constants');

var _constantsConstants2 = _interopRequireDefault(_constantsConstants);

var _constantsMetricsConstants = require('../constants/MetricsConstants');

var _constantsMetricsConstants2 = _interopRequireDefault(_constantsMetricsConstants);

var _voBitrateInfo = require('../vo/BitrateInfo');

var _voBitrateInfo2 = _interopRequireDefault(_voBitrateInfo);

var _modelsFragmentModel = require('../models/FragmentModel');

var _modelsFragmentModel2 = _interopRequireDefault(_modelsFragmentModel);

var _coreEventBus = require('../../core/EventBus');

var _coreEventBus2 = _interopRequireDefault(_coreEventBus);

var _coreEventsEvents = require('../../core/events/Events');

var _coreEventsEvents2 = _interopRequireDefault(_coreEventsEvents);

var _coreFactoryMaker = require('../../core/FactoryMaker');

var _coreFactoryMaker2 = _interopRequireDefault(_coreFactoryMaker);

var _rulesRulesContextJs = require('../rules/RulesContext.js');

var _rulesRulesContextJs2 = _interopRequireDefault(_rulesRulesContextJs);

var _rulesSwitchRequestJs = require('../rules/SwitchRequest.js');

var _rulesSwitchRequestJs2 = _interopRequireDefault(_rulesSwitchRequestJs);

var _rulesSwitchRequestHistoryJs = require('../rules/SwitchRequestHistory.js');

var _rulesSwitchRequestHistoryJs2 = _interopRequireDefault(_rulesSwitchRequestHistoryJs);

var _rulesDroppedFramesHistoryJs = require('../rules/DroppedFramesHistory.js');

var _rulesDroppedFramesHistoryJs2 = _interopRequireDefault(_rulesDroppedFramesHistoryJs);

var _rulesThroughputHistoryJs = require('../rules/ThroughputHistory.js');

var _rulesThroughputHistoryJs2 = _interopRequireDefault(_rulesThroughputHistoryJs);

var _voMetricsHTTPRequest = require('../vo/metrics/HTTPRequest');

var _coreDebug = require('../../core/Debug');

var _coreDebug2 = _interopRequireDefault(_coreDebug);

var ABANDON_LOAD = 'abandonload';
var ALLOW_LOAD = 'allowload';
var DEFAULT_VIDEO_BITRATE = 1000;
var DEFAULT_AUDIO_BITRATE = 100;
var QUALITY_DEFAULT = 0;

function AbrController() {

    var context = this.context;
    var debug = (0, _coreDebug2['default'])(context).getInstance();
    var eventBus = (0, _coreEventBus2['default'])(context).getInstance();

    var instance = undefined,
        log = undefined,
        abrRulesCollection = undefined,
        streamController = undefined,
        autoSwitchBitrate = undefined,
        topQualities = undefined,
        qualityDict = undefined,
        bitrateDict = undefined,
        ratioDict = undefined,
        streamProcessorDict = undefined,
        abandonmentStateDict = undefined,
        abandonmentTimeout = undefined,
        limitBitrateByPortal = undefined,
        usePixelRatioInLimitBitrateByPortal = undefined,
        windowResizeEventCalled = undefined,
        elementWidth = undefined,
        elementHeight = undefined,
        manifestModel = undefined,
        dashManifestModel = undefined,
        adapter = undefined,
        videoModel = undefined,
        mediaPlayerModel = undefined,
        domStorage = undefined,
        playbackIndex = undefined,
        switchHistoryDict = undefined,
        droppedFramesHistory = undefined,
        throughputHistory = undefined,
        isUsingBufferOccupancyABRDict = undefined,
        metricsModel = undefined,
        dashMetrics = undefined,
        useDeadTimeLatency = undefined;

    function setup() {
        log = debug.log.bind(instance);

        reset();
    }

    function registerStreamType(type, streamProcessor) {
        switchHistoryDict[type] = (0, _rulesSwitchRequestHistoryJs2['default'])(context).create();
        streamProcessorDict[type] = streamProcessor;
        abandonmentStateDict[type] = abandonmentStateDict[type] || {};
        abandonmentStateDict[type].state = ALLOW_LOAD;
        isUsingBufferOccupancyABRDict[type] = false;
        eventBus.on(_coreEventsEvents2['default'].LOADING_PROGRESS, onFragmentLoadProgress, this);
        if (type == _constantsConstants2['default'].VIDEO) {
            eventBus.on(_coreEventsEvents2['default'].QUALITY_CHANGE_RENDERED, onQualityChangeRendered, this);
            droppedFramesHistory = (0, _rulesDroppedFramesHistoryJs2['default'])(context).create();
            setElementSize();
        }
        eventBus.on(_coreEventsEvents2['default'].METRIC_ADDED, onMetricAdded, this);
        throughputHistory = (0, _rulesThroughputHistoryJs2['default'])(context).create({
            mediaPlayerModel: mediaPlayerModel
        });
    }

    function createAbrRulesCollection() {
        abrRulesCollection = (0, _rulesAbrABRRulesCollection2['default'])(context).create({
            metricsModel: metricsModel,
            dashMetrics: dashMetrics,
            mediaPlayerModel: mediaPlayerModel,
            adapter: adapter
        });

        abrRulesCollection.initialize();
    }

    function reset() {
        autoSwitchBitrate = { video: true, audio: true };
        topQualities = {};
        qualityDict = {};
        bitrateDict = {};
        ratioDict = {};
        abandonmentStateDict = {};
        streamProcessorDict = {};
        switchHistoryDict = {};
        isUsingBufferOccupancyABRDict = {};
        limitBitrateByPortal = false;
        useDeadTimeLatency = true;
        usePixelRatioInLimitBitrateByPortal = false;
        if (windowResizeEventCalled === undefined) {
            windowResizeEventCalled = false;
        }
        eventBus.off(_coreEventsEvents2['default'].LOADING_PROGRESS, onFragmentLoadProgress, this);
        eventBus.off(_coreEventsEvents2['default'].QUALITY_CHANGE_RENDERED, onQualityChangeRendered, this);
        eventBus.off(_coreEventsEvents2['default'].METRIC_ADDED, onMetricAdded, this);
        playbackIndex = undefined;
        droppedFramesHistory = undefined;
        throughputHistory = undefined;
        clearTimeout(abandonmentTimeout);
        abandonmentTimeout = null;
        if (abrRulesCollection) {
            abrRulesCollection.reset();
        }
    }

    function setConfig(config) {
        if (!config) return;

        if (config.streamController) {
            streamController = config.streamController;
        }
        if (config.domStorage) {
            domStorage = config.domStorage;
        }
        if (config.mediaPlayerModel) {
            mediaPlayerModel = config.mediaPlayerModel;
        }
        if (config.metricsModel) {
            metricsModel = config.metricsModel;
        }
        if (config.dashMetrics) {
            dashMetrics = config.dashMetrics;
        }
        if (config.dashManifestModel) {
            dashManifestModel = config.dashManifestModel;
        }
        if (config.adapter) {
            adapter = config.adapter;
        }
        if (config.manifestModel) {
            manifestModel = config.manifestModel;
        }
        if (config.videoModel) {
            videoModel = config.videoModel;
        }
    }

    function onQualityChangeRendered(e) {
        if (e.mediaType === _constantsConstants2['default'].VIDEO) {
            playbackIndex = e.oldQuality;
            droppedFramesHistory.push(playbackIndex, videoModel.getPlaybackQuality());
        }
    }

    function onMetricAdded(e) {
        if (e.metric === _constantsMetricsConstants2['default'].HTTP_REQUEST && e.value && e.value.type === _voMetricsHTTPRequest.HTTPRequest.MEDIA_SEGMENT_TYPE && (e.mediaType === _constantsConstants2['default'].AUDIO || e.mediaType === _constantsConstants2['default'].VIDEO)) {
            throughputHistory.push(e.mediaType, e.value, useDeadTimeLatency);
        }

        if (e.metric === _constantsMetricsConstants2['default'].BUFFER_LEVEL && (e.mediaType === _constantsConstants2['default'].AUDIO || e.mediaType === _constantsConstants2['default'].VIDEO)) {
            updateIsUsingBufferOccupancyABR(e.mediaType, 0.001 * e.value.level);
        }
    }

    function getTopQualityIndexFor(type, id) {
        var idx = undefined;
        topQualities[id] = topQualities[id] || {};

        if (!topQualities[id].hasOwnProperty(type)) {
            topQualities[id][type] = 0;
        }

        idx = checkMaxBitrate(topQualities[id][type], type);
        idx = checkMaxRepresentationRatio(idx, type, topQualities[id][type]);
        idx = checkPortalSize(idx, type);
        return idx;
    }

    /**
     * @param {string} type
     * @returns {number} A value of the initial bitrate, kbps
     * @memberof AbrController#
     */
    function getInitialBitrateFor(type) {

        var savedBitrate = domStorage.getSavedBitrateSettings(type);

        if (!bitrateDict.hasOwnProperty(type)) {
            if (ratioDict.hasOwnProperty(type)) {
                var manifest = manifestModel.getValue();
                var representation = dashManifestModel.getAdaptationForType(manifest, 0, type).Representation;

                if (Array.isArray(representation)) {
                    var repIdx = Math.max(Math.round(representation.length * ratioDict[type]) - 1, 0);
                    bitrateDict[type] = representation[repIdx].bandwidth;
                } else {
                    bitrateDict[type] = 0;
                }
            } else if (!isNaN(savedBitrate)) {
                bitrateDict[type] = savedBitrate;
            } else {
                bitrateDict[type] = type === _constantsConstants2['default'].VIDEO ? DEFAULT_VIDEO_BITRATE : DEFAULT_AUDIO_BITRATE;
            }
        }

        return bitrateDict[type];
    }

    /**
     * @param {string} type
     * @param {number} value A value of the initial bitrate, kbps
     * @memberof AbrController#
     */
    function setInitialBitrateFor(type, value) {
        bitrateDict[type] = value;
    }

    function getInitialRepresentationRatioFor(type) {
        if (!ratioDict.hasOwnProperty(type)) {
            return null;
        }

        return ratioDict[type];
    }

    function setInitialRepresentationRatioFor(type, value) {
        ratioDict[type] = value;
    }

    function getMaxAllowedBitrateFor(type) {
        if (bitrateDict.hasOwnProperty('max') && bitrateDict.max.hasOwnProperty(type)) {
            return bitrateDict.max[type];
        }
        return NaN;
    }

    function getMinAllowedBitrateFor(type) {
        if (bitrateDict.hasOwnProperty('min') && bitrateDict.min.hasOwnProperty(type)) {
            return bitrateDict.min[type];
        }
        return NaN;
    }

    //TODO  change bitrateDict structure to hold one object for video and audio with initial and max values internal.
    // This means you need to update all the logic around initial bitrate DOMStorage, RebController etc...
    function setMaxAllowedBitrateFor(type, value) {
        bitrateDict.max = bitrateDict.max || {};
        bitrateDict.max[type] = value;
    }

    function setMinAllowedBitrateFor(type, value) {
        bitrateDict.min = bitrateDict.min || {};
        bitrateDict.min[type] = value;
    }

    function getMaxAllowedRepresentationRatioFor(type) {
        if (ratioDict.hasOwnProperty('max') && ratioDict.max.hasOwnProperty(type)) {
            return ratioDict.max[type];
        }
        return 1;
    }

    function setMaxAllowedRepresentationRatioFor(type, value) {
        ratioDict.max = ratioDict.max || {};
        ratioDict.max[type] = value;
    }

    function getAutoSwitchBitrateFor(type) {
        return autoSwitchBitrate[type];
    }

    function setAutoSwitchBitrateFor(type, value) {
        autoSwitchBitrate[type] = value;
    }

    function getLimitBitrateByPortal() {
        return limitBitrateByPortal;
    }

    function setLimitBitrateByPortal(value) {
        limitBitrateByPortal = value;
    }

    function getUsePixelRatioInLimitBitrateByPortal() {
        return usePixelRatioInLimitBitrateByPortal;
    }

    function setUsePixelRatioInLimitBitrateByPortal(value) {
        usePixelRatioInLimitBitrateByPortal = value;
    }

    function getUseDeadTimeLatency() {
        return useDeadTimeLatency;
    }

    function setUseDeadTimeLatency(value) {
        useDeadTimeLatency = value;
    }

    function checkPlaybackQuality(type) {
        if (type && streamProcessorDict && streamProcessorDict[type]) {
            var streamInfo = streamProcessorDict[type].getStreamInfo();
            var streamId = streamInfo ? streamInfo.id : null;
            var oldQuality = getQualityFor(type);
            var rulesContext = (0, _rulesRulesContextJs2['default'])(context).create({
                abrController: instance,
                streamProcessor: streamProcessorDict[type],
                currentValue: oldQuality,
                switchHistory: switchHistoryDict[type],
                droppedFramesHistory: droppedFramesHistory,
                useBufferOccupancyABR: useBufferOccupancyABR(type)
            });

            if (droppedFramesHistory) {
                droppedFramesHistory.push(playbackIndex, videoModel.getPlaybackQuality());
            }

            //log("ABR enabled? (" + autoSwitchBitrate + ")");
            if (getAutoSwitchBitrateFor(type)) {
                var topQualityIdx = getTopQualityIndexFor(type, streamId);
                var switchRequest = abrRulesCollection.getMaxQuality(rulesContext);
                var newQuality = switchRequest.quality;
                if (newQuality > topQualityIdx) {
                    newQuality = topQualityIdx;
                }
                switchHistoryDict[type].push({ oldValue: oldQuality, newValue: newQuality });

                if (newQuality > _rulesSwitchRequestJs2['default'].NO_CHANGE && newQuality != oldQuality) {
                    if (abandonmentStateDict[type].state === ALLOW_LOAD || newQuality > oldQuality) {
                        changeQuality(type, oldQuality, newQuality, topQualityIdx, switchRequest.reason);
                    }
                } else if (debug.getLogToBrowserConsole()) {
                    var bufferLevel = dashMetrics.getCurrentBufferLevel(metricsModel.getReadOnlyMetricsFor(type));
                    log('AbrController (' + type + ') stay on ' + oldQuality + '/' + topQualityIdx + ' (buffer: ' + bufferLevel + ')');
                }
            }
        }
    }

    function setPlaybackQuality(type, streamInfo, newQuality, reason) {
        var id = streamInfo.id;
        var oldQuality = getQualityFor(type);
        var isInt = newQuality !== null && !isNaN(newQuality) && newQuality % 1 === 0;

        if (!isInt) throw new Error('argument is not an integer');

        var topQualityIdx = getTopQualityIndexFor(type, id);
        if (newQuality !== oldQuality && newQuality >= 0 && newQuality <= topQualityIdx) {
            changeQuality(type, oldQuality, newQuality, topQualityIdx, reason);
        }
    }
    function changeQuality(type, oldQuality, newQuality, topQualityIdx, reason) {
        if (type && streamProcessorDict[type]) {
            var streamInfo = streamProcessorDict[type].getStreamInfo();
            var id = streamInfo ? streamInfo.id : null;
            if (debug.getLogToBrowserConsole()) {
                var bufferLevel = dashMetrics.getCurrentBufferLevel(metricsModel.getReadOnlyMetricsFor(type));
                log('AbrController (' + type + ') switch from ' + oldQuality + ' to ' + newQuality + '/' + topQualityIdx + ' (buffer: ' + bufferLevel + ')\n' + JSON.stringify(reason));
            }
            setQualityFor(type, id, newQuality);
            eventBus.trigger(_coreEventsEvents2['default'].QUALITY_CHANGE_REQUESTED, { mediaType: type, streamInfo: streamInfo, oldQuality: oldQuality, newQuality: newQuality, reason: reason });
        }
    }

    function setAbandonmentStateFor(type, state) {
        abandonmentStateDict[type].state = state;
    }

    function getAbandonmentStateFor(type) {
        return abandonmentStateDict[type].state;
    }

    /**
     * @param {MediaInfo} mediaInfo
     * @param {number} bitrate A bitrate value, kbps
     * @param {number} latency Expected latency of connection, ms
     * @returns {number} A quality index <= for the given bitrate
     * @memberof AbrController#
     */
    function getQualityForBitrate(mediaInfo, bitrate, latency) {
        if (useDeadTimeLatency && latency && streamProcessorDict[mediaInfo.type].getCurrentRepresentationInfo() && streamProcessorDict[mediaInfo.type].getCurrentRepresentationInfo().fragmentDuration) {
            latency = latency / 1000;
            var fragmentDuration = streamProcessorDict[mediaInfo.type].getCurrentRepresentationInfo().fragmentDuration;
            if (latency > fragmentDuration) {
                return 0;
            } else {
                var deadTimeRatio = latency / fragmentDuration;
                bitrate = bitrate * (1 - deadTimeRatio);
            }
        }

        var bitrateList = getBitrateList(mediaInfo);
        if (!bitrateList || bitrateList.length === 0) {
            return QUALITY_DEFAULT;
        }

        for (var i = bitrateList.length - 1; i >= 0; i--) {
            var bitrateInfo = bitrateList[i];
            if (bitrate * 1000 >= bitrateInfo.bitrate) {
                return i;
            }
        }
        return 0;
    }

    /**
     * @param {MediaInfo} mediaInfo
     * @returns {Array|null} A list of {@link BitrateInfo} objects
     * @memberof AbrController#
     */
    function getBitrateList(mediaInfo) {
        if (!mediaInfo || !mediaInfo.bitrateList) return null;

        var bitrateList = mediaInfo.bitrateList;
        var type = mediaInfo.type;

        var infoList = [];
        var bitrateInfo = undefined;

        for (var i = 0, ln = bitrateList.length; i < ln; i++) {
            bitrateInfo = new _voBitrateInfo2['default']();
            bitrateInfo.mediaType = type;
            bitrateInfo.qualityIndex = i;
            bitrateInfo.bitrate = bitrateList[i].bandwidth;
            bitrateInfo.width = bitrateList[i].width;
            bitrateInfo.height = bitrateList[i].height;
            bitrateInfo.scanType = bitrateList[i].scanType;
            infoList.push(bitrateInfo);
        }

        return infoList;
    }

    function updateIsUsingBufferOccupancyABR(mediaType, bufferLevel) {
        var strategy = mediaPlayerModel.getABRStrategy();

        if (strategy === _constantsConstants2['default'].ABR_STRATEGY_BOLA) {
            isUsingBufferOccupancyABRDict[mediaType] = true;
            return;
        } else if (strategy === _constantsConstants2['default'].ABR_STRATEGY_THROUGHPUT) {
            isUsingBufferOccupancyABRDict[mediaType] = false;
            return;
        }
        // else ABR_STRATEGY_DYNAMIC

        var stableBufferTime = mediaPlayerModel.getStableBufferTime();
        var switchOnThreshold = stableBufferTime;
        var switchOffThreshold = 0.5 * stableBufferTime;

        var useBufferABR = isUsingBufferOccupancyABRDict[mediaType];
        var newUseBufferABR = bufferLevel > (useBufferABR ? switchOffThreshold : switchOnThreshold); // use hysteresis to avoid oscillating rules
        isUsingBufferOccupancyABRDict[mediaType] = newUseBufferABR;

        if (newUseBufferABR !== useBufferABR) {
            if (newUseBufferABR) {
                log('AbrController (' + mediaType + ') switching from throughput to buffer occupancy ABR rule (buffer: ' + bufferLevel.toFixed(3) + ').');
            } else {
                log('AbrController (' + mediaType + ') switching from buffer occupancy to throughput ABR rule (buffer: ' + bufferLevel.toFixed(3) + ').');
            }
        }
    }

    function useBufferOccupancyABR(mediaType) {
        return isUsingBufferOccupancyABRDict[mediaType];
    }

    function getThroughputHistory() {
        return throughputHistory;
    }

    function updateTopQualityIndex(mediaInfo) {
        var type = mediaInfo.type;
        var streamId = mediaInfo.streamInfo.id;
        var max = mediaInfo.representationCount - 1;

        setTopQualityIndex(type, streamId, max);

        return max;
    }

    function isPlayingAtTopQuality(streamInfo) {
        var isAtTop = undefined;
        var streamId = streamInfo.id;
        var audioQuality = getQualityFor(_constantsConstants2['default'].AUDIO);
        var videoQuality = getQualityFor(_constantsConstants2['default'].VIDEO);

        isAtTop = audioQuality === getTopQualityIndexFor(_constantsConstants2['default'].AUDIO, streamId) && videoQuality === getTopQualityIndexFor(_constantsConstants2['default'].VIDEO, streamId);

        return isAtTop;
    }

    function getQualityFor(type) {
        if (type && streamProcessorDict[type]) {
            var streamInfo = streamProcessorDict[type].getStreamInfo();
            var id = streamInfo ? streamInfo.id : null;
            var quality = undefined;

            if (id) {
                qualityDict[id] = qualityDict[id] || {};

                if (!qualityDict[id].hasOwnProperty(type)) {
                    qualityDict[id][type] = QUALITY_DEFAULT;
                }

                quality = qualityDict[id][type];
                return quality;
            }
        }
        return QUALITY_DEFAULT;
    }

    function setQualityFor(type, id, value) {
        qualityDict[id] = qualityDict[id] || {};
        qualityDict[id][type] = value;
    }

    function setTopQualityIndex(type, id, value) {
        topQualities[id] = topQualities[id] || {};
        topQualities[id][type] = value;
    }

    function checkMaxBitrate(idx, type) {
        var newIdx = idx;

        if (!streamProcessorDict[type]) {
            return newIdx;
        }

        var minBitrate = getMinAllowedBitrateFor(type);
        if (minBitrate) {
            var minIdx = getQualityForBitrate(streamProcessorDict[type].getMediaInfo(), minBitrate);
            newIdx = Math.max(idx, minIdx);
        }

        var maxBitrate = getMaxAllowedBitrateFor(type);
        if (maxBitrate) {
            var maxIdx = getQualityForBitrate(streamProcessorDict[type].getMediaInfo(), maxBitrate);
            newIdx = Math.min(newIdx, maxIdx);
        }

        return newIdx;
    }

    function checkMaxRepresentationRatio(idx, type, maxIdx) {
        var maxRepresentationRatio = getMaxAllowedRepresentationRatioFor(type);
        if (isNaN(maxRepresentationRatio) || maxRepresentationRatio >= 1 || maxRepresentationRatio < 0) {
            return idx;
        }
        return Math.min(idx, Math.round(maxIdx * maxRepresentationRatio));
    }

    function setWindowResizeEventCalled(value) {
        windowResizeEventCalled = value;
    }

    function setElementSize() {
        var hasPixelRatio = usePixelRatioInLimitBitrateByPortal && window.hasOwnProperty('devicePixelRatio');
        var pixelRatio = hasPixelRatio ? window.devicePixelRatio : 1;
        elementWidth = videoModel.getClientWidth() * pixelRatio;
        elementHeight = videoModel.getClientHeight() * pixelRatio;
    }

    function checkPortalSize(idx, type) {
        if (type !== _constantsConstants2['default'].VIDEO || !limitBitrateByPortal || !streamProcessorDict[type]) {
            return idx;
        }

        if (!windowResizeEventCalled) {
            setElementSize();
        }

        var manifest = manifestModel.getValue();
        var representation = dashManifestModel.getAdaptationForType(manifest, 0, type).Representation;
        var newIdx = idx;

        if (elementWidth > 0 && elementHeight > 0) {
            while (newIdx > 0 && representation[newIdx] && elementWidth < representation[newIdx].width && elementWidth - representation[newIdx - 1].width < representation[newIdx].width - elementWidth) {
                newIdx = newIdx - 1;
            }

            if (representation.length - 2 >= newIdx && representation[newIdx].width === representation[newIdx + 1].width) {
                newIdx = Math.min(idx, newIdx + 1);
            }
        }

        return newIdx;
    }

    function onFragmentLoadProgress(e) {
        var type = e.request.mediaType;
        if (getAutoSwitchBitrateFor(type)) {
            var streamProcessor = streamProcessorDict[type];
            if (!streamProcessor) return; // There may be a fragment load in progress when we switch periods and recreated some controllers.

            var rulesContext = (0, _rulesRulesContextJs2['default'])(context).create({
                abrController: instance,
                streamProcessor: streamProcessor,
                currentRequest: e.request,
                useBufferOccupancyABR: useBufferOccupancyABR(type)
            });
            var switchRequest = abrRulesCollection.shouldAbandonFragment(rulesContext);
            //Removed overrideFunc
            //    function (currentValue, newValue) {
            //        return newValue;
            //    });

            if (switchRequest.quality > _rulesSwitchRequestJs2['default'].NO_CHANGE) {
                var fragmentModel = streamProcessor.getFragmentModel();
                var request = fragmentModel.getRequests({ state: _modelsFragmentModel2['default'].FRAGMENT_MODEL_LOADING, index: e.request.index })[0];
                if (request) {
                    //TODO Check if we should abort or if better to finish download. check bytesLoaded/Total
                    fragmentModel.abortRequests();
                    setAbandonmentStateFor(type, ABANDON_LOAD);
                    switchHistoryDict[type].reset();
                    switchHistoryDict[type].push({ oldValue: getQualityFor(type, streamController.getActiveStreamInfo()), newValue: switchRequest.quality, confidence: 1, reason: switchRequest.reason });
                    setPlaybackQuality(type, streamController.getActiveStreamInfo(), switchRequest.quality, switchRequest.reason);
                    eventBus.trigger(_coreEventsEvents2['default'].FRAGMENT_LOADING_ABANDONED, { streamProcessor: streamProcessorDict[type], request: request, mediaType: type, newQuality: switchRequest.quality });

                    clearTimeout(abandonmentTimeout);
                    abandonmentTimeout = setTimeout(function () {
                        setAbandonmentStateFor(type, ALLOW_LOAD);abandonmentTimeout = null;
                    }, mediaPlayerModel.getAbandonLoadTimeout());
                }
            }
        }
    }

    instance = {
        isPlayingAtTopQuality: isPlayingAtTopQuality,
        updateTopQualityIndex: updateTopQualityIndex,
        getThroughputHistory: getThroughputHistory,
        getBitrateList: getBitrateList,
        getQualityForBitrate: getQualityForBitrate,
        getMaxAllowedBitrateFor: getMaxAllowedBitrateFor,
        getMinAllowedBitrateFor: getMinAllowedBitrateFor,
        setMaxAllowedBitrateFor: setMaxAllowedBitrateFor,
        setMinAllowedBitrateFor: setMinAllowedBitrateFor,
        getMaxAllowedRepresentationRatioFor: getMaxAllowedRepresentationRatioFor,
        setMaxAllowedRepresentationRatioFor: setMaxAllowedRepresentationRatioFor,
        getInitialBitrateFor: getInitialBitrateFor,
        setInitialBitrateFor: setInitialBitrateFor,
        getInitialRepresentationRatioFor: getInitialRepresentationRatioFor,
        setInitialRepresentationRatioFor: setInitialRepresentationRatioFor,
        setAutoSwitchBitrateFor: setAutoSwitchBitrateFor,
        getAutoSwitchBitrateFor: getAutoSwitchBitrateFor,
        getUseDeadTimeLatency: getUseDeadTimeLatency,
        setUseDeadTimeLatency: setUseDeadTimeLatency,
        setLimitBitrateByPortal: setLimitBitrateByPortal,
        getLimitBitrateByPortal: getLimitBitrateByPortal,
        getUsePixelRatioInLimitBitrateByPortal: getUsePixelRatioInLimitBitrateByPortal,
        setUsePixelRatioInLimitBitrateByPortal: setUsePixelRatioInLimitBitrateByPortal,
        getQualityFor: getQualityFor,
        getAbandonmentStateFor: getAbandonmentStateFor,
        setPlaybackQuality: setPlaybackQuality,
        checkPlaybackQuality: checkPlaybackQuality,
        getTopQualityIndexFor: getTopQualityIndexFor,
        setElementSize: setElementSize,
        setWindowResizeEventCalled: setWindowResizeEventCalled,
        createAbrRulesCollection: createAbrRulesCollection,
        registerStreamType: registerStreamType,
        setConfig: setConfig,
        reset: reset
    };

    setup();

    return instance;
}

AbrController.__dashjs_factory_name = 'AbrController';
var factory = _coreFactoryMaker2['default'].getSingletonFactory(AbrController);
factory.ABANDON_LOAD = ABANDON_LOAD;
factory.QUALITY_DEFAULT = QUALITY_DEFAULT;
_coreFactoryMaker2['default'].updateSingletonFactory(AbrController.__dashjs_factory_name, factory);
exports['default'] = factory;
module.exports = exports['default'];
//# sourceMappingURL=AbrController.js.map
