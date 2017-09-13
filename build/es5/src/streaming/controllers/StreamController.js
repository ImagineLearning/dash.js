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

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _ManifestUpdater = require('../ManifestUpdater');

var _ManifestUpdater2 = _interopRequireDefault(_ManifestUpdater);

var _coreEventBus = require('../../core/EventBus');

var _coreEventBus2 = _interopRequireDefault(_coreEventBus);

var _coreEventsEvents = require('../../core/events/Events');

var _coreEventsEvents2 = _interopRequireDefault(_coreEventsEvents);

var _modelsURIQueryAndFragmentModel = require('../models/URIQueryAndFragmentModel');

var _modelsURIQueryAndFragmentModel2 = _interopRequireDefault(_modelsURIQueryAndFragmentModel);

var _modelsMediaPlayerModel = require('../models/MediaPlayerModel');

var _modelsMediaPlayerModel2 = _interopRequireDefault(_modelsMediaPlayerModel);

var _coreFactoryMaker = require('../../core/FactoryMaker');

var _coreFactoryMaker2 = _interopRequireDefault(_coreFactoryMaker);

var _voMetricsPlayList = require('../vo/metrics/PlayList');

var _coreDebug = require('../../core/Debug');

var _coreDebug2 = _interopRequireDefault(_coreDebug);

var _utilsInitCache = require('../utils/InitCache');

var _utilsInitCache2 = _interopRequireDefault(_utilsInitCache);

var _MediaPlayerEvents = require('../MediaPlayerEvents');

var _MediaPlayerEvents2 = _interopRequireDefault(_MediaPlayerEvents);

var _TimeSyncController = require('./TimeSyncController');

var _TimeSyncController2 = _interopRequireDefault(_TimeSyncController);

var _BaseURLController = require('./BaseURLController');

var _BaseURLController2 = _interopRequireDefault(_BaseURLController);

var _MediaSourceController = require('./MediaSourceController');

var _MediaSourceController2 = _interopRequireDefault(_MediaSourceController);

function StreamController() {

    var STREAM_END_THRESHOLD = 0.5;
    var STREAM_END_TIMEOUT_DELAY = 0.1;

    var context = this.context;
    var log = (0, _coreDebug2['default'])(context).getInstance().log;
    var eventBus = (0, _coreEventBus2['default'])(context).getInstance();

    var instance = undefined,
        capabilities = undefined,
        manifestUpdater = undefined,
        manifestLoader = undefined,
        manifestModel = undefined,
        dashManifestModel = undefined,
        adapter = undefined,
        metricsModel = undefined,
        dashMetrics = undefined,
        mediaSourceController = undefined,
        timeSyncController = undefined,
        baseURLController = undefined,
        domStorage = undefined,
        abrController = undefined,
        mediaController = undefined,
        textController = undefined,
        sourceBufferController = undefined,
        initCache = undefined,
        errHandler = undefined,
        timelineConverter = undefined,
        streams = undefined,
        activeStream = undefined,
        protectionController = undefined,
        protectionData = undefined,
        autoPlay = undefined,
        isStreamSwitchingInProgress = undefined,
        hasMediaError = undefined,
        hasInitialisationError = undefined,
        mediaSource = undefined,
        videoModel = undefined,
        playbackController = undefined,
        mediaPlayerModel = undefined,
        isPaused = undefined,
        initialPlayback = undefined,
        playListMetrics = undefined,
        videoTrackDetected = undefined,
        audioTrackDetected = undefined,
        endedTimeout = undefined;

    function setup() {
        timeSyncController = (0, _TimeSyncController2['default'])(context).getInstance();
        baseURLController = (0, _BaseURLController2['default'])(context).getInstance();
        mediaSourceController = (0, _MediaSourceController2['default'])(context).getInstance();

        resetInitialSettings();
    }

    function initialize(autoPl, protData) {
        autoPlay = autoPl;
        protectionData = protData;
        timelineConverter.initialize();
        initCache = (0, _utilsInitCache2['default'])(context).getInstance();

        manifestUpdater = (0, _ManifestUpdater2['default'])(context).create();
        manifestUpdater.setConfig({
            manifestModel: manifestModel,
            dashManifestModel: dashManifestModel,
            mediaPlayerModel: mediaPlayerModel
        });
        manifestUpdater.initialize(manifestLoader);

        baseURLController.setConfig({
            dashManifestModel: dashManifestModel
        });

        eventBus.on(_coreEventsEvents2['default'].TIME_SYNCHRONIZATION_COMPLETED, onTimeSyncCompleted, this);
        eventBus.on(_coreEventsEvents2['default'].PLAYBACK_SEEKING, onPlaybackSeeking, this);
        eventBus.on(_coreEventsEvents2['default'].PLAYBACK_TIME_UPDATED, onPlaybackTimeUpdated, this);
        eventBus.on(_coreEventsEvents2['default'].PLAYBACK_ENDED, onEnded, this);
        eventBus.on(_coreEventsEvents2['default'].PLAYBACK_ERROR, onPlaybackError, this);
        eventBus.on(_coreEventsEvents2['default'].PLAYBACK_STARTED, onPlaybackStarted, this);
        eventBus.on(_coreEventsEvents2['default'].PLAYBACK_PAUSED, onPlaybackPaused, this);
        eventBus.on(_coreEventsEvents2['default'].MANIFEST_UPDATED, onManifestUpdated, this);
        eventBus.on(_coreEventsEvents2['default'].STREAM_BUFFERING_COMPLETED, onStreamBufferingCompleted, this);
        eventBus.on(_MediaPlayerEvents2['default'].METRIC_ADDED, onMetricAdded, this);
    }

    /*
     * Called when current playback position is changed.
     * Used to determine the time current stream is finished and we should switch to the next stream.
     */
    function onPlaybackTimeUpdated(e) {

        if (isVideoTrackPresent()) {
            var playbackQuality = videoModel.getPlaybackQuality();
            if (playbackQuality) {
                metricsModel.addDroppedFrames(_constantsConstants2['default'].VIDEO, playbackQuality);
            }
        }

        // Sometimes after seeking timeUpdateHandler is called before seekingHandler and a new stream starts
        // from beginning instead of from a chosen position. So we do nothing if the player is in the seeking state
        if (playbackController.isSeeking()) return;

        if (e.timeToEnd <= STREAM_END_THRESHOLD) {
            // In some cases the ended event is not triggered at the end of the stream, do it artificially here.
            // This should only be a fallback, put an extra STREAM_END_TIMEOUT_DELAY to give the real ended event time to trigger.

            if (endedTimeout) {
                clearTimeout(endedTimeout);
                endedTimeout = undefined;
            }
            endedTimeout = setTimeout(function () {
                endedTimeout = undefined;
                eventBus.trigger(_coreEventsEvents2['default'].PLAYBACK_ENDED);
            }, 1000 * (e.timeToEnd + STREAM_END_TIMEOUT_DELAY));
        }
    }

    function onPlaybackSeeking(e) {
        var seekingStream = getStreamForTime(e.seekTime);

        if (seekingStream && seekingStream !== activeStream) {
            flushPlaylistMetrics(_voMetricsPlayList.PlayListTrace.END_OF_PERIOD_STOP_REASON);
            switchStream(activeStream, seekingStream, e.seekTime);
        } else {
            flushPlaylistMetrics(_voMetricsPlayList.PlayListTrace.USER_REQUEST_STOP_REASON);
        }

        addPlaylistMetrics(_voMetricsPlayList.PlayList.SEEK_START_REASON);
    }

    function onPlaybackStarted() /*e*/{
        if (initialPlayback) {
            initialPlayback = false;
            addPlaylistMetrics(_voMetricsPlayList.PlayList.INITIAL_PLAYOUT_START_REASON);
        } else {
            if (isPaused) {
                isPaused = false;
                addPlaylistMetrics(_voMetricsPlayList.PlayList.RESUME_FROM_PAUSE_START_REASON);
            }
        }
    }

    function onPlaybackPaused(e) {
        if (!e.ended) {
            isPaused = true;
            flushPlaylistMetrics(_voMetricsPlayList.PlayListTrace.USER_REQUEST_STOP_REASON);
        }
    }

    function onStreamBufferingCompleted() {
        var isLast = getActiveStreamInfo().isLast;
        if (mediaSource && isLast) {
            mediaSourceController.signalEndOfStream(mediaSource);
        }
    }

    function getStreamForTime(time) {
        var duration = 0;
        var stream = null;

        var ln = streams.length;

        if (ln > 0) {
            duration += streams[0].getStartTime();
        }

        for (var i = 0; i < ln; i++) {
            stream = streams[i];
            duration += stream.getDuration();

            if (time < duration) {
                return stream;
            }
        }

        return null;
    }

    /**
     * Returns a playhead time, in seconds, converted to be relative
     * to the start of an identified stream/period or null if no such stream
     * @param {number} time
     * @param {string} id
     * @returns {number|null}
     */
    function getTimeRelativeToStreamId(time, id) {
        var stream = null;
        var baseStart = 0;
        var streamStart = 0;
        var streamDur = null;

        var ln = streams.length;

        for (var i = 0; i < ln; i++) {
            stream = streams[i];
            streamStart = stream.getStartTime();
            streamDur = stream.getDuration();

            // use start time, if not undefined or NaN or similar
            if (Number.isFinite(streamStart)) {
                baseStart = streamStart;
            }

            if (stream.getId() === id) {
                return time - baseStart;
            } else {
                // use duration if not undefined or NaN or similar
                if (Number.isFinite(streamDur)) {
                    baseStart += streamDur;
                }
            }
        }

        return null;
    }

    function getActiveStreamProcessors() {
        return activeStream.getProcessors();
    }

    function getActiveStreamCommonEarliestTime() {
        var commonEarliestTime = [];
        activeStream.getProcessors().forEach(function (p) {
            commonEarliestTime.push(p.getIndexHandler().getEarliestTime());
        });
        return Math.min.apply(Math, commonEarliestTime);
    }

    function onEnded() {
        if (endedTimeout) {
            clearTimeout(endedTimeout);
            endedTimeout = undefined;
        }

        var nextStream = getNextStream();
        if (nextStream) {
            switchStream(activeStream, nextStream, NaN);
        }
        flushPlaylistMetrics(nextStream ? _voMetricsPlayList.PlayListTrace.END_OF_PERIOD_STOP_REASON : _voMetricsPlayList.PlayListTrace.END_OF_CONTENT_STOP_REASON);
    }

    function getNextStream() {
        if (activeStream) {
            var _ret = (function () {
                var start = activeStream.getStreamInfo().start;
                var duration = activeStream.getStreamInfo().duration;

                return {
                    v: streams.filter(function (stream) {
                        return stream.getStreamInfo().start === start + duration;
                    })[0]
                };
            })();

            if (typeof _ret === 'object') return _ret.v;
        }
    }

    function switchStream(oldStream, newStream, seekTime) {

        if (isStreamSwitchingInProgress || !newStream || oldStream === newStream) return;
        isStreamSwitchingInProgress = true;

        eventBus.trigger(_coreEventsEvents2['default'].PERIOD_SWITCH_STARTED, {
            fromStreamInfo: oldStream ? oldStream.getStreamInfo() : null,
            toStreamInfo: newStream.getStreamInfo()
        });

        if (oldStream) oldStream.deactivate();
        activeStream = newStream;
        playbackController.initialize(activeStream.getStreamInfo());

        //TODO detect if we should close and repose or jump to activateStream.
        openMediaSource(seekTime);
    }

    function openMediaSource(seekTime) {

        var sourceUrl = undefined;

        function onMediaSourceOpen() {
            log('MediaSource is open!');
            window.URL.revokeObjectURL(sourceUrl);
            mediaSource.removeEventListener('sourceopen', onMediaSourceOpen);
            mediaSource.removeEventListener('webkitsourceopen', onMediaSourceOpen);
            setMediaDuration();
            activateStream(seekTime);
        }

        if (!mediaSource) {
            mediaSource = mediaSourceController.createMediaSource();
        } else {
            mediaSourceController.detachMediaSource(videoModel);
        }

        mediaSource.addEventListener('sourceopen', onMediaSourceOpen, false);
        mediaSource.addEventListener('webkitsourceopen', onMediaSourceOpen, false);
        sourceUrl = mediaSourceController.attachMediaSource(mediaSource, videoModel);
        log('MediaSource attached to element.  Waiting on open...');
    }

    function activateStream(seekTime) {

        activeStream.activate(mediaSource);

        if (!initialPlayback) {
            if (!isNaN(seekTime)) {
                playbackController.seek(seekTime); //we only need to call seek here, IndexHandlerTime was set from seeking event
            } else {
                    (function () {
                        var startTime = playbackController.getStreamStartTime(true);
                        activeStream.getProcessors().forEach(function (p) {
                            adapter.setIndexHandlerTime(p, startTime);
                        });
                        playbackController.seek(startTime); //seek to period start time
                    })();
                }
        } else {
                videoTrackDetected = checkTrackPresence(_constantsConstants2['default'].VIDEO);
            }

        activeStream.startEventController();
        if (autoPlay || !initialPlayback) {
            playbackController.play();
        }

        isStreamSwitchingInProgress = false;
        eventBus.trigger(_coreEventsEvents2['default'].PERIOD_SWITCH_COMPLETED, {
            toStreamInfo: activeStream.getStreamInfo()
        });
    }

    function setMediaDuration() {
        var manifestDuration = activeStream.getStreamInfo().manifestInfo.duration;
        var mediaDuration = mediaSourceController.setDuration(mediaSource, manifestDuration);
        log('Duration successfully set to: ' + mediaDuration);
    }

    function getComposedStream(streamInfo) {
        for (var i = 0, ln = streams.length; i < ln; i++) {
            if (streams[i].getId() === streamInfo.id) {
                return streams[i];
            }
        }
        return null;
    }

    function composeStreams() {

        try {
            var streamsInfo = adapter.getStreamsInfo();
            if (streamsInfo.length === 0) {
                throw new Error('There are no streams');
            }

            var manifestUpdateInfo = dashMetrics.getCurrentManifestUpdate(metricsModel.getMetricsFor(_constantsConstants2['default'].STREAM));
            metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {
                currentTime: playbackController.getTime(),
                buffered: videoModel.getBufferRange(),
                presentationStartTime: streamsInfo[0].start,
                clientTimeOffset: timelineConverter.getClientTimeOffset()
            });

            for (var i = 0, ln = streamsInfo.length; i < ln; i++) {

                // If the Stream object does not exist we probably loaded the manifest the first time or it was
                // introduced in the updated manifest, so we need to create a new Stream and perform all the initialization operations
                var streamInfo = streamsInfo[i];
                var stream = getComposedStream(streamInfo);

                if (!stream) {

                    stream = (0, _Stream2['default'])(context).create({
                        manifestModel: manifestModel,
                        dashManifestModel: dashManifestModel,
                        mediaPlayerModel: mediaPlayerModel,
                        metricsModel: metricsModel,
                        dashMetrics: dashMetrics,
                        manifestUpdater: manifestUpdater,
                        adapter: adapter,
                        timelineConverter: timelineConverter,
                        capabilities: capabilities,
                        errHandler: errHandler,
                        baseURLController: baseURLController,
                        domStorage: domStorage,
                        abrController: abrController,
                        playbackController: playbackController,
                        mediaController: mediaController,
                        textController: textController,
                        sourceBufferController: sourceBufferController,
                        videoModel: videoModel,
                        streamController: instance
                    });
                    streams.push(stream);
                    stream.initialize(streamInfo, protectionController);
                } else {
                    stream.updateData(streamInfo);
                }

                metricsModel.addManifestUpdateStreamInfo(manifestUpdateInfo, streamInfo.id, streamInfo.index, streamInfo.start, streamInfo.duration);
            }

            if (!activeStream) {
                //const initStream = streamsInfo[0].manifestInfo.isDynamic ? streams[streams.length -1] : streams[0];
                //TODO we need to figure out what the correct starting period is here and not just go to first or last in array.
                switchStream(null, streams[0], NaN);
            }

            eventBus.trigger(_coreEventsEvents2['default'].STREAMS_COMPOSED);
        } catch (e) {
            errHandler.manifestError(e.message, 'nostreamscomposed', manifestModel.getValue());
            hasInitialisationError = true;
            reset();
        }
    }

    function onTimeSyncCompleted() /*e*/{
        var manifest = manifestModel.getValue();
        //TODO check if we can move this to initialize??
        if (protectionController) {
            eventBus.trigger(_coreEventsEvents2['default'].PROTECTION_CREATED, {
                controller: protectionController,
                manifest: manifest
            });
            protectionController.setMediaElement(videoModel.getElement());
            if (protectionData) {
                protectionController.setProtectionData(protectionData);
            }
        }

        composeStreams();
    }

    function onManifestUpdated(e) {
        if (!e.error) {
            (function () {
                //Since streams are not composed yet , need to manually look up useCalculatedLiveEdgeTime to detect if stream
                //is SegmentTimeline to avoid using time source
                var manifest = e.manifest;
                adapter.updatePeriods(manifest);
                var streamInfo = adapter.getStreamsInfo(manifest)[0];
                var mediaInfo = adapter.getMediaInfoForType(streamInfo, _constantsConstants2['default'].VIDEO) || adapter.getMediaInfoForType(streamInfo, _constantsConstants2['default'].AUDIO);

                var voAdaptation = undefined,
                    useCalculatedLiveEdgeTime = undefined;

                if (mediaInfo) {
                    voAdaptation = adapter.getDataForMedia(mediaInfo);
                    useCalculatedLiveEdgeTime = dashManifestModel.getRepresentationsForAdaptation(voAdaptation)[0].useCalculatedLiveEdgeTime;

                    if (useCalculatedLiveEdgeTime) {
                        log('SegmentTimeline detected using calculated Live Edge Time');
                        mediaPlayerModel.setUseManifestDateHeaderTimeSource(false);
                    }
                }

                var manifestUTCTimingSources = dashManifestModel.getUTCTimingSources(e.manifest);
                var allUTCTimingSources = !dashManifestModel.getIsDynamic(manifest) || useCalculatedLiveEdgeTime ? manifestUTCTimingSources : manifestUTCTimingSources.concat(mediaPlayerModel.getUTCTimingSources());
                var isHTTPS = (0, _modelsURIQueryAndFragmentModel2['default'])(context).getInstance().isManifestHTTPS();

                //If https is detected on manifest then lets apply that protocol to only the default time source(s). In the future we may find the need to apply this to more then just default so left code at this level instead of in MediaPlayer.
                allUTCTimingSources.forEach(function (item) {
                    if (item.value.replace(/.*?:\/\//g, '') === _modelsMediaPlayerModel2['default'].DEFAULT_UTC_TIMING_SOURCE.value.replace(/.*?:\/\//g, '')) {
                        item.value = item.value.replace(isHTTPS ? new RegExp(/^(http:)?\/\//i) : new RegExp(/^(https:)?\/\//i), isHTTPS ? 'https://' : 'http://');
                        log('Matching default timing source protocol to manifest protocol: ', item.value);
                    }
                });

                baseURLController.initialize(manifest);

                timeSyncController.setConfig({
                    metricsModel: metricsModel,
                    dashMetrics: dashMetrics
                });
                timeSyncController.initialize(allUTCTimingSources, mediaPlayerModel.getUseManifestDateHeaderTimeSource());
            })();
        } else {
            hasInitialisationError = true;
            reset();
        }
    }

    function isAudioTrackPresent() {
        if (audioTrackDetected === undefined) {
            audioTrackDetected = checkTrackPresence(_constantsConstants2['default'].AUDIO);
        }
        return audioTrackDetected;
    }

    function isVideoTrackPresent() {
        if (videoTrackDetected === undefined) {
            videoTrackDetected = checkTrackPresence(_constantsConstants2['default'].VIDEO);
        }
        return videoTrackDetected;
    }

    function checkTrackPresence(type) {
        var isDetected = false;
        activeStream.getProcessors().forEach(function (p) {
            if (p.getMediaInfo().type === type) {
                isDetected = true;
            }
        });
        return isDetected;
    }

    function flushPlaylistMetrics(reason, time) {
        time = time || new Date();

        if (playListMetrics) {
            if (activeStream) {
                activeStream.getProcessors().forEach(function (p) {
                    var ctrlr = p.getScheduleController();
                    if (ctrlr) {
                        ctrlr.finalisePlayList(time, reason);
                    }
                });
            }
            metricsModel.addPlayList(playListMetrics);
            playListMetrics = null;
        }
    }

    function addPlaylistMetrics(startReason) {
        playListMetrics = new _voMetricsPlayList.PlayList();
        playListMetrics.start = new Date();
        playListMetrics.mstart = playbackController.getTime() * 1000;
        playListMetrics.starttype = startReason;

        if (activeStream) {
            activeStream.getProcessors().forEach(function (p) {
                var ctrlr = p.getScheduleController();
                if (ctrlr) {
                    ctrlr.setPlayList(playListMetrics);
                }
            });
        }
    }

    function onPlaybackError(e) {

        if (!e.error) return;

        var msg = '';

        switch (e.error.code) {
            case 1:
                msg = 'MEDIA_ERR_ABORTED';
                break;
            case 2:
                msg = 'MEDIA_ERR_NETWORK';
                break;
            case 3:
                msg = 'MEDIA_ERR_DECODE';
                break;
            case 4:
                msg = 'MEDIA_ERR_SRC_NOT_SUPPORTED';
                break;
            case 5:
                msg = 'MEDIA_ERR_ENCRYPTED';
                break;
            default:
                msg = 'UNKNOWN';
                break;
        }

        hasMediaError = true;

        if (e.error.message) {
            msg += ' (' + e.error.message + ')';
        }

        if (e.error.msExtendedCode) {
            msg += ' (0x' + (e.error.msExtendedCode >>> 0).toString(16).toUpperCase() + ')';
        }

        log('Video Element Error: ' + msg);
        if (e.error) {
            log(e.error);
        }
        errHandler.mediaSourceError(msg);
        reset();
    }

    function getActiveStreamInfo() {
        return activeStream ? activeStream.getStreamInfo() : null;
    }

    function getStreamById(id) {
        return streams.filter(function (item) {
            return item.getId() === id;
        })[0];
    }

    function checkSetConfigCall() {
        if (!manifestLoader || !manifestLoader.hasOwnProperty('load') || !manifestUpdater || !manifestUpdater.hasOwnProperty('setManifest') || !timeSyncController || !timeSyncController.hasOwnProperty('reset')) {
            throw new Error('setConfig function has to be called previously');
        }
    }

    function load(url) {
        checkSetConfigCall();
        manifestLoader.load(url);
    }

    function loadWithManifest(manifest) {
        checkSetConfigCall();
        manifestUpdater.setManifest(manifest);
    }

    function setConfig(config) {
        if (!config) return;

        if (config.capabilities) {
            capabilities = config.capabilities;
        }
        if (config.manifestLoader) {
            manifestLoader = config.manifestLoader;
        }
        if (config.manifestModel) {
            manifestModel = config.manifestModel;
        }
        if (config.dashManifestModel) {
            dashManifestModel = config.dashManifestModel;
        }
        if (config.mediaPlayerModel) {
            mediaPlayerModel = config.mediaPlayerModel;
        }
        if (config.protectionController) {
            protectionController = config.protectionController;
        }
        if (config.adapter) {
            adapter = config.adapter;
        }
        if (config.metricsModel) {
            metricsModel = config.metricsModel;
        }
        if (config.dashMetrics) {
            dashMetrics = config.dashMetrics;
        }
        if (config.errHandler) {
            errHandler = config.errHandler;
        }
        if (config.timelineConverter) {
            timelineConverter = config.timelineConverter;
        }
        if (config.videoModel) {
            videoModel = config.videoModel;
        }
        if (config.playbackController) {
            playbackController = config.playbackController;
        }
        if (config.domStorage) {
            domStorage = config.domStorage;
        }
        if (config.abrController) {
            abrController = config.abrController;
        }
        if (config.mediaController) {
            mediaController = config.mediaController;
        }
        if (config.textController) {
            textController = config.textController;
        }
        if (config.sourceBufferController) {
            sourceBufferController = config.sourceBufferController;
        }
    }

    function resetInitialSettings() {
        streams = [];
        protectionController = null;
        isStreamSwitchingInProgress = false;
        activeStream = null;
        hasMediaError = false;
        hasInitialisationError = false;
        videoTrackDetected = undefined;
        initialPlayback = true;
        isPaused = false;
        autoPlay = true;
        playListMetrics = null;
    }

    function reset() {
        checkSetConfigCall();

        timeSyncController.reset();

        flushPlaylistMetrics(hasMediaError || hasInitialisationError ? _voMetricsPlayList.PlayListTrace.FAILURE_STOP_REASON : _voMetricsPlayList.PlayListTrace.USER_REQUEST_STOP_REASON);

        for (var i = 0, ln = streams ? streams.length : 0; i < ln; i++) {
            var stream = streams[i];
            stream.reset(hasMediaError);
        }

        eventBus.off(_coreEventsEvents2['default'].PLAYBACK_TIME_UPDATED, onPlaybackTimeUpdated, this);
        eventBus.off(_coreEventsEvents2['default'].PLAYBACK_SEEKING, onPlaybackSeeking, this);
        eventBus.off(_coreEventsEvents2['default'].PLAYBACK_ERROR, onPlaybackError, this);
        eventBus.off(_coreEventsEvents2['default'].PLAYBACK_STARTED, onPlaybackStarted, this);
        eventBus.off(_coreEventsEvents2['default'].PLAYBACK_PAUSED, onPlaybackPaused, this);
        eventBus.off(_coreEventsEvents2['default'].PLAYBACK_ENDED, onEnded, this);
        eventBus.off(_coreEventsEvents2['default'].MANIFEST_UPDATED, onManifestUpdated, this);
        eventBus.off(_coreEventsEvents2['default'].STREAM_BUFFERING_COMPLETED, onStreamBufferingCompleted, this);
        eventBus.off(_MediaPlayerEvents2['default'].METRIC_ADDED, onMetricAdded, this);

        baseURLController.reset();
        manifestUpdater.reset();
        metricsModel.clearAllCurrentMetrics();
        manifestModel.setValue(null);
        manifestLoader.reset();
        timelineConverter.reset();
        initCache.reset();

        if (mediaSource) {
            mediaSourceController.detachMediaSource(videoModel);
            mediaSource = null;
        }
        videoModel = null;
        if (protectionController) {
            protectionController.setMediaElement(null);
            protectionController = null;
            protectionData = null;
            if (manifestModel.getValue()) {
                eventBus.trigger(_coreEventsEvents2['default'].PROTECTION_DESTROYED, {
                    data: manifestModel.getValue().url
                });
            }
        }

        if (endedTimeout) {
            clearTimeout(endedTimeout);
            endedTimeout = undefined;
        }

        eventBus.trigger(_coreEventsEvents2['default'].STREAM_TEARDOWN_COMPLETE);
        resetInitialSettings();
    }

    function onMetricAdded(e) {
        if (e.metric === _constantsMetricsConstants2['default'].DVR_INFO) {
            //Match media type? How can DVR window be different for media types?
            //Should we normalize and union the two?
            if (e.mediaType === _constantsConstants2['default'].AUDIO) {
                mediaSourceController.setSeekable(mediaSource, e.value.range.start, e.value.range.end);
            }
        }
    }

    instance = {
        initialize: initialize,
        getActiveStreamInfo: getActiveStreamInfo,
        isVideoTrackPresent: isVideoTrackPresent,
        isAudioTrackPresent: isAudioTrackPresent,
        getStreamById: getStreamById,
        getTimeRelativeToStreamId: getTimeRelativeToStreamId,
        load: load,
        loadWithManifest: loadWithManifest,
        getActiveStreamProcessors: getActiveStreamProcessors,
        getActiveStreamCommonEarliestTime: getActiveStreamCommonEarliestTime,
        setConfig: setConfig,
        reset: reset
    };

    setup();

    return instance;
}

StreamController.__dashjs_factory_name = 'StreamController';

exports['default'] = _coreFactoryMaker2['default'].getSingletonFactory(StreamController);
module.exports = exports['default'];
//# sourceMappingURL=StreamController.js.map
