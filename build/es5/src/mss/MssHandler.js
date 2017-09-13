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

var _streamingConstantsConstants = require('../streaming/constants/Constants');

var _streamingConstantsConstants2 = _interopRequireDefault(_streamingConstantsConstants);

var _coreEventsEvents = require('../core/events/Events');

var _coreEventsEvents2 = _interopRequireDefault(_coreEventsEvents);

var _streamingMediaPlayerEvents = require('../streaming/MediaPlayerEvents');

var _streamingMediaPlayerEvents2 = _interopRequireDefault(_streamingMediaPlayerEvents);

var _coreEventBus = require('../core/EventBus');

var _coreEventBus2 = _interopRequireDefault(_coreEventBus);

var _coreFactoryMaker = require('../core/FactoryMaker');

var _coreFactoryMaker2 = _interopRequireDefault(_coreFactoryMaker);

var _streamingVoDataChunk = require('../streaming/vo/DataChunk');

var _streamingVoDataChunk2 = _interopRequireDefault(_streamingVoDataChunk);

var _streamingVoFragmentRequest = require('../streaming/vo/FragmentRequest');

var _streamingVoFragmentRequest2 = _interopRequireDefault(_streamingVoFragmentRequest);

var _streamingVoMetricsHTTPRequest = require('../streaming/vo/metrics/HTTPRequest');

var _MssFragmentInfoController = require('./MssFragmentInfoController');

var _MssFragmentInfoController2 = _interopRequireDefault(_MssFragmentInfoController);

var _MssFragmentProcessor = require('./MssFragmentProcessor');

var _MssFragmentProcessor2 = _interopRequireDefault(_MssFragmentProcessor);

var _parserMssParser = require('./parser/MssParser');

var _parserMssParser2 = _interopRequireDefault(_parserMssParser);

function MssHandler(config) {

    var context = this.context;
    var eventBus = config.eventBus;
    var metricsModel = config.metricsModel;
    var playbackController = config.playbackController;
    var mssFragmentProcessor = (0, _MssFragmentProcessor2['default'])(context).create({
        metricsModel: metricsModel,
        playbackController: playbackController,
        eventBus: eventBus
    });
    var mssParser = undefined;

    var instance = undefined;

    function setup() {}

    function onInitializationRequested(e) {
        var streamProcessor = e.sender.getStreamProcessor();
        var request = new _streamingVoFragmentRequest2['default']();
        var representationController = streamProcessor.getRepresentationController();
        var representation = representationController.getCurrentRepresentation();
        var period = undefined,
            presentationStartTime = undefined;

        period = representation.adaptation.period;

        request.mediaType = representation.adaptation.type;
        request.type = _streamingVoMetricsHTTPRequest.HTTPRequest.INIT_SEGMENT_TYPE;
        request.range = representation.range;
        presentationStartTime = period.start;
        //request.availabilityStartTime = timelineConverter.calcAvailabilityStartTimeFromPresentationTime(presentationStartTime, representation.adaptation.period.mpd, isDynamic);
        //request.availabilityEndTime = timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationStartTime + period.duration, period.mpd, isDynamic);
        request.quality = representation.index;
        request.mediaInfo = streamProcessor.getMediaInfo();
        request.representationId = representation.id;

        var chunk = createDataChunk(request, streamProcessor.getStreamInfo().id);

        // Generate initialization segment (moov)
        chunk.bytes = mssFragmentProcessor.generateMoov(representation);

        eventBus.trigger(_coreEventsEvents2['default'].INIT_FRAGMENT_LOADED, {
            chunk: chunk,
            fragmentModel: streamProcessor.getFragmentModel()
        });

        // Change the sender value to stop event to be propagated
        e.sender = null;
    }

    function createDataChunk(request, streamId) {
        var chunk = new _streamingVoDataChunk2['default']();

        chunk.streamId = streamId;
        chunk.mediaInfo = request.mediaInfo;
        chunk.segmentType = request.type;
        chunk.start = request.startTime;
        chunk.duration = request.duration;
        chunk.end = chunk.start + chunk.duration;
        chunk.index = request.index;
        chunk.quality = request.quality;
        chunk.representationId = request.representationId;

        return chunk;
    }

    function onSegmentMediaLoaded(e) {
        // Process moof to transcode it from MSS to DASH
        var streamProcessor = e.sender.getStreamProcessor();
        mssFragmentProcessor.processFragment(e, streamProcessor);
    }

    function onPlaybackSeekAsked() {
        if (playbackController.getIsDynamic() && playbackController.getTime() !== 0) {

            //create fragment info controllers for each stream processors of active stream (only for audio, video or fragmentedText)
            var streamController = playbackController.getStreamController();
            if (streamController) {
                var processors = streamController.getActiveStreamProcessors();
                processors.forEach(function (processor) {
                    if (processor.getType() === _streamingConstantsConstants2['default'].VIDEO || processor.getType() === _streamingConstantsConstants2['default'].AUDIO || processor.getType() === _streamingConstantsConstants2['default'].FRAGMENTED_TEXT) {

                        var fragmentInfoController = (0, _MssFragmentInfoController2['default'])(context).create({
                            streamProcessor: processor,
                            eventBus: eventBus,
                            metricsModel: metricsModel,
                            playbackController: playbackController
                        });
                        fragmentInfoController.initialize();
                        fragmentInfoController.start();
                    }
                });
            }
        }
    }

    function registerEvents() {
        eventBus.on(_coreEventsEvents2['default'].INIT_REQUESTED, onInitializationRequested, instance, _coreEventBus2['default'].EVENT_PRIORITY_HIGH);
        eventBus.on(_streamingMediaPlayerEvents2['default'].PLAYBACK_SEEK_ASKED, onPlaybackSeekAsked, instance, _coreEventBus2['default'].EVENT_PRIORITY_HIGH);
        eventBus.on(_streamingMediaPlayerEvents2['default'].FRAGMENT_LOADING_COMPLETED, onSegmentMediaLoaded, instance, _coreEventBus2['default'].EVENT_PRIORITY_HIGH);
    }

    function reset() {
        eventBus.off(_coreEventsEvents2['default'].INIT_REQUESTED, onInitializationRequested, this);
        eventBus.off(_streamingMediaPlayerEvents2['default'].PLAYBACK_SEEK_ASKED, onPlaybackSeekAsked, this);
        eventBus.off(_streamingMediaPlayerEvents2['default'].FRAGMENT_LOADING_COMPLETED, onSegmentMediaLoaded, this);
    }

    function createMssParser() {
        mssParser = (0, _parserMssParser2['default'])(context).create(config);
        return mssParser;
    }

    instance = {
        reset: reset,
        createMssParser: createMssParser,
        registerEvents: registerEvents
    };

    setup();

    return instance;
}

MssHandler.__dashjs_factory_name = 'MssHandler';
exports['default'] = _coreFactoryMaker2['default'].getClassFactory(MssHandler);
module.exports = exports['default'];
//# sourceMappingURL=MssHandler.js.map
