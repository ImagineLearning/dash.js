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

var _constantsConstants = require('./constants/Constants');

var _constantsConstants2 = _interopRequireDefault(_constantsConstants);

var _StreamProcessor = require('./StreamProcessor');

var _StreamProcessor2 = _interopRequireDefault(_StreamProcessor);

var _controllersEventController = require('./controllers/EventController');

var _controllersEventController2 = _interopRequireDefault(_controllersEventController);

var _controllersFragmentController = require('./controllers/FragmentController');

var _controllersFragmentController2 = _interopRequireDefault(_controllersFragmentController);

var _modelsVideoModel = require('./models/VideoModel');

var _modelsVideoModel2 = _interopRequireDefault(_modelsVideoModel);

var _coreEventBus = require('../core/EventBus');

var _coreEventBus2 = _interopRequireDefault(_coreEventBus);

var _coreEventsEvents = require('../core/events/Events');

var _coreEventsEvents2 = _interopRequireDefault(_coreEventsEvents);

var _coreDebug = require('../core/Debug');

var _coreDebug2 = _interopRequireDefault(_coreDebug);

var _coreFactoryMaker = require('../core/FactoryMaker');

var _coreFactoryMaker2 = _interopRequireDefault(_coreFactoryMaker);

function Stream(config) {

    var DATA_UPDATE_FAILED_ERROR_CODE = 1;

    var context = this.context;
    var log = (0, _coreDebug2['default'])(context).getInstance().log;
    var eventBus = (0, _coreEventBus2['default'])(context).getInstance();

    var manifestModel = config.manifestModel;
    var dashManifestModel = config.dashManifestModel;
    var mediaPlayerModel = config.mediaPlayerModel;
    var manifestUpdater = config.manifestUpdater;
    var adapter = config.adapter;
    var capabilities = config.capabilities;
    var errHandler = config.errHandler;
    var timelineConverter = config.timelineConverter;
    var metricsModel = config.metricsModel;
    var abrController = config.abrController;
    var playbackController = config.playbackController;
    var mediaController = config.mediaController;
    var textController = config.textController;

    var instance = undefined,
        streamProcessors = undefined,
        isStreamActivated = undefined,
        isMediaInitialized = undefined,
        streamInfo = undefined,
        updateError = undefined,
        isUpdating = undefined,
        protectionController = undefined,
        fragmentController = undefined,
        eventController = undefined,
        trackChangedEvent = undefined;

    function setup() {
        resetInitialSettings();

        fragmentController = (0, _controllersFragmentController2['default'])(context).create({
            mediaPlayerModel: mediaPlayerModel,
            metricsModel: metricsModel,
            errHandler: errHandler
        });

        eventBus.on(_coreEventsEvents2['default'].BUFFERING_COMPLETED, onBufferingCompleted, instance);
        eventBus.on(_coreEventsEvents2['default'].DATA_UPDATE_COMPLETED, onDataUpdateCompleted, instance);
    }

    function initialize(StreamInfo, ProtectionController) {
        streamInfo = StreamInfo;
        protectionController = ProtectionController;
        if (protectionController) {
            eventBus.on(_coreEventsEvents2['default'].KEY_ERROR, onProtectionError, instance);
            eventBus.on(_coreEventsEvents2['default'].SERVER_CERTIFICATE_UPDATED, onProtectionError, instance);
            eventBus.on(_coreEventsEvents2['default'].LICENSE_REQUEST_COMPLETE, onProtectionError, instance);
            eventBus.on(_coreEventsEvents2['default'].KEY_SYSTEM_SELECTED, onProtectionError, instance);
            eventBus.on(_coreEventsEvents2['default'].KEY_SESSION_CREATED, onProtectionError, instance);
        }
    }

    /**
     * Activates Stream by re-initializing some of its components
     * @param {MediaSource} mediaSource
     * @memberof Stream#
     */
    function activate(mediaSource) {
        if (!isStreamActivated) {
            eventBus.on(_coreEventsEvents2['default'].CURRENT_TRACK_CHANGED, onCurrentTrackChanged, instance);
            initializeMedia(mediaSource);
            isStreamActivated = true;
        }
        //else { // TODO Check track change mode but why is this here. commented it out for now to check.
        //    createBuffers();
        //}
    }

    /**
     * Partially resets some of the Stream elements
     * @memberof Stream#
     */
    function deactivate() {
        var ln = streamProcessors ? streamProcessors.length : 0;
        for (var i = 0; i < ln; i++) {
            streamProcessors[i].reset();
        }
        streamProcessors = [];
        isStreamActivated = false;
        isMediaInitialized = false;
        clearEventController();
        eventBus.off(_coreEventsEvents2['default'].CURRENT_TRACK_CHANGED, onCurrentTrackChanged, instance);
    }

    function resetInitialSettings() {
        deactivate();
        streamInfo = null;
        updateError = {};
        isUpdating = false;
    }

    function reset() {

        if (playbackController) {
            playbackController.pause();
            playbackController = null;
        }

        if (fragmentController) {
            fragmentController.reset();
            fragmentController = null;
        }

        resetInitialSettings();
        mediaController = null;
        abrController = null;
        manifestUpdater = null;
        manifestModel = null;
        adapter = null;
        capabilities = null;
        log = null;
        errHandler = null;

        eventBus.off(_coreEventsEvents2['default'].DATA_UPDATE_COMPLETED, onDataUpdateCompleted, instance);
        eventBus.off(_coreEventsEvents2['default'].BUFFERING_COMPLETED, onBufferingCompleted, instance);
        eventBus.off(_coreEventsEvents2['default'].KEY_ERROR, onProtectionError, instance);
        eventBus.off(_coreEventsEvents2['default'].SERVER_CERTIFICATE_UPDATED, onProtectionError, instance);
        eventBus.off(_coreEventsEvents2['default'].LICENSE_REQUEST_COMPLETE, onProtectionError, instance);
        eventBus.off(_coreEventsEvents2['default'].KEY_SYSTEM_SELECTED, onProtectionError, instance);
        eventBus.off(_coreEventsEvents2['default'].KEY_SESSION_CREATED, onProtectionError, instance);
    }

    function getDuration() {
        return streamInfo ? streamInfo.duration : NaN;
    }

    function getStartTime() {
        return streamInfo ? streamInfo.start : NaN;
    }

    function getId() {
        return streamInfo ? streamInfo.id : NaN;
    }

    function getStreamInfo() {
        return streamInfo;
    }

    function getEventController() {
        return eventController;
    }

    function getFragmentController() {
        return fragmentController;
    }

    function checkConfig() {
        if (!abrController || !abrController.hasOwnProperty('getBitrateList') || !adapter || !adapter.hasOwnProperty('getAllMediaInfoForType') || !adapter.hasOwnProperty('getEventsFor')) {
            throw new Error('Missing config parameter(s)');
        }
    }

    /**
     * @param {string} type
     * @returns {Array}
     * @memberof Stream#
     */
    function getBitrateListFor(type) {
        checkConfig();
        var mediaInfo = getMediaInfo(type);
        return abrController.getBitrateList(mediaInfo);
    }

    function startEventController() {
        if (eventController) {
            eventController.start();
        }
    }

    function clearEventController() {
        if (eventController) {
            eventController.clear();
        }
    }

    function onProtectionError(event) {
        if (event.error) {
            errHandler.mediaKeySessionError(event.error);
            log(event.error);
            reset();
        }
    }

    function getMimeTypeOrType(mediaInfo) {
        return mediaInfo.type === _constantsConstants2['default'].TEXT ? mediaInfo.mimeType : mediaInfo.type;
    }

    function isMediaSupported(mediaInfo) {
        var type = mediaInfo.type;
        var codec = undefined,
            msg = undefined;

        if (type === _constantsConstants2['default'].MUXED && mediaInfo) {
            msg = 'Multiplexed representations are intentionally not supported, as they are not compliant with the DASH-AVC/264 guidelines';
            log(msg);
            errHandler.manifestError(msg, 'multiplexedrep', manifestModel.getValue());
            return false;
        }

        if (type === _constantsConstants2['default'].TEXT || type === _constantsConstants2['default'].FRAGMENTED_TEXT || type === _constantsConstants2['default'].EMBEDDED_TEXT) {
            return true;
        }
        codec = mediaInfo.codec;
        log(type + ' codec: ' + codec);

        if (!!mediaInfo.contentProtection && !capabilities.supportsEncryptedMedia()) {
            errHandler.capabilityError('encryptedmedia');
        } else if (!capabilities.supportsCodec((0, _modelsVideoModel2['default'])(context).getInstance().getElement(), codec)) {
            msg = type + 'Codec (' + codec + ') is not supported.';
            errHandler.manifestError(msg, 'codec', manifestModel.getValue());
            log(msg);
            return false;
        }

        return true;
    }

    function onCurrentTrackChanged(e) {
        if (e.newMediaInfo.streamInfo.id !== streamInfo.id) return;

        var processor = getProcessorForMediaInfo(e.oldMediaInfo);
        if (!processor) return;

        var currentTime = playbackController.getTime();
        log('Stream -  Process track changed at current time ' + currentTime);
        var buffer = processor.getBuffer();
        var mediaInfo = e.newMediaInfo;
        var manifest = manifestModel.getValue();
        var idx = streamProcessors.indexOf(processor);
        var mediaSource = processor.getMediaSource();

        log('Stream -  Update stream controller');
        if (manifest.refreshManifestOnSwitchTrack) {
            log('Stream -  Refreshing manifest for switch track');
            trackChangedEvent = e;
            manifestUpdater.refreshManifest();
        } else {
            if (mediaInfo.type !== _constantsConstants2['default'].FRAGMENTED_TEXT) {

                processor.reset(true);
                createStreamProcessor(mediaInfo, mediaSource, {
                    buffer: buffer,
                    replaceIdx: idx,
                    currentTime: currentTime
                });
                playbackController.seek(playbackController.getTime());
            } else {
                processor.updateMediaInfo(mediaInfo);
            }
        }
    }

    function createStreamProcessor(mediaInfo, mediaSource, optionalSettings) {
        var streamProcessor = (0, _StreamProcessor2['default'])(context).create({
            type: getMimeTypeOrType(mediaInfo),
            mimeType: mediaInfo.mimeType,
            timelineConverter: timelineConverter,
            adapter: adapter,
            manifestModel: manifestModel,
            dashManifestModel: dashManifestModel,
            mediaPlayerModel: mediaPlayerModel,
            metricsModel: metricsModel,
            dashMetrics: config.dashMetrics,
            baseURLController: config.baseURLController,
            stream: instance,
            abrController: abrController,
            domStorage: config.domStorage,
            playbackController: playbackController,
            mediaController: mediaController,
            streamController: config.streamController,
            textController: textController,
            sourceBufferController: config.sourceBufferController,
            errHandler: errHandler
        });

        var allMediaForType = adapter.getAllMediaInfoForType(streamInfo, mediaInfo.type);
        streamProcessor.initialize(mediaSource);
        abrController.updateTopQualityIndex(mediaInfo);

        if (optionalSettings) {
            streamProcessor.setBuffer(optionalSettings.buffer);
            streamProcessor.getIndexHandler().setCurrentTime(optionalSettings.currentTime);
            streamProcessors[optionalSettings.replaceIdx] = streamProcessor;
        } else {
            streamProcessors.push(streamProcessor);
        }

        if (optionalSettings && optionalSettings.ignoreMediaInfo) {
            return;
        }

        if (mediaInfo.type === _constantsConstants2['default'].TEXT || mediaInfo.type === _constantsConstants2['default'].FRAGMENTED_TEXT) {
            var idx = undefined;
            for (var i = 0; i < allMediaForType.length; i++) {
                if (allMediaForType[i].index === mediaInfo.index) {
                    idx = i;
                }
                streamProcessor.updateMediaInfo(allMediaForType[i]); //creates text tracks for all adaptations in one stream processor
            }
            if (mediaInfo.type === _constantsConstants2['default'].FRAGMENTED_TEXT) {
                streamProcessor.updateMediaInfo(allMediaForType[idx]); //sets the initial media info
            }
        } else {
                streamProcessor.updateMediaInfo(mediaInfo);
            }
    }

    function initializeMediaForType(type, mediaSource) {
        var allMediaForType = adapter.getAllMediaInfoForType(streamInfo, type);

        var mediaInfo = null;
        var initialMediaInfo = undefined;

        if (!allMediaForType || allMediaForType.length === 0) {
            log('No ' + type + ' data.');
            return;
        }

        for (var i = 0, ln = allMediaForType.length; i < ln; i++) {
            mediaInfo = allMediaForType[i];

            if (type === _constantsConstants2['default'].EMBEDDED_TEXT) {
                textController.addEmbeddedTrack(mediaInfo);
            } else {
                if (!isMediaSupported(mediaInfo)) {
                    continue;
                }
                if (mediaController.isMultiTrackSupportedByType(mediaInfo.type)) {
                    mediaController.addTrack(mediaInfo, streamInfo);
                }
            }
        }

        if (type === _constantsConstants2['default'].EMBEDDED_TEXT || mediaController.getTracksFor(type, streamInfo).length === 0) {
            return;
        }

        mediaController.checkInitialMediaSettingsForType(type, streamInfo);
        initialMediaInfo = mediaController.getCurrentTrackFor(type, streamInfo);

        // TODO : How to tell index handler live/duration?
        // TODO : Pass to controller and then pass to each method on handler?

        createStreamProcessor(initialMediaInfo, mediaSource);
    }

    function initializeMedia(mediaSource) {
        checkConfig();
        var events = undefined;

        eventController = (0, _controllersEventController2['default'])(context).create();
        eventController.initialize();
        eventController.setConfig({
            manifestModel: manifestModel,
            manifestUpdater: manifestUpdater,
            playbackController: playbackController
        });
        events = adapter.getEventsFor(streamInfo);
        eventController.addInlineEvents(events);

        isUpdating = true;
        initializeMediaForType(_constantsConstants2['default'].VIDEO, mediaSource);
        initializeMediaForType(_constantsConstants2['default'].AUDIO, mediaSource);
        initializeMediaForType(_constantsConstants2['default'].TEXT, mediaSource);
        initializeMediaForType(_constantsConstants2['default'].FRAGMENTED_TEXT, mediaSource);
        initializeMediaForType(_constantsConstants2['default'].EMBEDDED_TEXT, mediaSource);
        initializeMediaForType(_constantsConstants2['default'].MUXED, mediaSource);

        createBuffers();

        //TODO. Consider initialization of TextSourceBuffer here if embeddedText, but no sideloadedText.

        isMediaInitialized = true;
        isUpdating = false;

        if (streamProcessors.length === 0) {
            var msg = 'No streams to play.';
            errHandler.manifestError(msg, 'nostreams', manifestModel.getValue());
            log(msg);
        } else {
            //log("Playback initialized!");
            checkIfInitializationCompleted();
        }
    }

    function checkIfInitializationCompleted() {
        var ln = streamProcessors.length;
        var hasError = !!updateError.audio || !!updateError.video;
        var error = hasError ? new Error(DATA_UPDATE_FAILED_ERROR_CODE, 'Data update failed', null) : null;

        for (var i = 0; i < ln; i++) {
            if (streamProcessors[i].isUpdating() || isUpdating) {
                return;
            }
        }

        if (!isMediaInitialized) {
            return;
        }
        if (protectionController) {
            protectionController.initialize(manifestModel.getValue(), getMediaInfo(_constantsConstants2['default'].AUDIO), getMediaInfo(_constantsConstants2['default'].VIDEO));
        }
        eventBus.trigger(_coreEventsEvents2['default'].STREAM_INITIALIZED, {
            streamInfo: streamInfo,
            error: error
        });
    }

    function getMediaInfo(type) {
        var ln = streamProcessors.length;
        var mediaCtrl = null;

        for (var i = 0; i < ln; i++) {
            mediaCtrl = streamProcessors[i];

            if (mediaCtrl.getType() === type) {
                return mediaCtrl.getMediaInfo();
            }
        }

        return null;
    }

    function createBuffers() {
        for (var i = 0, ln = streamProcessors.length; i < ln; i++) {
            streamProcessors[i].createBuffer();
        }
    }

    function onBufferingCompleted(e) {
        if (e.streamInfo !== streamInfo) {
            return;
        }

        var processors = getProcessors();
        var ln = processors.length;

        // if there is at least one buffer controller that has not completed buffering yet do nothing
        for (var i = 0; i < ln; i++) {
            if (!processors[i].isBufferingCompleted()) {
                return;
            }
        }

        eventBus.trigger(_coreEventsEvents2['default'].STREAM_BUFFERING_COMPLETED, {
            streamInfo: streamInfo
        });
    }

    function onDataUpdateCompleted(e) {
        var sp = e.sender.getStreamProcessor();

        if (sp.getStreamInfo() !== streamInfo) {
            return;
        }

        updateError[sp.getType()] = e.error;
        checkIfInitializationCompleted();
    }

    function getProcessorForMediaInfo(mediaInfo) {
        if (!mediaInfo) {
            return false;
        }

        var processors = getProcessors();

        return processors.filter(function (processor) {
            return processor.getType() === mediaInfo.type;
        })[0];
    }

    function getProcessors() {
        var ln = streamProcessors.length;
        var arr = [];

        var type = undefined,
            controller = undefined;

        for (var i = 0; i < ln; i++) {
            controller = streamProcessors[i];
            type = controller.getType();

            if (type === _constantsConstants2['default'].AUDIO || type === _constantsConstants2['default'].VIDEO || type === _constantsConstants2['default'].FRAGMENTED_TEXT) {
                arr.push(controller);
            }
        }

        return arr;
    }

    function updateData(updatedStreamInfo) {

        log('Manifest updated... updating data system wide.');

        isStreamActivated = false;
        isUpdating = true;
        streamInfo = updatedStreamInfo;

        if (eventController) {
            var events = adapter.getEventsFor(streamInfo);
            eventController.addInlineEvents(events);
        }

        for (var i = 0, ln = streamProcessors.length; i < ln; i++) {
            var streamProcessor = streamProcessors[i];
            var mediaInfo = adapter.getMediaInfoForType(streamInfo, streamProcessor.getType());
            abrController.updateTopQualityIndex(mediaInfo);
            streamProcessor.updateMediaInfo(mediaInfo);
        }

        if (trackChangedEvent) {
            var mediaInfo = trackChangedEvent.newMediaInfo;
            if (mediaInfo.type !== 'fragmentedText') {
                var processor = getProcessorForMediaInfo(trackChangedEvent.oldMediaInfo);
                if (!processor) return;
                processor.switchTrackAsked();
            }
        }

        isUpdating = false;
        checkIfInitializationCompleted();
    }

    instance = {
        initialize: initialize,
        activate: activate,
        deactivate: deactivate,
        getDuration: getDuration,
        getStartTime: getStartTime,
        getId: getId,
        getStreamInfo: getStreamInfo,
        getFragmentController: getFragmentController,
        getEventController: getEventController,
        getBitrateListFor: getBitrateListFor,
        startEventController: startEventController,
        updateData: updateData,
        reset: reset,
        getProcessors: getProcessors
    };

    setup();
    return instance;
}

Stream.__dashjs_factory_name = 'Stream';
exports['default'] = _coreFactoryMaker2['default'].getClassFactory(Stream);
module.exports = exports['default'];
//# sourceMappingURL=Stream.js.map
