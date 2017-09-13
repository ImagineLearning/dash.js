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

var _voMetricsHTTPRequest = require('../vo/metrics/HTTPRequest');

var _voTextTrackInfo = require('../vo/TextTrackInfo');

var _voTextTrackInfo2 = _interopRequireDefault(_voTextTrackInfo);

var _dashUtilsFragmentedTextBoxParser = require('../../dash/utils/FragmentedTextBoxParser');

var _dashUtilsFragmentedTextBoxParser2 = _interopRequireDefault(_dashUtilsFragmentedTextBoxParser);

var _utilsBoxParser = require('../utils/BoxParser');

var _utilsBoxParser2 = _interopRequireDefault(_utilsBoxParser);

var _utilsCustomTimeRanges = require('../utils/CustomTimeRanges');

var _utilsCustomTimeRanges2 = _interopRequireDefault(_utilsCustomTimeRanges);

var _coreFactoryMaker = require('../../core/FactoryMaker');

var _coreFactoryMaker2 = _interopRequireDefault(_coreFactoryMaker);

var _coreDebug = require('../../core/Debug');

var _coreDebug2 = _interopRequireDefault(_coreDebug);

var _TextTracks = require('./TextTracks');

var _TextTracks2 = _interopRequireDefault(_TextTracks);

var _EmbeddedTextHtmlRender = require('./EmbeddedTextHtmlRender');

var _EmbeddedTextHtmlRender2 = _interopRequireDefault(_EmbeddedTextHtmlRender);

var _codemIsoboxer = require('codem-isoboxer');

var _codemIsoboxer2 = _interopRequireDefault(_codemIsoboxer);

var _externalsCea608Parser = require('../../../externals/cea608-parser');

var _externalsCea608Parser2 = _interopRequireDefault(_externalsCea608Parser);

var _coreEventBus = require('../../core/EventBus');

var _coreEventBus2 = _interopRequireDefault(_coreEventBus);

var _coreEventsEvents = require('../../core/events/Events');

var _coreEventsEvents2 = _interopRequireDefault(_coreEventsEvents);

function TextSourceBuffer() {

    var context = this.context;
    var log = (0, _coreDebug2['default'])(context).getInstance().log;
    var eventBus = (0, _coreEventBus2['default'])(context).getInstance();
    var embeddedInitialized = false;

    var instance = undefined,
        boxParser = undefined,
        errHandler = undefined,
        dashManifestModel = undefined,
        manifestModel = undefined,
        mediaController = undefined,
        parser = undefined,
        vttParser = undefined,
        ttmlParser = undefined,
        fragmentedTextBoxParser = undefined,
        mediaInfos = undefined,
        textTracks = undefined,
        isFragmented = undefined,
        fragmentModel = undefined,
        initializationSegmentReceived = undefined,
        timescale = undefined,
        fragmentedTracks = undefined,
        videoModel = undefined,
        streamController = undefined,
        firstSubtitleStart = undefined,
        currFragmentedTrackIdx = undefined,
        embeddedTracks = undefined,
        embeddedInitializationSegmentReceived = undefined,
        embeddedTimescale = undefined,
        embeddedLastSequenceNumber = undefined,
        embeddedSequenceNumbers = undefined,
        embeddedCea608FieldParsers = undefined,
        embeddedTextHtmlRender = undefined;

    function initialize(type, streamProcessor) {
        parser = null;
        fragmentModel = null;
        initializationSegmentReceived = false;
        timescale = NaN;
        fragmentedTracks = [];
        firstSubtitleStart = null;

        if (!embeddedInitialized) {
            initEmbedded();
        }

        mediaInfos = streamProcessor.getMediaInfoArr();
        textTracks.setConfig({
            videoModel: videoModel
        });
        textTracks.initialize();
        isFragmented = !dashManifestModel.getIsTextTrack(type);
        boxParser = (0, _utilsBoxParser2['default'])(context).getInstance();
        fragmentedTextBoxParser = (0, _dashUtilsFragmentedTextBoxParser2['default'])(context).getInstance();
        fragmentedTextBoxParser.setConfig({
            boxParser: boxParser
        });

        if (isFragmented) {
            fragmentModel = streamProcessor.getFragmentModel();
            this.buffered = (0, _utilsCustomTimeRanges2['default'])(context).create();
            fragmentedTracks = mediaController.getTracksFor(_constantsConstants2['default'].FRAGMENTED_TEXT, streamController.getActiveStreamInfo());
            var currFragTrack = mediaController.getCurrentTrackFor(_constantsConstants2['default'].FRAGMENTED_TEXT, streamController.getActiveStreamInfo());
            for (var i = 0; i < fragmentedTracks.length; i++) {
                if (fragmentedTracks[i] === currFragTrack) {
                    currFragmentedTrackIdx = i;
                    break;
                }
            }
        }
    }

    function abort() {
        textTracks.deleteAllTextTracks();
        parser = null;
        fragmentedTextBoxParser = null;
        mediaInfos = null;
        textTracks = null;
        isFragmented = false;
        fragmentModel = null;
        initializationSegmentReceived = false;
        timescale = NaN;
        fragmentedTracks = [];
        videoModel = null;
        streamController = null;
        embeddedInitialized = false;
        embeddedTracks = null;
    }

    function onVideoChunkReceived(e) {
        var chunk = e.chunk;

        if (chunk.mediaInfo.embeddedCaptions) {
            append(chunk.bytes, chunk);
        }
    }

    function initEmbedded() {
        embeddedTracks = [];
        mediaInfos = [];
        // videoModel = VideoModel(context).getInstance();
        textTracks = (0, _TextTracks2['default'])(context).getInstance();
        textTracks.setConfig({
            videoModel: videoModel
        });
        textTracks.initialize();
        boxParser = (0, _utilsBoxParser2['default'])(context).getInstance();
        fragmentedTextBoxParser = (0, _dashUtilsFragmentedTextBoxParser2['default'])(context).getInstance();
        fragmentedTextBoxParser.setConfig({
            boxParser: boxParser
        });
        isFragmented = false;
        currFragmentedTrackIdx = null;
        embeddedInitializationSegmentReceived = false;
        embeddedTimescale = 0;
        embeddedCea608FieldParsers = [];
        embeddedSequenceNumbers = [];
        embeddedLastSequenceNumber = null;
        embeddedInitialized = true;
        embeddedTextHtmlRender = (0, _EmbeddedTextHtmlRender2['default'])(context).getInstance();

        eventBus.on(_coreEventsEvents2['default'].VIDEO_CHUNK_RECEIVED, onVideoChunkReceived, this);
    }

    function resetEmbedded() {
        eventBus.off(_coreEventsEvents2['default'].VIDEO_CHUNK_RECEIVED, onVideoChunkReceived, this);
        if (textTracks) {
            textTracks.deleteAllTextTracks();
        }
        embeddedInitialized = false;
        embeddedTracks = [];
        embeddedCea608FieldParsers = [null, null];
        embeddedSequenceNumbers = [];
        embeddedLastSequenceNumber = null;
    }

    function addEmbeddedTrack(mediaInfo) {
        if (!embeddedInitialized) {
            initEmbedded();
        }
        if (mediaInfo.id === _constantsConstants2['default'].CC1 || mediaInfo.id === _constantsConstants2['default'].CC3) {
            embeddedTracks.push(mediaInfo);
        } else {
            log('Warning: Embedded track ' + mediaInfo.id + ' not supported!');
        }
    }

    function setConfig(config) {
        if (!config) {
            return;
        }
        if (config.errHandler) {
            errHandler = config.errHandler;
        }
        if (config.dashManifestModel) {
            dashManifestModel = config.dashManifestModel;
        }
        if (config.manifestModel) {
            manifestModel = config.manifestModel;
        }
        if (config.mediaController) {
            mediaController = config.mediaController;
        }
        if (config.videoModel) {
            videoModel = config.videoModel;
        }
        if (config.streamController) {
            streamController = config.streamController;
        }
        if (config.textTracks) {
            textTracks = config.textTracks;
        }
        if (config.vttParser) {
            vttParser = config.vttParser;
        }
        if (config.ttmlParser) {
            ttmlParser = config.ttmlParser;
        }
    }

    function getConfig() {
        var config = {
            errHandler: errHandler,
            dashManifestModel: dashManifestModel,
            mediaController: mediaController,
            videoModel: videoModel,
            fragmentModel: fragmentModel,
            streamController: streamController,
            textTracks: textTracks,
            isFragmented: isFragmented,
            embeddedTracks: embeddedTracks,
            fragmentedTracks: fragmentedTracks
        };

        return config;
    }

    function setCurrentFragmentedTrackIdx(idx) {
        currFragmentedTrackIdx = idx;
    }

    function append(bytes, chunk) {
        var result = undefined,
            sampleList = undefined,
            i = undefined,
            j = undefined,
            k = undefined,
            samplesInfo = undefined,
            ccContent = undefined;
        var mediaInfo = chunk.mediaInfo;
        var mediaType = mediaInfo.type;
        var mimeType = mediaInfo.mimeType;
        var codecType = mediaInfo.codec || mimeType;
        if (!codecType) {
            log('No text type defined');
            return;
        }

        function createTextTrackFromMediaInfo(captionData, mediaInfo) {
            var textTrackInfo = new _voTextTrackInfo2['default']();
            var trackKindMap = { subtitle: 'subtitles', caption: 'captions' }; //Dash Spec has no "s" on end of KIND but HTML needs plural.
            var getKind = function getKind() {
                var kind = mediaInfo.roles.length > 0 ? trackKindMap[mediaInfo.roles[0]] : trackKindMap.caption;
                kind = kind === trackKindMap.caption || kind === trackKindMap.subtitle ? kind : trackKindMap.caption;
                return kind;
            };

            var checkTTML = function checkTTML() {
                var ttml = false;
                if (mediaInfo.codec && mediaInfo.codec.search(_constantsConstants2['default'].STPP) >= 0) {
                    ttml = true;
                }
                if (mediaInfo.mimeType && mediaInfo.mimeType.search(_constantsConstants2['default'].TTML) >= 0) {
                    ttml = true;
                }
                return ttml;
            };

            textTrackInfo.captionData = captionData;
            textTrackInfo.lang = mediaInfo.lang;
            textTrackInfo.label = mediaInfo.id; // AdaptationSet id (an unsigned int)
            textTrackInfo.index = mediaInfo.index; // AdaptationSet index in manifest
            textTrackInfo.isTTML = checkTTML();
            textTrackInfo.video = videoModel.getElement();
            textTrackInfo.defaultTrack = getIsDefault(mediaInfo);
            textTrackInfo.isFragmented = isFragmented;
            textTrackInfo.isEmbedded = mediaInfo.isEmbedded ? true : false;
            textTrackInfo.kind = getKind();
            textTrackInfo.roles = mediaInfo.roles;
            var totalNrTracks = (mediaInfos ? mediaInfos.length : 0) + embeddedTracks.length;
            textTracks.addTextTrack(textTrackInfo, totalNrTracks);
        }

        if (mediaType === _constantsConstants2['default'].FRAGMENTED_TEXT) {
            if (!initializationSegmentReceived) {
                initializationSegmentReceived = true;
                for (i = 0; i < mediaInfos.length; i++) {
                    createTextTrackFromMediaInfo(null, mediaInfos[i]);
                }
                timescale = fragmentedTextBoxParser.getMediaTimescaleFromMoov(bytes);
            } else {
                samplesInfo = fragmentedTextBoxParser.getSamplesInfo(bytes);
                sampleList = samplesInfo.sampleList;
                if (!firstSubtitleStart && sampleList.length > 0) {
                    firstSubtitleStart = sampleList[0].cts - chunk.start * timescale;
                }
                if (codecType.search(_constantsConstants2['default'].STPP) >= 0) {
                    parser = parser !== null ? parser : getParser(codecType);
                    for (i = 0; i < sampleList.length; i++) {
                        var sample = sampleList[i];
                        var sampleStart = sample.cts;
                        var sampleRelStart = sampleStart - firstSubtitleStart;
                        this.buffered.add(sampleRelStart / timescale, (sampleRelStart + sample.duration) / timescale);
                        var dataView = new DataView(bytes, sample.offset, sample.subSizes[0]);
                        ccContent = _codemIsoboxer2['default'].Utils.dataViewToString(dataView, _constantsConstants2['default'].UTF8);
                        var images = [];
                        var subOffset = sample.offset + sample.subSizes[0];
                        for (j = 1; j < sample.subSizes.length; j++) {
                            var inData = new Uint8Array(bytes, subOffset, sample.subSizes[j]);
                            var raw = String.fromCharCode.apply(null, inData);
                            images.push(raw);
                            subOffset += sample.subSizes[j];
                        }
                        try {
                            // Only used for Miscrosoft Smooth Streaming support - caption time is relative to sample time. In this case, we apply an offset.
                            var manifest = manifestModel.getValue();
                            var offsetTime = manifest.ttmlTimeIsRelative ? sampleStart / timescale : 0;
                            result = parser.parse(ccContent, offsetTime, sampleStart / timescale, (sampleStart + sample.duration) / timescale, images);
                            textTracks.addCaptions(currFragmentedTrackIdx, firstSubtitleStart / timescale, result);
                        } catch (e) {
                            log('TTML parser error: ' + e.message);
                        }
                    }
                } else {
                    // WebVTT case
                    var captionArray = [];
                    for (i = 0; i < sampleList.length; i++) {
                        var sample = sampleList[i];
                        sample.cts -= firstSubtitleStart;
                        this.buffered.add(sample.cts / timescale, (sample.cts + sample.duration) / timescale);
                        var sampleData = bytes.slice(sample.offset, sample.offset + sample.size);
                        // There are boxes inside the sampleData, so we need a ISOBoxer to get at it.
                        var sampleBoxes = _codemIsoboxer2['default'].parseBuffer(sampleData);

                        for (j = 0; j < sampleBoxes.boxes.length; j++) {
                            var box1 = sampleBoxes.boxes[j];
                            log('VTT box1: ' + box1.type);
                            if (box1.type === 'vtte') {
                                continue; //Empty box
                            }
                            if (box1.type === 'vttc') {
                                log('VTT vttc boxes.length = ' + box1.boxes.length);
                                for (k = 0; k < box1.boxes.length; k++) {
                                    var box2 = box1.boxes[k];
                                    log('VTT box2: ' + box2.type);
                                    if (box2.type === 'payl') {
                                        var cue_text = box2.cue_text;
                                        log('VTT cue_text = ' + cue_text);
                                        var start_time = sample.cts / timescale;
                                        var end_time = (sample.cts + sample.duration) / timescale;
                                        captionArray.push({
                                            start: start_time,
                                            end: end_time,
                                            data: cue_text,
                                            styles: {}
                                        });
                                        log('VTT ' + start_time + '-' + end_time + ' : ' + cue_text);
                                    }
                                }
                            }
                        }
                    }
                    if (captionArray.length > 0) {
                        textTracks.addCaptions(currFragmentedTrackIdx, 0, captionArray);
                    }
                }
            }
        } else if (mediaType === _constantsConstants2['default'].TEXT) {
            var dataView = new DataView(bytes, 0, bytes.byteLength);
            ccContent = _codemIsoboxer2['default'].Utils.dataViewToString(dataView, _constantsConstants2['default'].UTF8);

            try {
                result = getParser(codecType).parse(ccContent, 0);
                createTextTrackFromMediaInfo(result, mediaInfo);
            } catch (e) {
                errHandler.timedTextError(e, 'parse', ccContent);
            }
        } else if (mediaType === _constantsConstants2['default'].VIDEO) {
            //embedded text
            if (chunk.segmentType === _voMetricsHTTPRequest.HTTPRequest.INIT_SEGMENT_TYPE) {
                if (embeddedTimescale === 0) {
                    embeddedTimescale = fragmentedTextBoxParser.getMediaTimescaleFromMoov(bytes);
                    for (i = 0; i < embeddedTracks.length; i++) {
                        createTextTrackFromMediaInfo(null, embeddedTracks[i]);
                    }
                }
            } else {
                // MediaSegment
                if (embeddedTimescale === 0) {
                    log('CEA-608: No timescale for embeddedTextTrack yet');
                    return;
                }
                var makeCueAdderForIndex = function makeCueAdderForIndex(self, trackIndex) {
                    function newCue(startTime, endTime, captionScreen) {
                        var captionsArray = null;
                        if (videoModel.getTTMLRenderingDiv()) {
                            captionsArray = embeddedTextHtmlRender.createHTMLCaptionsFromScreen(videoModel.getElement(), startTime, endTime, captionScreen);
                        } else {
                            var text = captionScreen.getDisplayText();
                            //log("CEA text: " + startTime + "-" + endTime + "  '" + text + "'");
                            captionsArray = [{
                                start: startTime,
                                end: endTime,
                                data: text,
                                styles: {}
                            }];
                        }
                        if (captionsArray) {
                            textTracks.addCaptions(trackIndex, 0, captionsArray);
                        }
                    }
                    return newCue;
                };

                samplesInfo = fragmentedTextBoxParser.getSamplesInfo(bytes);

                var sequenceNumber = samplesInfo.lastSequenceNumber;

                if (!embeddedCea608FieldParsers[0] && !embeddedCea608FieldParsers[1]) {
                    // Time to setup the CEA-608 parsing
                    var field = undefined,
                        handler = undefined,
                        trackIdx = undefined;
                    for (i = 0; i < embeddedTracks.length; i++) {
                        if (embeddedTracks[i].id === _constantsConstants2['default'].CC1) {
                            field = 0;
                            trackIdx = textTracks.getTrackIdxForId(_constantsConstants2['default'].CC1);
                        } else if (embeddedTracks[i].id === _constantsConstants2['default'].CC3) {
                            field = 1;
                            trackIdx = textTracks.getTrackIdxForId(_constantsConstants2['default'].CC3);
                        }
                        if (trackIdx === -1) {
                            log('CEA-608: data before track is ready.');
                            return;
                        }
                        handler = makeCueAdderForIndex(this, trackIdx);
                        embeddedCea608FieldParsers[i] = new _externalsCea608Parser2['default'].Cea608Parser(i, {
                            'newCue': handler
                        }, null);
                    }
                }

                if (embeddedTimescale && embeddedSequenceNumbers.indexOf(sequenceNumber) == -1) {
                    if (embeddedLastSequenceNumber !== null && sequenceNumber !== embeddedLastSequenceNumber + samplesInfo.numSequences) {
                        for (i = 0; i < embeddedCea608FieldParsers.length; i++) {
                            if (embeddedCea608FieldParsers[i]) {
                                embeddedCea608FieldParsers[i].reset();
                            }
                        }
                    }

                    var allCcData = extractCea608Data(bytes, samplesInfo.sampleList);

                    for (var fieldNr = 0; fieldNr < embeddedCea608FieldParsers.length; fieldNr++) {
                        var ccData = allCcData.fields[fieldNr];
                        var fieldParser = embeddedCea608FieldParsers[fieldNr];
                        if (fieldParser) {
                            /*if (ccData.length > 0 ) {
                                log("CEA-608 adding Data to field " + fieldNr + " " + ccData.length + "bytes");
                            }*/
                            for (i = 0; i < ccData.length; i++) {
                                fieldParser.addData(ccData[i][0] / embeddedTimescale, ccData[i][1]);
                            }
                        }
                    }
                    embeddedLastSequenceNumber = sequenceNumber;
                    embeddedSequenceNumbers.push(sequenceNumber);
                }
            }
        }
    }
    /**
     * Extract CEA-608 data from a buffer of data.
     * @param {ArrayBuffer} data
     * @param {Array} samples cue information
     * @returns {Object|null} ccData corresponding to one segment.
     */
    function extractCea608Data(data, samples) {

        if (samples.length === 0) {
            return null;
        }

        var allCcData = {
            splits: [],
            fields: [[], []]
        };
        var raw = new DataView(data);
        for (var i = 0; i < samples.length; i++) {
            var sample = samples[i];
            var cea608Ranges = _externalsCea608Parser2['default'].findCea608Nalus(raw, sample.offset, sample.size);
            var lastSampleTime = null;
            var idx = 0;
            for (var j = 0; j < cea608Ranges.length; j++) {
                var ccData = _externalsCea608Parser2['default'].extractCea608DataFromRange(raw, cea608Ranges[j]);
                for (var k = 0; k < 2; k++) {
                    if (ccData[k].length > 0) {
                        if (sample.cts !== lastSampleTime) {
                            idx = 0;
                        } else {
                            idx += 1;
                        }
                        allCcData.fields[k].push([sample.cts, ccData[k], idx]);
                        lastSampleTime = sample.cts;
                    }
                }
            }
        }

        // Sort by sampleTime ascending order
        // If two packets have the same sampleTime, use them in the order
        // they were received
        allCcData.fields.forEach(function sortField(field) {
            field.sort(function (a, b) {
                if (a[0] === b[0]) {
                    return a[2] - b[2];
                }
                return a[0] - b[0];
            });
        });

        return allCcData;
    }

    function getIsDefault(mediaInfo) {
        //TODO How to tag default. currently same order as listed in manifest.
        // Is there a way to mark a text adaptation set as the default one? DASHIF meeting talk about using role which is being used for track KIND
        // Eg subtitles etc. You can have multiple role tags per adaptation Not defined in the spec yet.
        var isDefault = false;
        if (embeddedTracks.length > 1 && mediaInfo.isEmbedded) {
            isDefault = mediaInfo.id && mediaInfo.id === _constantsConstants2['default'].CC1; // CC1 if both CC1 and CC3 exist
        } else if (embeddedTracks.length === 1) {
                if (mediaInfo.id && mediaInfo.id.substring(0, 2) === 'CC') {
                    // Either CC1 or CC3
                    isDefault = true;
                }
            } else if (embeddedTracks.length === 0) {
                isDefault = mediaInfo.index === mediaInfos[0].index;
            }
        return isDefault;
    }

    function getParser(codecType) {
        var parser = undefined;
        if (codecType.search(_constantsConstants2['default'].VTT) >= 0) {
            parser = vttParser;
        } else if (codecType.search(_constantsConstants2['default'].TTML) >= 0 || codecType.search(_constantsConstants2['default'].STPP) >= 0) {
            parser = ttmlParser;
        }
        return parser;
    }

    instance = {
        initialize: initialize,
        append: append,
        abort: abort,
        addEmbeddedTrack: addEmbeddedTrack,
        resetEmbedded: resetEmbedded,
        setConfig: setConfig,
        getConfig: getConfig,
        setCurrentFragmentedTrackIdx: setCurrentFragmentedTrackIdx
    };

    return instance;
}

TextSourceBuffer.__dashjs_factory_name = 'TextSourceBuffer';
exports['default'] = _coreFactoryMaker2['default'].getSingletonFactory(TextSourceBuffer);
module.exports = exports['default'];
//# sourceMappingURL=TextSourceBuffer.js.map
