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

var _modelsFragmentModel = require('../models/FragmentModel');

var _modelsFragmentModel2 = _interopRequireDefault(_modelsFragmentModel);

var _SourceBufferController = require('./SourceBufferController');

var _SourceBufferController2 = _interopRequireDefault(_SourceBufferController);

var _AbrController = require('./AbrController');

var _AbrController2 = _interopRequireDefault(_AbrController);

var _MediaController = require('./MediaController');

var _MediaController2 = _interopRequireDefault(_MediaController);

var _coreEventBus = require('../../core/EventBus');

var _coreEventBus2 = _interopRequireDefault(_coreEventBus);

var _coreEventsEvents = require('../../core/events/Events');

var _coreEventsEvents2 = _interopRequireDefault(_coreEventsEvents);

var _utilsBoxParser = require('../utils/BoxParser');

var _utilsBoxParser2 = _interopRequireDefault(_utilsBoxParser);

var _coreFactoryMaker = require('../../core/FactoryMaker');

var _coreFactoryMaker2 = _interopRequireDefault(_coreFactoryMaker);

var _coreDebug = require('../../core/Debug');

var _coreDebug2 = _interopRequireDefault(_coreDebug);

var _utilsInitCache = require('../utils/InitCache');

var _utilsInitCache2 = _interopRequireDefault(_utilsInitCache);

var BUFFER_LOADED = 'bufferLoaded';
var BUFFER_EMPTY = 'bufferStalled';
var STALL_THRESHOLD = 0.5;

var BUFFER_CONTROLLER_TYPE = 'BufferController';

function BufferController(config) {

    var context = this.context;
    var eventBus = (0, _coreEventBus2['default'])(context).getInstance();
    var metricsModel = config.metricsModel;
    var mediaPlayerModel = config.mediaPlayerModel;
    var sourceBufferController = config.sourceBufferController;
    var errHandler = config.errHandler;
    var streamController = config.streamController;
    var mediaController = config.mediaController;
    var adapter = config.adapter;
    var textController = config.textController;
    var abrController = config.abrController;
    var playbackController = config.playbackController;
    var type = config.type;
    var streamProcessor = config.streamProcessor;

    var instance = undefined,
        log = undefined,
        requiredQuality = undefined,
        isBufferingCompleted = undefined,
        bufferLevel = undefined,
        criticalBufferLevel = undefined,
        mediaSource = undefined,
        maxAppendedIndex = undefined,
        lastIndex = undefined,
        buffer = undefined,
        bufferState = undefined,
        appendedBytesInfo = undefined,
        wallclockTicked = undefined,
        appendingMediaChunk = undefined,
        isAppendingInProgress = undefined,
        isPruningInProgress = undefined,
        initCache = undefined,
        seekStartTime = undefined,
        seekClearedBufferingCompleted = undefined;

    function setup() {
        log = (0, _coreDebug2['default'])(context).getInstance().log.bind(instance);

        reset();
    }

    function getBufferControllerType() {
        return BUFFER_CONTROLLER_TYPE;
    }

    function initialize(Source) {
        setMediaSource(Source);

        initCache = (0, _utilsInitCache2['default'])(context).getInstance();
        requiredQuality = abrController.getQualityFor(type, streamProcessor.getStreamInfo());

        eventBus.on(_coreEventsEvents2['default'].DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
        eventBus.on(_coreEventsEvents2['default'].INIT_FRAGMENT_LOADED, onInitFragmentLoaded, this);
        eventBus.on(_coreEventsEvents2['default'].MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded, this);
        eventBus.on(_coreEventsEvents2['default'].QUALITY_CHANGE_REQUESTED, onQualityChanged, this);
        eventBus.on(_coreEventsEvents2['default'].STREAM_COMPLETED, onStreamCompleted, this);
        eventBus.on(_coreEventsEvents2['default'].PLAYBACK_PROGRESS, onPlaybackProgression, this);
        eventBus.on(_coreEventsEvents2['default'].PLAYBACK_TIME_UPDATED, onPlaybackProgression, this);
        eventBus.on(_coreEventsEvents2['default'].PLAYBACK_RATE_CHANGED, onPlaybackRateChanged, this);
        eventBus.on(_coreEventsEvents2['default'].PLAYBACK_SEEKING, onPlaybackSeeking, this);
        eventBus.on(_coreEventsEvents2['default'].WALLCLOCK_TIME_UPDATED, onWallclockTimeUpdated, this);
        eventBus.on(_coreEventsEvents2['default'].CURRENT_TRACK_CHANGED, onCurrentTrackChanged, this, _coreEventBus2['default'].EVENT_PRIORITY_HIGH);
        eventBus.on(_coreEventsEvents2['default'].SOURCEBUFFER_APPEND_COMPLETED, onAppended, this);
        eventBus.on(_coreEventsEvents2['default'].SOURCEBUFFER_REMOVE_COMPLETED, onRemoved, this);
    }

    function createBuffer(mediaInfo) {
        if (!mediaInfo || !mediaSource || !streamProcessor) return null;

        var sourceBuffer = null;

        try {
            sourceBuffer = sourceBufferController.createSourceBuffer(mediaSource, mediaInfo);

            if (sourceBuffer && sourceBuffer.hasOwnProperty(_constantsConstants2['default'].INITIALIZE)) {
                sourceBuffer.initialize(type, streamProcessor);
            }
        } catch (e) {
            errHandler.mediaSourceError('Error creating ' + type + ' source buffer.');
        }
        setBuffer(sourceBuffer);
        updateBufferTimestampOffset(streamProcessor.getRepresentationInfoForQuality(requiredQuality).MSETimeOffset);
        return sourceBuffer;
    }

    function isActive() {
        return streamProcessor && streamController ? streamProcessor.getStreamInfo().id === streamController.getActiveStreamInfo().id : false;
    }

    function onInitFragmentLoaded(e) {
        if (e.fragmentModel !== streamProcessor.getFragmentModel()) return;
        log('Init fragment finished loading saving to', type + '\'s init cache');
        initCache.save(e.chunk);
        appendToBuffer(e.chunk);
    }

    function switchInitData(streamId, representationId) {
        var chunk = initCache.extract(streamId, representationId);
        if (chunk) {
            appendToBuffer(chunk);
        } else {
            eventBus.trigger(_coreEventsEvents2['default'].INIT_REQUESTED, { sender: instance });
        }
    }

    function onMediaFragmentLoaded(e) {
        if (e.fragmentModel !== streamProcessor.getFragmentModel()) return;

        var chunk = e.chunk;
        var bytes = chunk.bytes;
        var quality = chunk.quality;
        var currentRepresentation = streamProcessor.getRepresentationInfoForQuality(quality);
        var eventStreamMedia = adapter.getEventsFor(currentRepresentation.mediaInfo, streamProcessor);
        var eventStreamTrack = adapter.getEventsFor(currentRepresentation, streamProcessor);

        if (eventStreamMedia && eventStreamMedia.length > 0 || eventStreamTrack && eventStreamTrack.length > 0) {
            var request = streamProcessor.getFragmentModel().getRequests({
                state: _modelsFragmentModel2['default'].FRAGMENT_MODEL_EXECUTED,
                quality: quality,
                index: chunk.index
            })[0];

            var events = handleInbandEvents(bytes, request, eventStreamMedia, eventStreamTrack);
            streamProcessor.getEventController().addInbandEvents(events);
        }

        appendToBuffer(chunk);
    }

    function appendToBuffer(chunk) {
        isAppendingInProgress = true;
        appendedBytesInfo = chunk;
        sourceBufferController.append(buffer, chunk);

        if (chunk.mediaInfo.type === _constantsConstants2['default'].VIDEO) {
            eventBus.trigger(_coreEventsEvents2['default'].VIDEO_CHUNK_RECEIVED, { chunk: chunk });
        }
    }

    function onAppended(e) {
        if (buffer === e.buffer) {
            if (e.error) {
                if (e.error.code === _SourceBufferController2['default'].QUOTA_EXCEEDED_ERROR_CODE) {
                    criticalBufferLevel = sourceBufferController.getTotalBufferedTime(buffer) * 0.8;
                }
                if (e.error.code === _SourceBufferController2['default'].QUOTA_EXCEEDED_ERROR_CODE || !hasEnoughSpaceToAppend()) {
                    eventBus.trigger(_coreEventsEvents2['default'].QUOTA_EXCEEDED, { sender: instance, criticalBufferLevel: criticalBufferLevel }); //Tells ScheduleController to stop scheduling.
                    clearBuffer(getClearRange()); // Then we clear the buffer and onCleared event will tell ScheduleController to start scheduling again.
                }
                return;
            }

            if (appendedBytesInfo && !isNaN(appendedBytesInfo.index)) {
                maxAppendedIndex = Math.max(appendedBytesInfo.index, maxAppendedIndex);
                checkIfBufferingCompleted();
            }

            var ranges = sourceBufferController.getAllRanges(buffer);
            if (ranges && ranges.length > 0) {
                for (var i = 0, len = ranges.length; i < len; i++) {
                    log('Buffered Range for type:', type, ':', ranges.start(i), ' - ', ranges.end(i));
                }
            }

            onPlaybackProgression();
            isAppendingInProgress = false;
            if (appendedBytesInfo) {
                eventBus.trigger(_coreEventsEvents2['default'].BYTES_APPENDED, {
                    sender: instance,
                    quality: appendedBytesInfo.quality,
                    startTime: appendedBytesInfo.start,
                    index: appendedBytesInfo.index,
                    bufferedRanges: ranges
                });
            }
        }
    }

    function onQualityChanged(e) {
        if (requiredQuality === e.newQuality || type !== e.mediaType || streamProcessor.getStreamInfo().id !== e.streamInfo.id) return;

        updateBufferTimestampOffset(streamProcessor.getRepresentationInfoForQuality(e.newQuality).MSETimeOffset);
        requiredQuality = e.newQuality;
    }

    //**********************************************************************
    // START Buffer Level, State & Sufficiency Handling.
    //**********************************************************************
    function onPlaybackSeeking() {
        if (isBufferingCompleted) {
            seekClearedBufferingCompleted = true;
            isBufferingCompleted = false;
            maxAppendedIndex = 0;
        }
        seekStartTime = undefined;
        onPlaybackProgression();
    }

    function getWorkingTime() {
        // This function returns current working time for buffer (either start time or current time if playback has started)
        var ret = playbackController.getTime();

        if (seekStartTime) {
            // if there is a seek start time, the first buffer data will be available on maximum value between first buffer range value and seek start time.
            var ranges = sourceBufferController.getAllRanges(buffer);
            if (ranges && ranges.length) {
                ret = Math.max(ranges.start(0), seekStartTime);
            }
        }
        return ret;
    }

    function onPlaybackProgression() {
        updateBufferLevel();
        addBufferMetrics();
    }

    function updateBufferLevel() {
        if (playbackController) {
            bufferLevel = sourceBufferController.getBufferLength(buffer, getWorkingTime());
            eventBus.trigger(_coreEventsEvents2['default'].BUFFER_LEVEL_UPDATED, { sender: instance, bufferLevel: bufferLevel });
            checkIfSufficientBuffer();
        }
    }

    function addBufferMetrics() {
        if (!isActive()) return;
        metricsModel.addBufferState(type, bufferState, streamProcessor.getScheduleController().getBufferTarget());
        metricsModel.addBufferLevel(type, new Date(), bufferLevel * 1000);
    }

    function checkIfBufferingCompleted() {
        var isLastIdxAppended = maxAppendedIndex >= lastIndex - 1; // Handles 0 and non 0 based request index
        if (isLastIdxAppended && !isBufferingCompleted) {
            isBufferingCompleted = true;
            eventBus.trigger(_coreEventsEvents2['default'].BUFFERING_COMPLETED, { sender: instance, streamInfo: streamProcessor.getStreamInfo() });
        }
    }

    function checkIfSufficientBuffer() {

        // No need to check buffer if type is not audio or video (for example if several errors occur during text parsing, so that the buffer cannot be filled, no error must occur on video playback)
        if (type !== 'audio' && type !== 'video') return;

        if (seekClearedBufferingCompleted && !isBufferingCompleted && playbackController && playbackController.getTimeToStreamEnd() - bufferLevel < STALL_THRESHOLD) {
            seekClearedBufferingCompleted = false;
            isBufferingCompleted = true;
            eventBus.trigger(_coreEventsEvents2['default'].BUFFERING_COMPLETED, { sender: instance, streamInfo: streamProcessor.getStreamInfo() });
        }

        if (bufferLevel < STALL_THRESHOLD && !isBufferingCompleted) {
            notifyBufferStateChanged(BUFFER_EMPTY);
        } else {
            notifyBufferStateChanged(BUFFER_LOADED);
        }
    }

    function notifyBufferStateChanged(state) {
        if (bufferState === state || type === _constantsConstants2['default'].FRAGMENTED_TEXT && textController.getAllTracksAreDisabled()) return;
        bufferState = state;
        addBufferMetrics();
        eventBus.trigger(_coreEventsEvents2['default'].BUFFER_LEVEL_STATE_CHANGED, { sender: instance, state: state, mediaType: type, streamInfo: streamProcessor.getStreamInfo() });
        eventBus.trigger(state === BUFFER_LOADED ? _coreEventsEvents2['default'].BUFFER_LOADED : _coreEventsEvents2['default'].BUFFER_EMPTY, { mediaType: type });
        log(state === BUFFER_LOADED ? 'Got enough buffer to start.' : 'Waiting for more buffer before starting playback.');
    }

    function handleInbandEvents(data, request, mediaInbandEvents, trackInbandEvents) {

        var fragmentStartTime = Math.max(isNaN(request.startTime) ? 0 : request.startTime, 0);
        var eventStreams = [];
        var events = [];

        /* Extract the possible schemeIdUri : If a DASH client detects an event message box with a scheme that is not defined in MPD, the client is expected to ignore it */
        var inbandEvents = mediaInbandEvents.concat(trackInbandEvents);
        for (var i = 0, ln = inbandEvents.length; i < ln; i++) {
            eventStreams[inbandEvents[i].schemeIdUri] = inbandEvents[i];
        }

        var isoFile = (0, _utilsBoxParser2['default'])(context).getInstance().parse(data);
        var eventBoxes = isoFile.getBoxes('emsg');

        for (var i = 0, ln = eventBoxes.length; i < ln; i++) {
            var _event = adapter.getEvent(eventBoxes[i], eventStreams, fragmentStartTime);

            if (_event) {
                events.push(_event);
            }
        }

        return events;
    }

    function hasEnoughSpaceToAppend() {
        var totalBufferedTime = sourceBufferController.getTotalBufferedTime(buffer);
        return totalBufferedTime < criticalBufferLevel;
    }

    /* prune buffer on our own in background to avoid browsers pruning buffer silently */
    function pruneBuffer() {
        if (!buffer) return;
        if (type === _constantsConstants2['default'].FRAGMENTED_TEXT) return;
        var start = buffer.buffered.length ? buffer.buffered.start(0) : 0;
        var bufferToPrune = playbackController.getTime() - start - mediaPlayerModel.getBufferToKeep();
        if (bufferToPrune > 0) {
            log('pruning buffer: ' + bufferToPrune + ' seconds.');
            isPruningInProgress = true;
            sourceBufferController.remove(buffer, 0, Math.round(start + bufferToPrune), mediaSource);
        }
    }

    function getClearRange(threshold) {

        if (!buffer) return null;

        // we need to remove data that is more than one fragment before the video currentTime
        var currentTime = playbackController.getTime();
        var req = streamProcessor.getFragmentModel().getRequests({ state: _modelsFragmentModel2['default'].FRAGMENT_MODEL_EXECUTED, time: currentTime, threshold: threshold })[0];
        var range = sourceBufferController.getBufferRange(buffer, currentTime);

        var removeEnd = req && !isNaN(req.startTime) ? req.startTime : Math.floor(currentTime);
        if (range === null && buffer.buffered.length > 0) {
            removeEnd = buffer.buffered.end(buffer.buffered.length - 1);
        }

        return {
            start: buffer.buffered.start(0),
            end: removeEnd
        };
    }

    function clearBuffer(range) {
        if (!range || !buffer) return;
        sourceBufferController.remove(buffer, range.start, range.end, mediaSource);
    }

    function onRemoved(e) {
        if (buffer !== e.buffer) return;

        if (isPruningInProgress) {
            isPruningInProgress = false;
        }

        updateBufferLevel();
        eventBus.trigger(_coreEventsEvents2['default'].BUFFER_CLEARED, { sender: instance, from: e.from, to: e.to, hasEnoughSpaceToAppend: hasEnoughSpaceToAppend() });
        //TODO - REMEMBER removed a timerout hack calling clearBuffer after manifestInfo.minBufferTime * 1000 if !hasEnoughSpaceToAppend() Aug 04 2016
    }

    function updateBufferTimestampOffset(MSETimeOffset) {
        // Each track can have its own @presentationTimeOffset, so we should set the offset
        // if it has changed after switching the quality or updating an mpd
        if (buffer && buffer.timestampOffset !== MSETimeOffset && !isNaN(MSETimeOffset)) {
            buffer.timestampOffset = MSETimeOffset;
        }
    }

    function onDataUpdateCompleted(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor || e.error) return;
        updateBufferTimestampOffset(e.currentRepresentation.MSETimeOffset);
    }

    function onStreamCompleted(e) {
        if (e.fragmentModel !== streamProcessor.getFragmentModel()) return;
        lastIndex = e.request.index;
        checkIfBufferingCompleted();
    }

    function onCurrentTrackChanged(e) {
        if (!buffer || e.newMediaInfo.type !== type || e.newMediaInfo.streamInfo.id !== streamProcessor.getStreamInfo().id) return;
        if (mediaController.getSwitchMode(type) === _MediaController2['default'].TRACK_SWITCH_MODE_ALWAYS_REPLACE) {
            clearBuffer(getClearRange(0));
        }
    }

    function onWallclockTimeUpdated() {
        wallclockTicked++;
        var secondsElapsed = wallclockTicked * (mediaPlayerModel.getWallclockTimeUpdateInterval() / 1000);
        if (secondsElapsed >= mediaPlayerModel.getBufferPruningInterval() && !isAppendingInProgress) {
            wallclockTicked = 0;
            pruneBuffer();
        }
    }

    function onPlaybackRateChanged() {
        checkIfSufficientBuffer();
    }

    function getType() {
        return type;
    }

    function getStreamProcessor() {
        return streamProcessor;
    }

    function setSeekStartTime(value) {
        seekStartTime = value;
    }

    function getBuffer() {
        return buffer;
    }

    function setBuffer(value) {
        buffer = value;
    }

    function getBufferLevel() {
        return bufferLevel;
    }

    function setMediaSource(value) {
        mediaSource = value;
    }

    function getMediaSource() {
        return mediaSource;
    }

    function getIsBufferingCompleted() {
        return isBufferingCompleted;
    }

    function reset(errored) {

        eventBus.off(_coreEventsEvents2['default'].DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
        eventBus.off(_coreEventsEvents2['default'].QUALITY_CHANGE_REQUESTED, onQualityChanged, this);
        eventBus.off(_coreEventsEvents2['default'].INIT_FRAGMENT_LOADED, onInitFragmentLoaded, this);
        eventBus.off(_coreEventsEvents2['default'].MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded, this);
        eventBus.off(_coreEventsEvents2['default'].STREAM_COMPLETED, onStreamCompleted, this);
        eventBus.off(_coreEventsEvents2['default'].CURRENT_TRACK_CHANGED, onCurrentTrackChanged, this);
        eventBus.off(_coreEventsEvents2['default'].PLAYBACK_PROGRESS, onPlaybackProgression, this);
        eventBus.off(_coreEventsEvents2['default'].PLAYBACK_TIME_UPDATED, onPlaybackProgression, this);
        eventBus.off(_coreEventsEvents2['default'].PLAYBACK_RATE_CHANGED, onPlaybackRateChanged, this);
        eventBus.off(_coreEventsEvents2['default'].PLAYBACK_SEEKING, onPlaybackSeeking, this);
        eventBus.off(_coreEventsEvents2['default'].WALLCLOCK_TIME_UPDATED, onWallclockTimeUpdated, this);
        eventBus.off(_coreEventsEvents2['default'].SOURCEBUFFER_APPEND_COMPLETED, onAppended, this);
        eventBus.off(_coreEventsEvents2['default'].SOURCEBUFFER_REMOVE_COMPLETED, onRemoved, this);

        criticalBufferLevel = Number.POSITIVE_INFINITY;
        bufferState = BUFFER_EMPTY;
        requiredQuality = _AbrController2['default'].QUALITY_DEFAULT;
        lastIndex = Number.POSITIVE_INFINITY;
        maxAppendedIndex = 0;
        appendedBytesInfo = null;
        appendingMediaChunk = false;
        isBufferingCompleted = false;
        isAppendingInProgress = false;
        isPruningInProgress = false;
        seekClearedBufferingCompleted = false;
        bufferLevel = 0;
        wallclockTicked = 0;

        if (!errored) {
            sourceBufferController.abort(mediaSource, buffer);
            sourceBufferController.removeSourceBuffer(mediaSource, buffer);
        }

        buffer = null;
    }

    instance = {
        getBufferControllerType: getBufferControllerType,
        initialize: initialize,
        createBuffer: createBuffer,
        getType: getType,
        getStreamProcessor: getStreamProcessor,
        setSeekStartTime: setSeekStartTime,
        getBuffer: getBuffer,
        setBuffer: setBuffer,
        getBufferLevel: getBufferLevel,
        setMediaSource: setMediaSource,
        getMediaSource: getMediaSource,
        getIsBufferingCompleted: getIsBufferingCompleted,
        switchInitData: switchInitData,
        reset: reset
    };

    setup();
    return instance;
}

BufferController.__dashjs_factory_name = BUFFER_CONTROLLER_TYPE;
var factory = _coreFactoryMaker2['default'].getClassFactory(BufferController);
factory.BUFFER_LOADED = BUFFER_LOADED;
factory.BUFFER_EMPTY = BUFFER_EMPTY;
_coreFactoryMaker2['default'].updateClassFactory(BufferController.__dashjs_factory_name, factory);
exports['default'] = factory;
module.exports = exports['default'];
//# sourceMappingURL=BufferController.js.map
